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

// E: one film, five windows. Each phone draws the part of the frame that sits behind it, so
// people crossing the film pass from one phone into the next.
(() => {
  const row = document.getElementById('heRow');
  const film = document.getElementById('heFilm');
  if (!row || !film) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const screens = [...row.querySelectorAll('.iphone__screen')];
  const canvases = screens.map((s) => s.querySelector('canvas'));
  const ctxs = canvases.map((c) => c.getContext('2d'));
  let stage = null;

  // The stage is the box around every visible screen; the film covers it like one big picture.
  function measure() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const visible = screens.filter((s) => s.offsetParent);
    const rects = visible.map((s) => s.getBoundingClientRect());
    const left = Math.min(...rects.map((r) => r.left));
    const top = Math.min(...rects.map((r) => r.top));
    const right = Math.max(...rects.map((r) => r.right));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    stage = { left, top, width: right - left, height: bottom - top };
    screens.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      canvases[i].width = Math.round(r.width * dpr);
      canvases[i].height = Math.round(r.height * dpr);
      canvases[i].dataset.x = r.left - left;
      canvases[i].dataset.y = r.top - top;
      canvases[i].dataset.w = r.width;
      canvases[i].dataset.h = r.height;
    });
  }

  function draw() {
    if (!stage || film.readyState < 2) return;
    const vw = film.videoWidth;
    const vh = film.videoHeight;
    // Cover: scale the film so it fills the whole stage, centred.
    const scale = Math.max(stage.width / vw, stage.height / vh);
    const offX = (vw * scale - stage.width) / 2;
    const offY = (vh * scale - stage.height) / 2;
    canvases.forEach((c, i) => {
      if (!c.width) return;
      const x = +c.dataset.x, y = +c.dataset.y, w = +c.dataset.w, h = +c.dataset.h;
      ctxs[i].drawImage(film, (x + offX) / scale, (y + offY) / scale, w / scale, h / scale, 0, 0, c.width, c.height);
    });
  }

  function loop() { draw(); requestAnimationFrame(loop); }

  const start = () => { measure(); if (reduced) { film.pause(); draw(); } else { film.play().catch(() => {}); loop(); } };
  film.addEventListener('loadeddata', start, { once: true });
  window.addEventListener('resize', () => { measure(); draw(); });
  // The row fades in with a transform; measure again once it has settled.
  row.addEventListener('reveal', () => setTimeout(() => { measure(); draw(); }, 950));
})();
