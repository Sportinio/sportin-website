// 06 to 08: the live animations in the phone's place (features-viz.css). Each runs while its page
// is the one on screen: in the pinned scene that is the panel features.js leaves without "inert";
// on narrow screens, where the pages stack, it is the panel in view. Still with reduced motion.
(() => {
  const sec = document.getElementById('features');
  if (!sec) return;
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const rnd = (a, b) => a + Math.random() * (b - a);

  const A = '/proto/media/app/';
  const TIER = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master'];

  // ---------- 06 Leaderboard (the app's Steps board): Individuals, Supporters' clubs, Countries ----------
  // On Individuals a fan levels up: their badge turns from Silver to Gold, and the level cards count it.
  function board(root) {
    const list = root.querySelector('.fvb'); const tabs = [...root.querySelectorAll('.fv__tabs span')];
    const cards = Object.fromEntries([...root.querySelectorAll('.lv__c')].map((c) => [c.dataset.t, c]));
    const BASE = { bronze: 21, silver: 69, gold: 45, platinum: 10, diamond: 2, master: 3 };
    // [avatar, flag, name, sub, steps, MI, level]
    const SETS = [
      [['default_avatar_female_1', 'ro', 'Ana M.', 'London SC', 25588, 8.4, 'gold'], ['default_avatar_male_1', 'ro', 'Radu P.', 'North Stand', 23270, 8.1, 'platinum'],
       ['default_avatar_female_3', 'ca', 'Sofia A.', 'Toronto SC', 21668, 6.4, 'silver'], ['default_avatar_female_2', 'fr', 'Emma L.', 'Paris SC', 16299, 5.1, 'gold'],
       ['default_avatar_male_2', 'us', 'Jake M.', 'New York SC', 14550, 8.0, 'bronze']],
      [['LDN', '', 'London SC', '48 fans', 1284400, 7.9], ['DUB', '', 'Dublin SC', '41 fans', 1251900, 7.6], ['TOR', '', 'Toronto SC', '36 fans', 1198300, 7.2],
       ['PAR', '', 'Paris SC', '33 fans', 1150700, 6.9], ['NYC', '', 'New York SC', '29 fans', 1102500, 6.8]],
      [['flag_ro', 'ro', 'Romania', '53 fans', 4820100, 7.4], ['flag_es', 'es', 'Spain', '16 fans', 4655300, 7.1], ['flag_ca', 'ca', 'Canada', '12 fans', 4410900, 6.8],
       ['flag_fr', 'fr', 'France', '10 fans', 4199800, 6.6], ['flag_us', 'us', 'United States', '9 fans', 3987600, 6.3]],
    ];
    let set = 0; let rows = []; let timers = [];
    const later = (ms, fn) => timers.push(setTimeout(fn, ms));
    const counts = () => { for (const t in cards) cards[t].querySelector('i').textContent = BASE[t]; };
    function build() {
      list.innerHTML = '';
      rows = SETS[set].map(([av, flag, name, sub, v, mi, lvl]) => {
        const li = document.createElement('li');
        const avatar = set === 0 ? `<img src="${A}${av}.png" alt="" />` : set === 2 ? `<img src="${A}${av}.png" alt="" />` : `<i>${av}</i>`;
        li.innerHTML = `<span class="fvb__rk"></span><span class="fvb__who"><span class="fvb__av">${avatar}${lvl ? `<img class="fvb__lvl" src="${A}tier_${lvl}.png" alt="" />` : ''}</span>`
          + `<span class="fvb__nm"><b>${flag && set === 0 ? `<img src="${A}flag_${flag}.png" alt="" />` : ''}${name}</b><small>${sub}</small></span></span><span class="fvb__v"></span><span class="fvb__mi">${mi.toFixed(1)}</span>`;
        list.appendChild(li);
        return { li, v, lvl, rk: li.querySelector('.fvb__rk'), out: li.querySelector('.fvb__v'), sub: li.querySelector('small'), badge: li.querySelector('.fvb__lvl') };
      });
      tabs.forEach((t, i) => t.classList.toggle('is-on', i === set)); counts(); place();
    }
    function place() { [...rows].sort((p, q) => q.v - p.v).forEach((r, i) => { r.li.style.setProperty('--r', i); r.rk.textContent = i + 1; r.out.textContent = fmt(r.v); }); }
    function levelUp() { // Sofia A. reaches Gold
      const r = rows.find((x) => x.lvl === 'silver'); if (!r) return;
      r.lvl = 'gold'; r.badge.src = `${A}tier_gold.png`; r.badge.classList.remove('is-pop'); void r.badge.offsetWidth; r.badge.classList.add('is-pop');
      r.sub.innerHTML = '<em>Level up · Gold</em>';
      cards.silver.querySelector('i').textContent = BASE.silver - 1; cards.gold.querySelector('i').textContent = BASE.gold + 1;
      ['silver', 'gold'].forEach((t) => { cards[t].classList.add('is-flash'); later(1400, () => cards[t].classList.remove('is-flash')); });
    }
    function cycle() { // one tab: steps come in, (on Individuals a level up), then the next tab
      const tick = setInterval(() => { const k = Math.floor(Math.random() * rows.length); const top = Math.max(...rows.map((r) => r.v)); rows.forEach((r, i) => { r.v += (i === k ? rnd(0.02, 0.045) : rnd(0.002, 0.008)) * top; }); place(); }, 1200);
      timers.push({ tick });
      if (set === 0) later(2600, levelUp);
      later(set === 0 ? 7000 : 5200, () => { clearInterval(tick); list.classList.add('is-swap'); later(320, () => { set = (set + 1) % SETS.length; build(); list.classList.remove('is-swap'); cycle(); }); });
    }
    build();
    return {
      start() { if (RM || timers.length) return; set = 0; build(); cycle(); },
      stop() { timers.forEach((t) => (t.tick ? clearInterval(t.tick) : clearTimeout(t))); timers = []; },
    };
  }

  // ---------- 07 Running (the app's Running board): a fan finishes and claims the distance medal ----------
  function race(root) {
    const card = root.querySelector('.fv__card'); const list = root.querySelector('.fvr'); const claim = root.querySelector('.rk__claim');
    const medals = [...root.querySelectorAll('.md__c')]; const dist = root.querySelector('.rk__dist');
    const BASE = [3, 2, 2, 0, 0, 0];
    // per distance: the board before, then the runner who finishes [avatar, flag, name, team, pace, time in s]
    const RUNS = [
      { d: 0, rows: [['default_avatar_male_3', 'ro', 'Radu P.', 'North Stand', '5:37', 1010], ['default_avatar_female_2', 'fr', 'Emma L.', 'South Stand', '6:12', 1116], ['default_avatar_male_2', 'us', 'Jake M.', 'North Stand', '7:05', 1275]],
        new: ['default_avatar_female_1', 'ro', 'Ana M.', 'South Stand', '5:58', 1074] },
      { d: 1, rows: [['default_avatar_male_1', 'ca', 'Dan W.', 'North Stand', '5:21', 1605]],
        new: ['default_avatar_female_3', 'ca', 'Sofia A.', 'South Stand', '5:46', 1730] },
      { d: 2, rows: [], new: ['default_avatar_male_3', 'ro', 'Radu P.', 'North Stand', '5:41', 3410] },
    ];
    const clock = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    let i = 0; let timers = [];
    const later = (ms, fn) => timers.push(setTimeout(fn, ms));
    const row = ([av, flag, name, team, pace, t]) => { const li = document.createElement('li'); li.innerHTML = `<span class="fvb__rk"></span><span class="fvb__who"><span class="fvb__av"><img src="${A}${av}.png" alt="" /></span><span class="fvb__nm"><b><img src="${A}flag_${flag}.png" alt="" />${name}</b><small>${team} · ${pace}/km</small></span></span><span class="fvb__v">${clock(t)}</span><span class="fvb__mi"></span>`; li.t = t; return li; };
    function place() { const all = [...list.children].sort((p, q) => p.t - q.t); const lead = all[0] && all[0].t; all.forEach((li, k) => { li.style.setProperty('--r', k); li.querySelector('.fvb__rk').textContent = k + 1; li.querySelector('.fvb__mi').textContent = k ? `+${clock(li.t - lead)}` : 'Leader'; }); }
    function show(n) {
      const run = RUNS[n]; list.innerHTML = ''; claim.classList.remove('is-on');
      medals.forEach((m, k) => { m.classList.toggle('is-on', k === run.d); m.querySelector('i').textContent = BASE[k] + (k < run.d ? 1 : 0); });
      dist.textContent = medals[run.d].querySelector('b').textContent;
      run.rows.forEach((r) => list.appendChild(row(r))); place();
      later(1600, () => { // the new runner finishes and slides into place
        const li = row(run.new); li.classList.add('is-new'); list.appendChild(li); place();
        requestAnimationFrame(() => li.classList.remove('is-new'));
        later(700, () => fly(run.d, li));
      });
    }
    function fly(d, li) { // the medal leaves its card and lands on the runner's avatar
      const from = medals[d].querySelector('img').getBoundingClientRect(); const to = li.querySelector('.fvb__av').getBoundingClientRect(); const box = card.getBoundingClientRect();
      const m = document.createElement('img'); m.className = 'md__fly'; m.src = medals[d].querySelector('img').src;
      m.style.left = `${from.left - box.left}px`; m.style.top = `${from.top - box.top}px`; card.appendChild(m);
      requestAnimationFrame(() => requestAnimationFrame(() => { m.style.transform = `translate(${to.left - from.left + 14}px, ${to.top - from.top + 14}px) scale(0.62)`; }));
      later(950, () => {
        m.remove(); const badge = document.createElement('img'); badge.className = 'fvb__lvl is-pop'; badge.src = medals[d].querySelector('img').src; li.querySelector('.fvb__av').appendChild(badge);
        const c = medals[d].querySelector('i'); c.textContent = Number(c.textContent) + 1; medals[d].classList.add('is-flash'); later(900, () => medals[d].classList.remove('is-flash'));
        claim.classList.add('is-on');
      });
      later(4200, () => { i = (i + 1) % RUNS.length; show(i); });
    }
    show(0); timers.forEach(clearTimeout); timers = []; // the first board, still, until the page is reached
    return {
      start() { if (RM || timers.length) return; i = 0; show(0); },
      stop() { timers.forEach(clearTimeout); timers = []; card.querySelectorAll('.md__fly').forEach((m) => m.remove()); },
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
