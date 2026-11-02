// Option A: an example task board that works through itself, then starts over.
// The tasks and minutes are illustrations, not client data. Edit the list freely.
(() => {
  const tasks = [
    { text: 'Answer a pricing question from the website', mins: 6 },
    { text: 'Enter invoice #4821 into the books', mins: 9 },
    { text: 'Sort 14 new customer requests', mins: 15 },
    { text: 'Remind 8 clients about tomorrow’s visits', mins: 12 },
    { text: 'Draft Friday’s status report', mins: 20 },
    { text: 'Flag the order that looks wrong', mins: 5 }
  ];

  const todo = document.getElementById('todo');
  const done = document.getElementById('done');
  const countEl = document.getElementById('count');
  const minsEl = document.getElementById('mins');
  if (!todo || !done) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const li = (task, cls) => {
    const item = document.createElement('li');
    item.className = 'task' + (cls ? ' ' + cls : '');
    item.textContent = task.text;
    return item;
  };

  const format = (mins) => (mins >= 60 ? `${Math.floor(mins / 60)} hr ${mins % 60} min` : `${mins} min`);

  // Count up smoothly instead of jumping.
  let shownMins = 0;
  let tweenId = 0; // bumped on every new tween and reset, so a stale one can't overwrite the display
  const tweenMins = (to) => {
    const from = shownMins;
    const start = Date.now();
    const mine = ++tweenId;
    // A plain timer (not requestAnimationFrame) so it keeps working in paused or backgrounded panes.
    const timer = setInterval(() => {
      if (mine !== tweenId) {
        clearInterval(timer);
        return;
      }
      const t = Math.min(1, (Date.now() - start) / 600);
      shownMins = Math.round(from + (to - from) * t);
      minsEl.textContent = format(shownMins);
      if (t >= 1) clearInterval(timer);
    }, 40);
  };

  const reset = () => {
    tweenId += 1;
    todo.replaceChildren(...tasks.map((task) => li(task)));
    done.replaceChildren();
    countEl.textContent = '0';
    shownMins = 0;
    minsEl.textContent = '0 min';
  };

  const showFinished = () => {
    todo.replaceChildren();
    done.replaceChildren(...tasks.map((task) => li(task, 'done')));
    countEl.textContent = String(tasks.length);
    minsEl.textContent = format(tasks.reduce((sum, task) => sum + task.mins, 0));
  };

  async function run() {
    for (;;) {
      reset();
      await wait(1100);
      let handled = 0;
      let mins = 0;
      for (const task of tasks) {
        const item = todo.firstElementChild;
        item.classList.add('working');
        await wait(750);
        item.remove();
        done.appendChild(li(task, 'done'));
        handled += 1;
        mins += task.mins;
        countEl.textContent = String(handled);
        tweenMins(mins);
        await wait(550);
      }
      await wait(3200);
      for (const item of done.children) item.classList.add('leaving');
      await wait(500);
    }
  }

  if (reduced) showFinished();
  else run();
})();
