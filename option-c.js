// Option C: a voice orb that swells and ripples like a voice while Sebastian's opening
// lines appear one at a time. No audio plays. Edit `lines` to change what he "says".
(() => {
  const stage = document.querySelector('.lab-c');
  const canvas = document.getElementById('orb');
  const lineEl = document.getElementById('orbLine');
  if (!stage || !canvas || !lineEl) return;

  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const lines = [
    "Hi, I'm Sebastian.",
    'What are you trying to solve?',
    "Let's get your discovery call set up."
  ];

  let W = 0;
  let H = 0;
  let time = 0;
  let amp = 0.14;
  let speaking = false;
  let running = false;
  let frameId = 0;
  const ripples = [];
  const lean = { x: 0, y: 0, tx: 0, ty: 0 };

  function sizeCanvas() {
    const box = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = box.width;
    H = box.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function step() {
    time += 1 / 60;
    // While "speaking" the level jumps around like syllables; otherwise it breathes.
    const target = speaking
      ? 0.4 + 0.6 * Math.abs(Math.sin(time * 7.3) * Math.sin(time * 2.3 + 1))
      : 0.14 + 0.05 * Math.sin(time * 1.5);
    amp += (target - amp) * 0.12;

    if (speaking && amp > 0.62 && Math.random() < 0.08) ripples.push({ r: 1, alpha: 0.5 });
    for (let i = ripples.length - 1; i >= 0; i -= 1) {
      ripples[i].r += 0.0065;
      ripples[i].alpha -= 0.007;
      if (ripples[i].alpha <= 0) ripples.splice(i, 1);
    }

    lean.x += (lean.tx - lean.x) * 0.06;
    lean.y += (lean.ty - lean.y) * 0.06;
  }

  function blob(cx, cy, radius, k) {
    const points = 120;
    ctx.beginPath();
    for (let i = 0; i <= points; i += 1) {
      const a = (i / points) * Math.PI * 2;
      const wobble =
        0.1 * Math.sin(a * 3 + time * (1.1 + k * 0.3) + k) +
        0.07 * Math.sin(a * 5 - time * (0.9 + k * 0.2)) +
        0.04 * Math.sin(a * 8 + time * 1.7);
      const r = radius * (1 + k * 0.1) * (1 + amp * wobble) * (1 + 0.02 * Math.sin(time * 1.3));
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2 + lean.x;
    const cy = H * 0.36 + lean.y;
    const R = Math.min(W, H * 1.05) * 0.2;

    ctx.globalCompositeOperation = 'lighter';

    // Ambient glow that grows with the voice.
    const glow = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * (2.4 + amp));
    glow.addColorStop(0, `rgba(242, 194, 122, ${0.18 + amp * 0.18})`);
    glow.addColorStop(1, 'rgba(242, 194, 122, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Ripples travelling outward.
    for (const ripple of ripples) {
      ctx.beginPath();
      ctx.arc(cx, cy, R * (1 + ripple.r * 1.1), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(242, 194, 122, ${Math.max(0, ripple.alpha) * 0.7})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Three overlapping layers make the body of the orb.
    for (let k = 0; k < 3; k += 1) {
      const radius = R * (1 + k * 0.04);
      blob(cx, cy, radius, k);
      const grad = ctx.createRadialGradient(cx - R * 0.15, cy - R * 0.2, R * 0.05, cx, cy, radius * 1.2);
      const strength = [0.78, 0.45, 0.28][k];
      grad.addColorStop(0, `rgba(255, 238, 208, ${strength})`);
      grad.addColorStop(0.45, `rgba(242, 194, 122, ${strength * 0.7})`);
      grad.addColorStop(1, 'rgba(191, 126, 52, 0)');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 226, 170, ${0.5 - k * 0.14})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  function frame() {
    step();
    draw();
    frameId = requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduced) return;
    running = true;
    frameId = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(frameId);
  }

  // The orb leans gently toward the pointer, and a tap or click sends out a ripple.
  stage.addEventListener('pointermove', (event) => {
    const box = stage.getBoundingClientRect();
    lean.tx = ((event.clientX - box.left) / box.width - 0.5) * 26;
    lean.ty = ((event.clientY - box.top) / box.height - 0.5) * 18;
  });
  stage.addEventListener('pointerleave', () => {
    lean.tx = 0;
    lean.ty = 0;
  });
  stage.addEventListener('pointerdown', () => ripples.push({ r: 1, alpha: 0.6 }));

  async function speak() {
    let index = 0;
    for (;;) {
      const text = lines[index % lines.length];
      lineEl.classList.remove('fading');
      lineEl.textContent = '';
      speaking = true;
      for (let i = 1; i <= text.length; i += 1) {
        lineEl.textContent = text.slice(0, i);
        await wait(44);
      }
      speaking = false;
      await wait(1900);
      lineEl.classList.add('fading');
      await wait(450);
      index += 1;
    }
  }

  new ResizeObserver(() => {
    sizeCanvas();
    if (reduced) draw();
  }).observe(stage);

  new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) start();
    else stop();
  }).observe(stage);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  // Hook for testing: advance the animation without waiting on the browser's frame timer.
  window.__lab = {
    step(frames = 1) {
      for (let i = 0; i < frames; i += 1) step();
      draw();
    },
    setSpeaking(value) {
      speaking = Boolean(value);
    }
  };

  sizeCanvas();
  if (reduced) {
    lineEl.textContent = lines[0];
    draw();
  } else {
    start();
    speak();
  }
})();
