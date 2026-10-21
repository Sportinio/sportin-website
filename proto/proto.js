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
    // Only the top half of each screen shows film (the app sheet starts at 437 of 874 points).
    // Fit the film to the stage width and centre the runners in that strip.
    const band = stage.height * (437 / 874);
    const scale = Math.max(stage.width / vw, band / vh);
    const offX = (vw * scale - stage.width) / 2;
    const offY = Math.min(Math.max(vh * scale * 0.42 - band / 2, 0), vh * scale - band);
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

// E: the app's leaderboard sheet on each phone (spec: design lead audit 2026-10-21; components from
// rork-sportin-io/ios/SportInIo/Views/Explore). Demo data with fictional names.
(() => {
  const row = document.getElementById('heRow');
  if (!row) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);
  const M = '/assets/site/media/app/';
  const PITCH = 78; // 70 row + 8 gap
  const de = (n, d = 0) => n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
  const clock = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
  const RING = (pct, color) => `<svg viewBox="0 0 32 46" width="32" height="46" aria-hidden="true"><rect x="1" y="1" width="30" height="44" rx="7" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.1)" stroke-width="2"/><rect x="1" y="1" width="30" height="44" rx="7" fill="none" stroke="${color}" stroke-width="2" pathLength="100" stroke-dasharray="${pct} 100" stroke-dashoffset="-12.5" stroke-linecap="round"/></svg>`;
  const stepColor = (v) => (v < 5000 ? '#FF3B30' : v < 10000 ? '#FF9500' : '#34C759');

  // Number roll over 600 ms, ease-out (AnimatedStepNumber.swift:33-37).
  function roll(el, from, to, fmt) {
    if (reduced || from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 600);
      el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const BOARDS = {
    steps: {
      title: 'Steps today',
      people: [['Emma Dubois', 'France', '🇫🇷', 'av_female1', 'silver', 11240], ['Laura Iacob', 'Romania', '🇷🇴', 'av_female2', 'gold', 10980], ['Jake Morrison', 'United States', '🇺🇸', 'av_male1', 'silver', 9860], ['Sofia Andersen', 'Sweden', '🇸🇪', 'av_female3', 'bronze', 9610], ['Mateo Ruiz', 'Spain', '🇪🇸', 'av_male2', 'silver', 8720]],
      value: (v) => de(Math.round(v)), suffix: 'st',
      sub: (p) => p.country,
      ring: (p) => [Math.min(100, p.v / 100), stepColor(p.v)],
      change: (p) => ({ text: `+${de(Math.round(p.gain))}`, cls: 'up' }),
      inc: () => rand(18, 42),
    },
    run: {
      title: 'Running',
      people: [['Lukas Weber', 'Germany', '🇩🇪', 'av_male3', 'gold', 5.42, 298], ['Ana Costa', 'Portugal', '🇵🇹', 'av_female2', 'silver', 5.21, 302], ['Noah Peeters', 'Belgium', '🇧🇪', 'av_male1', 'silver', 4.97, 291], ['Mia Rossi', 'Italy', '🇮🇹', 'av_female1', 'bronze', 4.76, 309], ['Leo Martin', 'France', '🇫🇷', 'av_male2', 'bronze', 4.55, 314]],
      value: (v) => de(v, 2), suffix: 'km',
      sub: (p) => `${clock(p.s)} /km · ${clock(p.v * p.s)}`,
      ring: (p) => [Math.min(100, p.v * 10), '#1A8CFF'],
      change: () => null,
      inc: (p) => 9 / p.s * rand(0.85, 1.15),
    },
    bike: {
      title: 'Cycling',
      people: [['Hugo Lefèvre', 'France', '🇫🇷', 'av_male2', 'platinum', 18.4, 27], ['Clara Vogel', 'Austria', '🇦🇹', 'av_female3', 'gold', 17.9, 28], ['Daan Visser', 'Netherlands', '🇳🇱', 'av_male3', 'gold', 17.3, 26], ['Elena Popa', 'Romania', '🇷🇴', 'av_female1', 'silver', 16.8, 27], ['Oscar Lind', 'Sweden', '🇸🇪', 'av_male1', 'silver', 16.2, 25]],
      value: (v) => de(v, 1), suffix: 'km',
      sub: (p) => `${Math.round(p.s)} km/h · ${clock(p.v / p.s * 60)}`,
      ring: (p) => [Math.min(100, p.v * 4), '#1A8CFF'],
      change: () => null,
      inc: (p) => p.s / 3600 * 2.8 * rand(0.85, 1.15),
    },
    league: {
      title: 'Team league',
      teams: [['Northside Runners', 'NR', '#0751FB', 128, 412], ['Harbour Walkers', 'HW', '#6B4EFF', 96, 398], ['Old Town Movers', 'OT', '#E67E22', 141, 381], ['Riverside Club', 'RC', '#2ECC71', 87, 364], ['Hill Street Crew', 'HS', '#E2A400', 73, 347]],
      value: (v) => de(Math.round(v)), suffix: 'km',
      inc: () => rand(0.6, 1.6),
    },
  };

  function mountBoard(app, kind) {
    const cfg = BOARDS[kind];
    const sheet = app.querySelector('.sheet');
    sheet.innerHTML = `<div class="sheet__head"><span class="sheet__title">${cfg.title}</span><span class="sheet__live">Live</span></div><div class="sheet__list"></div>`;
    const list = sheet.querySelector('.sheet__list');
    const isTeam = kind === 'league';
    const src = isTeam ? cfg.teams : cfg.people;
    const people = src.map((d, i) => {
      const el = document.createElement('div');
      el.className = 'row';
      const p = isTeam
        ? { name: d[0], v: d[4], members: d[3] }
        : { name: d[0], country: d[1], v: d[5], s: d[6], gain: 0 };
      const ava = isTeam
        ? `<span class="ava ava--team"><span class="ava__crest" style="background:${d[2]}">${d[1]}</span></span>`
        : `<span class="ava"><img src="${M}${d[3]}.jpg" alt=""><img class="tier" src="${M}tier_${d[4]}.png" alt=""></span>`;
      const name = isTeam ? `<span class="who__name">${d[0]}</span>` : `<span class="who__name"><span class="flag">${d[2]}</span>${d[0]}</span>`;
      el.innerHTML = `<span class="rank"><span class="rank__ring"></span><b></b><i>—</i></span>${ava}<span class="who">${name}<span class="who__sub"></span></span><span class="val2"><span><span class="val2__n"></span><sup>${cfg.suffix}</sup></span><small></small></span>`;
      list.appendChild(el);
      return Object.assign(p, { el, rank: i, shown: p.v });
    });
    list.style.height = `${src.length * PITCH - 8}px`;

    const render = () => {
      [...people].sort((a, b) => b.v - a.v).forEach((p, i) => {
        if (i !== p.rank) {
          const arrow = p.el.querySelector('.rank i');
          arrow.textContent = i < p.rank ? '▲' : '▼';
          arrow.className = i < p.rank ? 'up' : 'down';
          p.el.classList.toggle('is-climbing', i < p.rank);
          setTimeout(() => p.el.classList.remove('is-climbing'), 650);
        }
        p.rank = i;
        p.el.style.transform = `translateY(${i * PITCH}px)`;
        if (i < 3) p.el.dataset.podium = i + 1; else delete p.el.dataset.podium;
        p.el.querySelector('.rank b').textContent = i + 1;
        const [pct, color] = isTeam ? [Math.min(100, p.v / 5), '#1A8CFF'] : cfg.ring(p);
        p.el.querySelector('.rank__ring').innerHTML = RING(pct, color);
        roll(p.el.querySelector('.val2__n'), p.shown, p.v, cfg.value);
        p.shown = p.v;
        p.el.querySelector('.who__sub').textContent = isTeam ? `👥 ${p.members} members` : cfg.sub(p);
        const small = p.el.querySelector('.val2 small');
        const ch = isTeam ? { text: 'this week', cls: 'muted' } : cfg.change(p);
        small.textContent = ch ? ch.text : '';
        small.className = ch ? ch.cls : '';
      });
    };
    render();

    // Values rise steadily; about every six seconds one person puts in a burst and passes the one above.
    let lastPass = performance.now();
    return () => {
      const now = performance.now();
      people.forEach((p) => { const g = cfg.inc(p); p.v += g; p.gain = g * 6; if (p.s && !isTeam && kind === 'run') p.s = Math.max(280, Math.min(330, p.s + rand(-3, 3))); });
      if (now - lastPass > 6000) {
        const order = [...people].sort((a, b) => b.v - a.v);
        const k = 1 + Math.floor(Math.random() * (order.length - 1));
        const climber = order[k];
        const above = order[k - 1];
        const g = above.v - climber.v + cfg.inc(climber) * 2;
        climber.v += g;
        climber.gain = g;
        lastPass = now;
      }
      render();
    };
  }

  function mountReward(app) {
    const TIERS = [['bronze', 'Bronze', '#CC8033', '3.000 steps'], ['silver', 'Silver', '#BFBFC7', '5.000 steps'], ['gold', 'Gold', '#FFC208', '10.000 steps']];
    const counts = { gold: 4, silver: 9, bronze: 15 };
    let i = 0;
    let fill = 18;
    const sheet = app.querySelector('.sheet');
    sheet.innerHTML = '<div class="sheet__head"><span class="sheet__title">Rewards</span><span class="sheet__live">Live</span></div><div class="reward"><div class="reward__top"><span class="reward__icon"><img alt="" /></span><span class="reward__text"><span class="reward__label"></span><div class="reward__title"></div></span><span class="reward__pct"></span></div><div class="reward__bar"><div class="reward__fill"></div></div></div><div class="mrows"></div>';
    const card = sheet.querySelector('.reward');
    const rows = sheet.querySelector('.mrows');
    const drawCounts = () => { rows.innerHTML = ['gold', 'silver', 'bronze'].map((k) => `<div class="mrow"><img src="${M}tier_${k}.png" alt=""><span>${k[0].toUpperCase() + k.slice(1)} medals</span><b>${counts[k]}</b></div>`).join(''); };
    const show = (unlocked) => {
      const [key, name, color, goal] = TIERS[i];
      card.style.setProperty('--tier', color);
      card.querySelector('img').src = `${M}tier_${key}.png`;
      card.querySelector('.reward__label').textContent = unlocked ? 'UNLOCKED' : 'NEXT REWARD';
      card.querySelector('.reward__title').textContent = unlocked ? `${name} medal unlocked` : `${name} medal · ${goal}`;
      card.classList.toggle('is-unlocked', unlocked);
    };
    const paint = () => { card.querySelector('.reward__fill').style.width = `${fill}%`; card.querySelector('.reward__pct').textContent = `${Math.round(fill)}%`; };
    show(false); paint(); drawCounts();
    return () => {
      if (card.classList.contains('is-unlocked')) return;
      fill = Math.min(100, fill + rand(9, 16));
      paint();
      if (fill >= 100) {
        show(true);
        counts[TIERS[i][0]] += 1;
        drawCounts();
        setTimeout(() => { i = (i + 1) % TIERS.length; fill = 8; show(false); paint(); }, 3000);
      }
    };
  }

  // Scale each 402-point app screen to the phone's screen width.
  const scaleApps = () => row.querySelectorAll('.app').forEach((a) => a.style.setProperty('--s', (a.parentElement.clientWidth / 402).toFixed(4)));
  scaleApps();
  window.addEventListener('resize', scaleApps);

  const boards = [...row.querySelectorAll('.app')].map((app) => (app.dataset.board === 'reward' ? mountReward(app) : mountBoard(app, app.dataset.board)));
  if (reduced) return;

  // Each board keeps its own rhythm (2.4 to 3.2 s), offset from the others.
  const timers = [];
  const startAll = () => boards.forEach((tick, k) => {
    if (timers[k]) return;
    const run = () => { tick(); timers[k] = setTimeout(run, rand(2400, 3200)); };
    timers[k] = setTimeout(run, 400 + k * 550);
  });
  const stopAll = () => timers.forEach((t, k) => { clearTimeout(t); timers[k] = null; });
  new IntersectionObserver(([e]) => (e.isIntersecting ? startAll() : stopAll()), { threshold: 0.15 }).observe(row);
})();
