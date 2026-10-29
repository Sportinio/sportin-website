// 12 Revenue: while the page is on screen, a token runs the track from Plays to Pays, lighting each
// step as it reaches it; the ticket gets its stamp, holds, then the run starts again. With reduced
// motion every step shows lit and nothing moves.
(() => {
  const sec = document.getElementById('pay');
  if (!sec) return;
  const steps = [...sec.querySelectorAll('.pay__step')]; const track = sec.querySelector('.pay__track');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) { sec.classList.add('is-seen'); steps.forEach((s) => s.classList.add('is-on')); return; }
  const RUN = 3600; const HOLD = 1800; // ms along the track, then the pause on the stamped ticket
  let raf = 0; let t0 = 0;
  const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
  function frame(now) {
    if (!t0) t0 = now;
    const e = now - t0;
    if (e > RUN + HOLD) { t0 = now; steps.forEach((s) => s.classList.remove('is-on')); }
    const u = Math.min(1, (now - t0) / RUN); const t = ease(u);
    track.style.setProperty('--t', t.toFixed(4));
    steps.forEach((s, k) => { if (t >= k / (steps.length - 1) - 0.001) s.classList.add('is-on'); });
    raf = requestAnimationFrame(frame);
  }
  // One loop at a time: a start is pending or running until the page leaves the screen.
  let on = false; let wait = 0;
  new IntersectionObserver(([en]) => {
    if (en.isIntersecting) {
      sec.classList.add('is-seen');
      if (!on) { on = true; t0 = 0; wait = setTimeout(() => { raf = requestAnimationFrame(frame); }, 150); }
    } else if (on) {
      on = false; clearTimeout(wait); cancelAnimationFrame(raf); raf = 0; steps.forEach((s) => s.classList.remove('is-on'));
    }
  }, { threshold: 0.2 }).observe(sec);
})();
