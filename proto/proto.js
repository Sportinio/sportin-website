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

// D: film wall, see-through nav and today's kilometres.
(() => {
  const hero = document.getElementById('hd');
  if (!hero) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nav = document.getElementById('nav');
  const cells = [...hero.querySelectorAll('.hd__cell video')];

  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-solid', y > hero.offsetHeight - 80);
    if (reduced) return;
    // Columns drift at slightly different speeds, so the wall feels alive.
    cells.forEach((v, i) => v.style.setProperty('--drift', `${y * (i % 2 ? 0.06 : -0.04)}px`));
  };
  window.addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });
  onScroll();

  // Today's kilometres. Real numbers only come from SportIn: set window.SPORTIN_KM_SOURCE to an
  // endpoint returning {"kmToday": number, "kmPerHour": number}. Without one the page shows a demo
  // figure and says so.
  const out = document.getElementById('kmToday');
  const demoTag = document.getElementById('kmDemo');
  const fmt = (n) => Math.floor(n).toLocaleString('en-US');
  let km = 0;
  let perSecond = 0;

  const start = (kmToday, kmPerHour, isDemo) => {
    demoTag.hidden = !isDemo;
    perSecond = kmPerHour / 3600;
    const t0 = performance.now();
    const from = 0;
    const intro = (now) => {
      const p = Math.min(1, (now - t0) / 1800);
      km = from + (kmToday - from) * (1 - Math.pow(1 - p, 3));
      out.textContent = fmt(km);
      if (p < 1 && !reduced) requestAnimationFrame(intro);
      else { km = kmToday; out.textContent = fmt(km); tick(); }
    };
    requestAnimationFrame(intro);
  };
  const tick = () => setInterval(() => { km += perSecond; out.textContent = fmt(km); }, 1000);

  const demo = () => {
    // Demo pace: 18,000 km a day, spread over the hours so far.
    const d = new Date();
    const dayShare = (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400;
    start(18000 * dayShare, 18000 / 24, true);
  };

  const source = window.SPORTIN_KM_SOURCE;
  if (!source) { demo(); return; }
  fetch(source, { headers: { Accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((d) => (Number.isFinite(d.kmToday) ? start(d.kmToday, Number(d.kmPerHour) || 0, false) : demo()))
    .catch(demo);
})();
