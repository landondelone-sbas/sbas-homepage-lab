// Switcher bar for flipping between the baseline and the three options.
// Add ?clean to any page's address to hide it (handy for screenshots and demos).
(() => {
  if (new URLSearchParams(location.search).has('clean')) return;

  const pages = [
    ['Baseline', 'baseline.html'],
    ['Option A', 'option-a.html'],
    ['Option B', 'option-b.html'],
    ['Option C', 'option-c.html']
  ];
  const here = location.pathname.split('/').pop() || 'index.html';

  const bar = document.createElement('nav');
  bar.className = 'lab-bar';
  bar.setAttribute('aria-label', 'Homepage lab');
  bar.innerHTML =
    '<span class="lab-label">Test copy, not the live site</span>' +
    pages
      .map(([name, href]) => `<a href="${href}"${href === here ? ' aria-current="page"' : ''}>${name}</a>`)
      .join('') +
    `<a href="index.html"${here === 'index.html' ? ' aria-current="page"' : ''}>Menu</a>`;
  document.body.appendChild(bar);

  // Keys 1 to 4 jump between pages.
  addEventListener('keydown', (event) => {
    if (event.target.closest && event.target.closest('input, textarea, select')) return;
    const n = Number(event.key);
    if (n >= 1 && n <= pages.length) location.href = pages[n - 1][1];
  });
})();
