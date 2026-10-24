// Problem, scroll-driven: the first grid fills with members when the block arrives. Then the block
// holds still for three scroll steps; at each step the members who go one stage further hop from
// their cell to the same cell in the next grid, leaving their earlier stage lit behind them.
(() => {
  const pin = document.getElementById('problemPin');
  const fig = document.getElementById('problem');
  if (!pin || !fig || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const stepsEl = fig.querySelector('.problem__steps');
  const steps = [...fig.querySelectorAll('.problem__step')];
  const shares = steps.map((s) => Number(s.dataset.share));
  const root = document.documentElement;
  const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
  const clamp = (v) => Math.max(0, Math.min(1, v));

  let canvas; let ctx; let W = 0; let H = 0; let cells = []; let N = 0; let blue = '#0751fb';
  let seg = 600; let revealAt = 0; let raf = 0;

  function measure() {
    const h = fig.offsetHeight;
    fig.style.top = `${Math.min(12, window.innerHeight - h - 12)}px`;
    seg = Math.max(360, window.innerHeight * 0.7);
    pin.style.height = `${h + seg * 3 + (window.problemExtra ? window.problemExtra() : 0)}px`;
    // The block may sit inside a scaled container (deck mode): work in unscaled CSS pixels.
    const r = canvas.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.offsetWidth; H = canvas.offsetHeight;
    const k = r.width / W || 1;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cells = steps.map((s) => [...s.querySelectorAll('.dot')].map((d) => {
      const b = d.getBoundingClientRect();
      return { x: (b.left - r.left + b.width / 2) / k, y: (b.top - r.top + b.height / 2) / k, r: b.width / 2 / k };
    }));
    N = cells[0].length;
    blue = getComputedStyle(root).getPropertyValue('--blue').trim();
  }

  // Each dot in grid k is lit when its member reached stage k (site.js marks them with .is-on).
  let reached = [];
  function readStages() { reached = steps.map((s) => [...s.querySelectorAll('.dot')].map((d) => d.classList.contains('is-on'))); }

  function progress() {
    if (typeof window.problemStep === 'number') return window.problemStep; // set by the deck mockup
    const top = parseFloat(fig.style.top) || 0;
    return Math.max(0, Math.min(3, (top - pin.getBoundingClientRect().top) / seg));
  }

  function draw() {
    raf = 0;
    const now = performance.now();
    const t = progress();
    const current = Math.min(3, Math.floor(t + 0.35));
    steps.forEach((s, k) => s.classList.toggle('is-current', k === current));
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = blue;
    const reveal = revealAt ? clamp((now - revealAt) / 900) : 0;
    for (let i = 0; i < N; i++) {
      // Stage 1: every reachable member appears in a wave across the grid.
      const col = i % 12;
      const a = clamp(reveal * 1.6 - (col / 12) * 0.6);
      if (a > 0) { const c = cells[0][i]; ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(c.x, c.y, c.r * (0.6 + 0.4 * a), 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
      // Stages 2-4: members who go further hop to the same cell in the next grid, in a left-to-right wave.
      for (let k = 1; k < 4; k++) {
        if (!reached[k][i]) continue;
        const u = clamp(((t - (k - 1)) - (col / 12) * 0.35) / 0.65);
        if (u <= 0) continue;
        const e = ease(u); const from = cells[k - 1][i]; const to = cells[k][i];
        const x = from.x + (to.x - from.x) * e;
        const y = from.y + (to.y - from.y) * e - Math.sin(Math.PI * e) * 18;
        ctx.beginPath(); ctx.arc(x, y, from.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (reveal < 1) raf = requestAnimationFrame(draw);
  }
  const schedule = () => { if (!raf) raf = requestAnimationFrame(draw); };
  window.problemRedraw = schedule;
  window.problemMeasure = () => { if (canvas) { measure(); schedule(); } };

  function start() {
    readStages();
    canvas = document.createElement('canvas'); canvas.className = 'problem__canvas'; canvas.setAttribute('aria-hidden', 'true');
    stepsEl.appendChild(canvas); ctx = canvas.getContext('2d');
    fig.classList.add('is-scrub');
    measure(); draw();
    new IntersectionObserver((e) => { if (e[0].isIntersecting && !revealAt) { revealAt = performance.now(); schedule(); } }, { threshold: 0.4 }).observe(fig);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', () => { measure(); schedule(); });
    new MutationObserver(() => { blue = getComputedStyle(root).getPropertyValue('--blue').trim(); schedule(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { blue = getComputedStyle(root).getPropertyValue('--blue').trim(); schedule(); });
  }

  // site.js builds the grids on load; wait for them.
  const wait = () => (fig.querySelector('.dot') ? start() : requestAnimationFrame(wait));
  wait();
})();
