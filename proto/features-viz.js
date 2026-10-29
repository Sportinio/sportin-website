// 06 to 08: the live animations in the phone's place (features-viz.css). Each runs while its page
// is the one on screen: in the pinned scene that is the panel features.js leaves without "inert";
// on narrow screens, where the pages stack, it is the panel in view. Still with reduced motion.
(() => {
  const sec = document.getElementById('features');
  if (!sec) return;
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---------- 06 Leaderboard: fans, then supporters' clubs, then countries ----------
  function board(root) {
    const list = root.querySelector('.fvb'); const tabs = [...root.querySelectorAll('.fv__tabs span')];
    const SETS = [
      [['AM', 'Ana M.', 25588], ['RP', 'Radu P.', 24120], ['SA', 'Sofia A.', 22840], ['EL', 'Emma L.', 21905], ['JM', 'Jake M.', 20410]],
      [['LDN', 'London SC', 1284400], ['DUB', 'Dublin SC', 1251900], ['MAD', 'Madrid SC', 1198300], ['TOR', 'Toronto SC', 1150700], ['PAR', 'Paris SC', 1102500]],
      [['GB', 'United Kingdom', 4820100], ['IE', 'Ireland', 4655300], ['ES', 'Spain', 4410900], ['CA', 'Canada', 4199800], ['FR', 'France', 3987600]],
    ];
    let set = 0; let rows = [];
    function build() {
      list.innerHTML = ''; rows = SETS[set].map(([ini, name, v]) => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="fvb__n"></span><span class="fvb__av">${ini}</span><span class="fvb__name">${name}<i></i></span><span class="fvb__v"></span>`;
        list.appendChild(li); return { li, v, n: li.querySelector('.fvb__n'), out: li.querySelector('.fvb__v'), bar: li.querySelector('i') };
      });
      tabs.forEach((t, i) => t.classList.toggle('is-on', i === set)); place();
    }
    function place() {
      const sorted = [...rows].sort((p, q) => q.v - p.v); const top = sorted[0].v;
      sorted.forEach((r, i) => { r.li.style.setProperty('--r', i); r.n.textContent = i + 1; r.out.textContent = fmt(r.v); r.li.classList.toggle('is-top', i === 0); r.bar.style.setProperty('--w', (r.v / top).toFixed(3)); });
    }
    let tick = 0; let swap = 0;
    build();
    return {
      start() {
        if (RM || tick) return;
        tick = setInterval(() => { // steps come in; now and then someone gains enough to climb
          const k = Math.floor(Math.random() * rows.length); const top = Math.max(...rows.map((r) => r.v));
          rows.forEach((r, i) => { r.v += (i === k ? rnd(0.025, 0.05) : rnd(0.002, 0.01)) * top; r.li.classList.toggle('is-up', i === k); });
          place();
        }, 1300);
        swap = setInterval(() => { list.classList.add('is-swap'); setTimeout(() => { set = (set + 1) % SETS.length; build(); list.classList.remove('is-swap'); }, 320); }, 5200);
      },
      stop() { clearInterval(tick); clearInterval(swap); tick = 0; swap = 0; },
    };
  }

  // ---------- 07 Race: two teams of the club's own fans (North Stand, South Stand) ----------
  function race(root) {
    const lanesEl = root.querySelector('.fvr__lanes'); const km = [...root.querySelectorAll('.fvr__km')];
    const tug = root.querySelector('.fvr__tug'); const dist = [...root.querySelectorAll('.fvr__dist span')];
    const RUN = ['AM', 'DW', 'SA', 'KB', 'EL', 'TR'];
    const runners = RUN.map((ini, i) => {
      const lane = document.createElement('div'); lane.className = 'fvr__lane';
      const r = document.createElement('span'); r.className = `fvr__run${i % 2 ? ' fvr__run--b' : ''}`; r.textContent = ini;
      lane.appendChild(r); lanesEl.appendChild(lane);
      return { el: r, lane, side: i % 2, x: rnd(0, 0.6), v: rnd(0.07, 0.12) };
    });
    const tot = [1284, 1201];
    let raf = 0; let last = 0; let d = 0; let dTimer = 0;
    const paint = () => {
      runners.forEach((r) => { const w = r.lane.clientWidth - 40; r.el.style.setProperty('--x', `${(r.x * w).toFixed(1)}px`); });
      km.forEach((k, i) => { k.textContent = fmt(tot[i]); }); tug.style.setProperty('--a', (tot[0] / (tot[0] + tot[1])).toFixed(3));
    };
    const frame = (now) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
      runners.forEach((r) => {
        r.x += r.v * dt; tot[r.side] += r.v * dt * (r.side ? 9.6 : 10); // a close race
        if (r.x >= 1) { r.x = 0; r.v = rnd(0.07, 0.12); }
      });
      paint(); raf = requestAnimationFrame(frame);
    };
    paint();
    return {
      start() { if (RM || raf) return; last = 0; raf = requestAnimationFrame(frame); dTimer = setInterval(() => { d = (d + 1) % dist.length; dist.forEach((s, i) => s.classList.toggle('is-on', i === d)); }, 3600); },
      stop() { cancelAnimationFrame(raf); raf = 0; clearInterval(dTimer); dTimer = 0; },
    };
  }

  // ---------- 08 Rewards: the step count climbs and unlocks each reward in turn ----------
  function rewards(root) {
    const out = root.querySelector('.fvw__count b'); const bar = root.querySelector('.fvw__bar');
    const items = [...root.querySelectorAll('.fvw__list li')]; const GOAL = 12000;
    let raf = 0; let t0 = 0;
    const show = (steps, redeem) => {
      out.textContent = fmt(steps); bar.style.setProperty('--p', Math.min(1, steps / GOAL).toFixed(4));
      items.forEach((li, i) => {
        const on = steps >= Number(li.dataset.at); const r = redeem && i === items.length - 1;
        li.classList.toggle('is-on', on && !r); li.classList.toggle('is-redeem', r);
        li.querySelector('em').textContent = r ? 'Redeem' : on ? 'Unlocked' : 'Locked';
      });
    };
    const frame = (now) => {
      if (!t0) t0 = now; const e = (now - t0) / 1000;
      const RUNUP = 6.5; const HOLD = 3; // climb, then hold the redeemed reward, then start again
      if (e > RUNUP + HOLD) t0 = now;
      const u = Math.min(1, e / RUNUP); const eased = 1 - (1 - u) ** 2;
      show(Math.round(eased * GOAL * 1.02 / 10) * 10, e > RUNUP + 0.5);
      raf = requestAnimationFrame(frame);
    };
    show(0, false);
    return {
      start() { if (RM) { show(GOAL, true); return; } if (raf) return; t0 = 0; raf = requestAnimationFrame(frame); },
      stop() { cancelAnimationFrame(raf); raf = 0; },
    };
  }

  const MAKE = { 'fv-board': board, 'fv-race': race, 'fv-rewards': rewards };
  const items = [...sec.querySelectorAll('.fv[data-demo]')].map((el) => ({ el, panel: el.closest('.feat__panel'), anim: MAKE[el.dataset.demo](el) }));
  const narrow = window.matchMedia('(max-width: 900px)').matches;
  if (narrow) {
    items.forEach((it) => new IntersectionObserver(([en]) => (en.isIntersecting ? it.anim.start() : it.anim.stop()), { threshold: 0.25 }).observe(it.panel));
    return;
  }
  // Pinned scene: the current page is the one without "inert" (features.js), while the scene is on screen.
  let inView = false;
  const sync = () => items.forEach((it) => { if (inView && !it.panel.hasAttribute('inert')) it.anim.start(); else it.anim.stop(); });
  items.forEach((it) => new MutationObserver(sync).observe(it.panel, { attributes: true, attributeFilter: ['inert'] }));
  new IntersectionObserver(([en]) => { inView = en.isIntersecting; sync(); }, { threshold: 0.1 }).observe(sec);
})();
