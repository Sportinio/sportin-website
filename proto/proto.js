// Hero options: scroll reveal plus each option's one signature motion.
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      e.target.dispatchEvent(new CustomEvent('reveal'));
      io.unobserve(e.target);
    }
  }, { threshold: 0.15 });
  document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));

  // A: the challenge card fills its bars and counts the kilometres.
  const card = document.getElementById('haCard');
  if (card) {
    const run = () => {
      card.querySelectorAll('.ha__fill').forEach((f) => { f.style.width = getComputedStyle(f).getPropertyValue('--w'); });
      card.querySelectorAll('[data-km]').forEach((el) => {
        const to = Number(el.dataset.km);
        if (reduced) { el.textContent = `${to} km`; return; }
        const t0 = performance.now();
        const step = (now) => {
          const p = clamp((now - t0) / 1600, 0, 1);
          el.textContent = `${Math.round(to * (1 - Math.pow(1 - p, 3)))} km`;
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    };
    setTimeout(run, 500);
  }

  // B: the strip of moments drifts sideways as you scroll.
  const strip = document.getElementById('hbStrip');
  // C: the product stage opens to the full width as you scroll.
  const stage = document.getElementById('hcStage');

  function onScroll() {
    if (reduced) return;
    const y = window.scrollY;
    if (strip) strip.style.transform = `translateX(${-y * 0.25}px)`;
    if (stage) {
      const t = clamp(y / 380, 0, 1);
      const max = document.documentElement.clientWidth;
      const start = Math.min(1144, max - 96);
      stage.style.setProperty('--stage-w', `${start + (max - start) * t}px`);
      stage.style.setProperty('--stage-r', `${32 * (1 - t)}px`);
      stage.style.setProperty('--rise', `${-40 * t}px`);
    }
  }
  window.addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });
  onScroll();

  if (reduced) document.querySelectorAll('video').forEach((v) => { v.removeAttribute('autoplay'); v.pause(); });
})();
