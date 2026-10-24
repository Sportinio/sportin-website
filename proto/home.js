// The homepage's own page script, in place of assets/site/site.js (which drives sections the
// homepage no longer has and throws without them): the year, scroll reveal, the mobile menu,
// the light/dark switch and the problem page's dot grids. Copied from site.js; menu links and
// their highlight live in deck-menu.js.
(() => {
  const $$ = (sel) => [...document.querySelectorAll(sel)];

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Elements with data-reveal get .is-in once they enter the viewport.
  const revealIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      e.target.dispatchEvent(new CustomEvent('reveal'));
      revealIO.unobserve(e.target);
    }
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  $$('[data-reveal]').forEach((el) => revealIO.observe(el));

  // Mobile menu, and the bar's scrolled state.
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('navToggle');
  if (nav && toggle) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    $$('.nav__link').forEach((a) => a.addEventListener('click', () => {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }));
  }
  if (nav) {
    const scrolled = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
    window.addEventListener('scroll', scrolled, { passive: true });
    scrolled();
  }
})();

// Light/dark switch. The device setting decides until the visitor chooses; the choice is
// remembered on this device only.
(() => {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : media.matches);
  const label = () => btn.setAttribute('aria-label', isDark() ? 'Switch to light mode' : 'Switch to dark mode');
  btn.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('sportin-theme', next); } catch (e) { /* storage blocked: choice lasts this visit */ }
    label();
  });
  media.addEventListener('change', label);
  label();
})();

// The problem: one shuffled order shared by all four grids, so each stage is a subset of the
// one before (everyone still active at stage 4 was active at stages 2 and 3).
(() => {
  const fig = document.getElementById('problem');
  if (!fig) return;
  const N = 108;
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const order = [...Array(N).keys()].map((i) => ({ i, r: rnd() })).sort((a, b) => a.r - b.r);
  const rank = new Array(N);
  order.forEach((o, k) => { rank[o.i] = k; });
  fig.querySelectorAll('.problem__step').forEach((step) => {
    const active = Math.round(N * Number(step.dataset.share));
    const grid = step.querySelector('.dots');
    if (!grid) return;
    for (let i = 0; i < N; i++) {
      const d = document.createElement('i');
      d.className = rank[i] < active ? 'dot is-on' : 'dot';
      d.style.setProperty('--k', `${((i % 12) * 0.012 + Math.floor(i / 12) * 0.02).toFixed(3)}s`);
      grid.appendChild(d);
    }
  });
})();
