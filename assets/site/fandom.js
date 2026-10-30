// Fandom theme effects. Page 01: camera flashes in the stands, over the hero footage.
// Draws only while the hero is on screen and the tab is visible; nothing with reduced motion.
(() => {
  const canvas = document.querySelector('.fx__flash');
  if (!canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = canvas.getContext('2d');
  const hero = canvas.closest('.hero');
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let w = 0, h = 0, raf = 0, last = 0;
  const flashes = [];
  const size = () => {
    const r = hero.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const spawn = () => {
    // The stands fill the top two thirds of the frame; flashes cluster there, fewer near the copy.
    const x = Math.random() * w;
    const y = Math.pow(Math.random(), 1.6) * h * 0.72;
    flashes.push({ x, y, r: 1.6 + Math.random() * 2.2, t: 0, life: 260 + Math.random() * 320 });
  };
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(64, now - (last || now)); last = now;
    ctx.clearRect(0, 0, w, h);
    if (flashes.length < 14 && Math.random() < dt / 95) spawn();
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i]; f.t += dt;
      const k = f.t / f.life; if (k >= 1) { flashes.splice(i, 1); continue; }
      const a = k < 0.18 ? k / 0.18 : 1 - (k - 0.18) / 0.82;
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 7);
      g.addColorStop(0, `rgba(255,255,255,${0.95 * a})`);
      g.addColorStop(0.18, `rgba(255,248,230,${0.55 * a})`);
      g.addColorStop(1, 'rgba(255,240,210,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 7, 0, Math.PI * 2); ctx.fill();
    }
  };
  const start = () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } };
  const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };
  size();
  new ResizeObserver(size).observe(hero);
  let seen = true;
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; seen && !document.hidden ? start() : stop(); }, { threshold: 0.05 }).observe(hero);
  document.addEventListener('visibilitychange', () => (document.hidden || !seen ? stop() : start()));
})();
