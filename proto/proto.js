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
    // Anchor the crop high, so runners keep their heads.
    const offY = (vh * scale - stage.height) * 0.22;
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

// E: live app rows on each phone. Demo data, fictional names; ranks change as values tick.
(() => {
  const row = document.getElementById('heRow');
  if (!row) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);
  const COLORS = ['#0751fb', '#f2552c', '#12a876', '#8b5cf6', '#e2a400', '#0ea5c6'];
  const ROW_H = 40;
  const pace = (secPerKm) => `${Math.floor(secPerKm / 60)}:${String(Math.round(secPerKm % 60)).padStart(2, '0')} /km`;

  const BOARDS = {
    steps: {
      title: 'Steps today',
      people: [['Ana M.', 7840], ['Luca R.', 7790], ['Sofia D.', 7610], ['Jonas K.', 7480], ['Maya L.', 7350], ['Ravi S.', 7210]],
      value: (p) => Math.round(p.v).toLocaleString('en-US'),
      tick: (p) => { p.v += rand(4, 26); },
    },
    run: {
      title: 'Running',
      people: [['Elena V.', 5.42, 298], ['Tom B.', 5.37, 305], ['Ines G.', 5.21, 289], ['Marc P.', 5.08, 312], ['Zoe H.', 4.96, 301], ['Omar F.', 4.81, 318]],
      value: (p) => `${p.v.toFixed(2)} km`,
      sub: (p) => pace(p.s),
      tick: (p) => { p.s = Math.max(270, Math.min(340, p.s + rand(-4, 4))); p.v += 20 / p.s * rand(0.6, 1.4); },
    },
    bike: {
      title: 'Cycling',
      people: [['Paul D.', 18.4, 27], ['Lea W.', 18.1, 29], ['Hugo C.', 17.6, 26], ['Nina R.', 17.2, 28], ['Ivan T.', 16.9, 25], ['Sara E.', 16.5, 27]],
      value: (p) => `${p.v.toFixed(1)} km`,
      sub: (p) => `${Math.round(p.s)} km/h`,
      tick: (p) => { p.s = Math.max(22, Math.min(34, p.s + rand(-1, 1))); p.v += p.s / 3600 * 12 * rand(0.7, 1.3); },
    },
    league: {
      title: 'Team league',
      people: [['Riverside', 31, 412], ['Northside', 30, 398], ['Old Town', 28, 385], ['Harbour', 27, 371], ['Hilltop', 25, 360]],
      value: (p) => `${p.v} pts`,
      sub: (p) => `${Math.round(p.s)} km this week`,
      tick: (p) => { p.s += rand(0.2, 1.4); if (Math.random() < 0.05) p.v += 1; },
    },
  };

  function mountBoard(el, cfg) {
    el.innerHTML = `<div class="pboard__head"><span>${cfg.title}</span><span class="live">Live</span></div><div class="pboard__list"></div>`;
    const list = el.querySelector('.pboard__list');
    const people = cfg.people.map(([n, v, s], i) => {
      const r = document.createElement('div');
      r.className = 'pboard__row';
      const initials = n.split(/\s+/).map((w) => w[0]).join('').slice(0, 2);
      r.innerHTML = `<span class="pboard__pos"></span><span class="pboard__ava" style="background:${COLORS[i % COLORS.length]}">${initials}</span><span class="pboard__name">${n}<span class="pboard__sub"></span></span><span class="pboard__val"></span>`;
      list.appendChild(r);
      return { n, v, s, el: r, rank: i };
    });
    // Only as many rows as fit in the bottom half; the rest wait below and slide in when they climb.
    const fit = () => {
      const free = el.clientHeight - el.querySelector('.pboard__head').offsetHeight - 6;
      const count = Math.max(2, Math.floor((free + 6) / ROW_H));
      list.style.height = `${count * ROW_H - 6}px`;
      list.style.overflow = 'hidden';
    };
    const render = () => {
      [...people].sort((a, b) => b.v - a.v).forEach((p, i) => {
        const up = i < p.rank;
        p.rank = i;
        p.el.style.transform = `translateY(${i * ROW_H}px)`;
        p.el.querySelector('.pboard__pos').textContent = i + 1;
        p.el.querySelector('.pboard__val').innerHTML = cfg.value(p) + '<span class="pboard__arrow">▲</span>';
        if (cfg.sub) p.el.querySelector('.pboard__sub').textContent = cfg.sub(p);
        p.el.classList.toggle('is-first', i === 0);
        if (up) { p.el.classList.add('is-up'); setTimeout(() => p.el.classList.remove('is-up'), 1400); }
      });
    };
    fit(); render();
    window.addEventListener('resize', fit);
    return () => {
      people.forEach((p) => cfg.tick(p));
      // Now and then someone puts in a burst, so places change.
      if (Math.random() < 0.35) { const p = people[Math.floor(Math.random() * people.length)]; cfg.tick(p); cfg.tick(p); cfg.tick(p); }
      render();
    };
  }

  function mountPrize(el) {
    const MEDALS = [['bronze', 'Bronze medal', '3,000 steps'], ['silver', 'Silver medal', '5,000 steps'], ['gold', 'Gold medal', '10,000 steps']];
    let i = 0;
    let fill = 0;
    el.innerHTML = '<div class="prize__top"><img class="prize__medal" alt="" /><div><div class="prize__kicker">Next reward</div><div class="prize__title"></div></div></div><div class="prize__bar"><div class="prize__fill"></div></div><div class="prize__foot"><span class="prize__goal"></span><span class="prize__pct"></span></div>';
    const img = el.querySelector('.prize__medal');
    const show = (unlocked) => {
      const [key, name, goal] = MEDALS[i];
      img.src = `/medals/${key}.png`;
      el.querySelector('.prize__kicker').textContent = unlocked ? 'Unlocked just now' : 'Next reward';
      el.querySelector('.prize__title').textContent = unlocked ? `${name} unlocked` : name;
      el.querySelector('.prize__goal').textContent = goal;
    };
    show(false);
    return () => {
      fill = Math.min(100, fill + rand(6, 14));
      el.querySelector('.prize__fill').style.width = `${fill}%`;
      el.querySelector('.prize__pct').textContent = `${Math.round(fill)}%`;
      if (fill >= 100 && !el.classList.contains('is-new')) {
        el.classList.add('is-new');
        show(true);
        setTimeout(() => { el.classList.remove('is-new'); i = (i + 1) % MEDALS.length; fill = 0; show(false); }, 2600);
      }
    };
  }

  const ticks = [];
  row.querySelectorAll('[data-board]').forEach((el) => ticks.push(mountBoard(el, BOARDS[el.dataset.board])));
  row.querySelectorAll('[data-prize]').forEach((el) => ticks.push(mountPrize(el)));
  if (reduced) return;

  let timer = null;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !timer) timer = setInterval(() => ticks.forEach((t) => t()), 800);
    if (!e.isIntersecting) { clearInterval(timer); timer = null; }
  }, { threshold: 0.15 }).observe(row);
})();
