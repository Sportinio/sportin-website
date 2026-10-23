// The deck's page basics, taken from assets/site/site.js for the pages the deck keeps: the footer
// year, scroll reveal, the mobile nav, the nav link for the section in view, and the light/dark
// switch. site.js itself also drives sections the deck no longer has, so the deck loads this instead.
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const year = $('#year'); if (year) year.textContent = new Date().getFullYear();

  // Elements with data-reveal get .is-in once they enter the viewport.
  const revealIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      e.target.dispatchEvent(new CustomEvent('reveal'));
      revealIO.unobserve(e.target);
    }
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  // Page one is on screen at load: reveal it whole, or a line near its bottom edge waits for a scroll.
  $$('[data-reveal]').forEach((el) => (el.closest('#why') ? requestAnimationFrame(() => el.classList.add('is-in')) : revealIO.observe(el)));

  const nav = $('#nav'); const toggle = $('#navToggle');
  if (nav && toggle) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    $$('.nav__link').forEach((a) => a.addEventListener('click', () => { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }));
  }

  // Highlight the nav link for the section in view.
  const links = new Map($$('.nav__link').map((a) => [a.getAttribute('href').slice(1), a]));
  const spyIO = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) links.forEach((a, id) => a.classList.toggle('is-active', id === e.target.id));
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((a, id) => { const s = document.getElementById(id); if (s) spyIO.observe(s); });
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
