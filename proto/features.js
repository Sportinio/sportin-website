// Competitions: the section after the integrations. It opens on a big title, then one page per
// scroll step at the same eased pace as the 3D scenes (scroll-follow.js). Pages do not slide: the
// text (titles, descriptions, bullet points) turns to dust and re-forms as the next page's text
// (dust.js), in slow motion, while the graphic fades out and the next one fades in. The rail at the bottom shows progress; Skip leaves the section.
// Demos for other feature panels stay ready (guarded) in case those panels come back.
// Panel 1, Competitions, shows two formats that play themselves while the panel is on screen:
// a Champions League style cup walks through its stages, and a national league plays a matchday
// and updates its table.
import { followScroll } from '/proto/scroll-follow.js?v=2';
import { createDust, WIN } from '/proto/dust.js?v=8';

const sec = document.getElementById('features');
if (sec) {
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const panels = [...sec.querySelectorAll('.feat__panel')];
  const nav = [...sec.querySelectorAll('.feat__nav button')];
  const STEPS = panels.length - 1;

  // ---------- Knockout bracket (built here to keep the markup short) ----------
  // Quarter-finals (the eight group qualifiers, group winners against runners-up of another group),
  // semi-finals (4), final (2), winner: data-stage 2, 3, 4.
  const svg = sec.querySelector('.cup__ko');
  if (svg) {
    const NS = 'http://www.w3.org/2000/svg';
    const el = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); parent.appendChild(n); return n; };
    const cols = [
      { x: 0, n: 8, stage: 2, label: 'Quarter-finals', names: ['North Runners', 'Harbour Gym', 'Office Team', 'Bike Club', 'Riverside', 'Team Blue', 'City Walkers', 'Park Crew'] },
      { x: 150, n: 4, stage: 3, label: 'Semi-finals', names: ['North Runners', 'Office Team', 'Riverside', 'City Walkers'] },
      { x: 300, n: 2, stage: 4, label: 'Final', names: ['North Runners', 'City Walkers'] },
    ];
    const TOP = 24; const H = 280; const BW = 118; const BH = 26;
    const ys = (n) => Array.from({ length: n }, (_, i) => TOP + (H / n) * (i + 0.5));
    cols.forEach((col) => { const l = el('text', { x: col.x, y: 10, class: 'lbl' }, svg); l.textContent = col.label; });
    { const l = el('text', { x: 450, y: 10, class: 'lbl' }, svg); l.textContent = 'Winner'; }
    cols.forEach((col, ci) => {
      const g = el('g', { 'data-stage': col.stage }, svg);
      const next = cols[ci + 1];
      ys(col.n).forEach((y, i) => {
        if (next) { const ny = ys(next.n)[Math.floor(i / 2)]; el('path', { d: `M${col.x + BW} ${y} H${col.x + BW + 14} V${ny} H${next.x}` }, g); }
        el('rect', { x: col.x, y: y - BH / 2, width: BW, height: BH, rx: 7 }, g);
        const tx = el('text', { x: col.x + 10, y: y + 4.5 }, g); tx.textContent = col.names[i];
      });
    });
    // Champion.
    const champ = el('g', { 'data-stage': 4, class: 'win' }, svg);
    const fy = ys(2);
    const my = TOP + H / 2;
    cols[2].names.forEach((_, i) => el('path', { d: `M${300 + BW} ${fy[i]} H${300 + BW + 14} V${my} H${450}` }, champ));
    el('rect', { x: 450, y: my - 17, width: 126, height: 34, rx: 9 }, champ);
    const ct = el('text', { x: 462, y: my + 5 }, champ); ct.textContent = 'North Runners';
    svg.setAttribute('viewBox', `0 0 578 ${TOP + H}`);
  }

  // ---------- Champions League format: walk through the stages ----------
  const STAGES = 5; // qualifying, groups, quarter-finals, semi-finals, final
  const cupParts = [...sec.querySelectorAll('.cup [data-stage]')];
  let stage = 0;
  function showStage(s) {
    stage = s;
    cupParts.forEach((p) => { const n = Number(p.dataset.stage); p.classList.toggle('is-on', n === s); p.classList.toggle('is-done', n < s); });
  }

  // ---------- National league format: the live match turns on movement index, a team climbs the table ----------
  const live = sec.querySelector('.fix__row[data-live]');
  const rows = [...sec.querySelectorAll('.tbl__row[data-team]')];
  const climber = sec.querySelector('.tbl__row[data-climb]');
  const passed = sec.querySelector('.tbl__row[data-passed]');
  const loser = sec.querySelector('.tbl__row[data-loser]');
  // A row's numbers (pos, P, W, D, L, Pts) before and after the goal, from data-before/data-after.
  const setRow = (row, vals) => { const cells = row.querySelectorAll('span'); const v = vals.split('|'); [0, 2, 3, 4, 5, 6].forEach((c, i) => { cells[c].textContent = v[i]; }); };
  function leagueBefore() {
    if (!live) return;
    live.classList.add('is-live'); live.querySelector('.fix__score').textContent = '5.1 – 5.2';
    rows.forEach((r) => { r.style.transform = ''; r.classList.remove('is-up'); });
    setRow(climber, climber.dataset.before); setRow(passed, passed.dataset.before); if (loser) setRow(loser, loser.dataset.before);
  }
  function leagueAfter() {
    if (!live) return;
    live.querySelector('.fix__score').textContent = '5.6 – 5.2'; live.classList.remove('is-live');
    const h = climber.offsetTop - passed.offsetTop; // one row, including the gap
    climber.style.transform = `translateY(${-h}px)`; passed.style.transform = `translateY(${h}px)`;
    climber.classList.add('is-up');
    setRow(climber, climber.dataset.after); setRow(passed, passed.dataset.after); if (loser) setRow(loser, loser.dataset.after);
  }

  // ---------- Small helpers for the other panels ----------
  const fmtNum = (n) => Math.round(n).toLocaleString('en-US');
  function countUp(el, to, ms, onStep) {
    const t0 = performance.now(); let raf = 0;
    const step = (now) => { const u = Math.min(1, (now - t0) / ms); const e = 1 - (1 - u) ** 3; el.textContent = fmtNum(to * e); if (onStep) onStep(to * e); if (u < 1) raf = requestAnimationFrame(step); };
    if (RM) { el.textContent = fmtNum(to); if (onStep) onStep(to); return () => {}; }
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }
  const panelOf = (name) => sec.querySelector(`[data-demo="${name}"]`);

  // ---------- Demos, one per panel, running only while that panel is on screen ----------
  const demos = {}; // keyed by each panel's data-demo name
  // Competitions: the cup walks through its stages; the league plays a matchday.
  { let timer = 0; let tick = 0;
    demos.knockout = {
      start() {
        if (RM) { showStage(STAGES - 1); return; }
        tick = 0; showStage(0);
        timer = window.setInterval(() => { tick += 1; showStage(tick % STAGES); }, 1500);
      },
      stop() { window.clearInterval(timer); timer = 0; },
    }; }
  { let timer = 0; let tick = 0;
    demos.division = {
      start() {
        leagueBefore(); if (RM) { leagueAfter(); return; }
        tick = 0; timer = window.setInterval(() => { tick += 1; if (tick % 4 === 1) leagueAfter(); if (tick % 4 === 0) leagueBefore(); }, 1400);
      },
      stop() { window.clearInterval(timer); timer = 0; },
    }; }
  // Challenges: the ring and the bars fill, the numbers count up.
  if (panelOf('challenges')) { const box = panelOf('challenges'); let cancels = [];
    demos.challenges = ({
      start() {
        box.querySelector('.ring').style.setProperty('--f', '0.74');
        box.querySelectorAll('.bar i').forEach((b) => { b.style.setProperty('--f', b.dataset.fill); });
        cancels = [...box.querySelectorAll('[data-count]')].map((el) => countUp(el, Number(el.dataset.count), 1400));
      },
      stop() {
        cancels.forEach((c) => c()); cancels = [];
        box.querySelector('.ring').style.setProperty('--f', '0'); box.querySelectorAll('.bar i').forEach((b) => b.style.setProperty('--f', '0'));
        box.querySelectorAll('[data-count]').forEach((el) => { el.textContent = '0'; });
      },
    }); }
  // Leaderboards: the lanes switch, the ranking re-sorts (one member climbs), the live feed ticks.
  if (panelOf('leaderboard')) { const box = panelOf('leaderboard'); const lanes = [...box.querySelectorAll('.lanes span')]; const rowsLb = [...box.querySelectorAll('.rank__row')];
    const feed = box.querySelector('.feed');
    const VALS = [[42, 39, 35, 33, 30], [18, 21, 15, 24, 12], [128, 121, 117, 134, 98]]; // per lane, per member
    const UNIT = [' km', ' km', ' km'];
    const EVENTS = [['Ana M. walked 2.4 km', 'now'], ['Mihai D. ran 5 km', 'now'], ['Ioana C. rode 18 km', '1 min'], ['Radu P. walked 6,200 steps', '2 min'], ['Elena S. ran 3 km', '3 min'], ['Park Crew joined the challenge', '4 min']];
    let lane = 0; let timer = 0; let ev = 0;
    function showLane(l) {
      lane = l; lanes.forEach((sp, i) => sp.classList.toggle('is-on', i === l));
      const order = VALS[l].map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).map(([, i]) => i);
      rowsLb.forEach((row, i) => {
        const slot = order.indexOf(i); const was = Number(row.style.getPropertyValue('--slot') || i);
        row.style.setProperty('--slot', String(slot));
        row.classList.toggle('is-first', slot === 0); row.classList.toggle('is-up', slot < was && slot !== 0);
        row.querySelector('span').textContent = String(slot + 1);
        row.querySelector('em').textContent = `${VALS[l][i]}${UNIT[l]}`;
      });
    }
    function pushEvent() {
      const [txt, when] = EVENTS[ev % EVENTS.length]; ev += 1;
      const li = document.createElement('li'); li.innerHTML = `<span>${txt}</span><em>${when}</em>`;
      feed.prepend(li); while (feed.children.length > 5) feed.lastElementChild.remove();
    }
    demos.leaderboard = ({
      start() {
        feed.innerHTML = ''; ev = 0; for (let i = 0; i < 3; i++) pushEvent(); showLane(0);
        if (RM) return;
        let t = 0; timer = window.setInterval(() => { t += 1; pushEvent(); if (t % 2 === 0) showLane((lane + 1) % 3); }, 1300);
      },
      stop() { window.clearInterval(timer); timer = 0; },
    }); }
  // Rewards: points count up, perks unlock as the points pass them, the last one becomes Redeem.
  if (panelOf('rewards')) { const box = panelOf('rewards'); const perks = [...box.querySelectorAll('.perks li')]; const bar = box.querySelector('.bar i');
    const ptsEl = box.querySelector('[data-count]'); let cancel = () => {}; let timer = 0;
    function run() {
      perks.forEach((li) => { li.classList.remove('is-on', 'is-redeem'); li.querySelector('em').textContent = 'Locked'; });
      bar.style.transition = 'none'; bar.style.setProperty('--f', '0');
      cancel = countUp(ptsEl, 2500, 2600, (v) => {
        bar.style.setProperty('--f', String(v / 2500));
        perks.forEach((li, i) => {
          const at = Number(li.dataset.at); const on = v >= at - 1;
          if (on && !li.classList.contains('is-on')) { li.classList.add('is-on'); li.querySelector('em').textContent = 'Unlocked'; }
          if (i === perks.length - 1 && v >= at - 1) { li.classList.add('is-redeem'); li.querySelector('em').textContent = 'Redeem'; }
        });
      });
    }
    demos.rewards = ({
      start() { run(); if (!RM) timer = window.setInterval(run, 6000); },
      stop() { cancel(); window.clearInterval(timer); timer = 0; },
    }); }

  // Conquer (Game of Run): one big hexagon of hexes. Each team starts from its home ground; a
  // runner crosses the map and paints the hexes it runs through, a rival takes some back, and
  // the territory shares update.
  { const box = panelOf('conquer'); const svgMap = box.querySelector('.hexmap-f'); const NS = 'http://www.w3.org/2000/svg';
    const COLORS = ['#0751fb', '#6f97ff', '#9aa3b5']; const FREE = '#e6e9ef';
    const N = 5; const R = 20; const HW = Math.sqrt(3) * R; // axial radius 5: 91 hexes
    const OX = HW * (N + 0.5) + 4; const OY = R * (1.5 * N + 1) + 4;
    const hexes = []; const byKey = new Map();
    for (let r = -N; r <= N; r++) for (let q = -N; q <= N; q++) {
      if (Math.abs(q + r) > N) continue;
      const cx = OX + HW * (q + r / 2); const cy = OY + R * 1.5 * r;
      const pts = Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 180 * (60 * i - 30); return `${(cx + R * Math.cos(a)).toFixed(1)},${(cy + R * Math.sin(a)).toFixed(1)}`; }).join(' ');
      const poly = document.createElementNS(NS, 'polygon'); poly.setAttribute('points', pts); svgMap.appendChild(poly);
      const h = { q, r, cx, cy, poly, owner: -1 }; hexes.push(h); byKey.set(`${q},${r}`, h);
    }
    svgMap.setAttribute('viewBox', `0 0 ${(2 * OX).toFixed(0)} ${(2 * OY).toFixed(0)}`);
    const runner = document.createElementNS(NS, 'circle'); runner.setAttribute('r', '7'); runner.setAttribute('class', 'runner'); svgMap.appendChild(runner);
    const terr = [...box.querySelectorAll('.terr li')];
    const at = (q, r) => byKey.get(`${q},${r}`);
    const HOME = [[[-4, 0], [-4, 1], [-3, 0], [-3, 1], [-5, 2]], [[3, -4], [4, -4], [3, -3], [4, -3], [5, -4]], [[-1, 4], [0, 4], [1, 3], [0, 3], [-1, 5]]];
    const PATH = [[-2, 0], [-1, 0], [0, -1], [1, -1], [2, -2], [2, -1], [2, 0], [1, 1], [0, 1], [-1, 1], [-2, 2], [-1, 2], [0, 2], [1, 2], [2, 1]];
    const RIVAL = [[3, -2], [2, -2], [3, -1], [2, -1], [1, -2]]; // takes two of the runner's hexes back
    let timer = 0; let i = 0;
    function own(h, team) { h.owner = team; h.poly.setAttribute('fill', team < 0 ? FREE : COLORS[team]); }
    function shares() {
      const n = hexes.length; const counts = [0, 0, 0]; hexes.forEach((h) => { if (h.owner >= 0) counts[h.owner] += 1; });
      terr.forEach((li, k) => { const pct = Math.round((counts[k] / n) * 100); const top = Math.max(1, ...counts); li.querySelector('.bar i').style.setProperty('--f', String(counts[k] / top)); li.querySelector('em').textContent = `${pct}%`; });
    }
    function reset() {
      hexes.forEach((h) => own(h, -1)); HOME.forEach((cells, team) => cells.forEach(([q, r]) => own(at(q, r), team)));
      i = 0; const [q, r] = PATH[0]; runner.setAttribute('cx', at(q, r).cx); runner.setAttribute('cy', at(q, r).cy); shares();
    }
    function step() {
      if (i < PATH.length) { const [q, r] = PATH[i]; const h = at(q, r); own(h, 0); runner.setAttribute('cx', h.cx); runner.setAttribute('cy', h.cy); }
      if (i >= 7 && i - 7 < RIVAL.length) { const [q, r] = RIVAL[i - 7]; own(at(q, r), 1); }
      shares(); i += 1;
      if (i > PATH.length + 4) reset();
    }
    demos.conquer = {
      start() { reset(); if (RM) { while (i < PATH.length) step(); return; } timer = window.setInterval(step, 420); },
      stop() { window.clearInterval(timer); timer = 0; },
    }; }

  // App screens are laid out in iOS points (app-screens.css) and scaled to fit the phone screen.
  const canvases = [...sec.querySelectorAll('.ios')];
  const fit = () => canvases.forEach((c) => { const box = c.parentElement; const k = box.clientWidth / Number(c.dataset.w); if (!k) return; c.style.setProperty('--k', String(k)); c.style.height = `${box.clientHeight / k}px`; });
  new ResizeObserver(fit).observe(sec); fit();
  const fmtPt = (n) => Math.round(n).toLocaleString('de-DE'); // the app groups thousands with a dot

  // Walking (layer 2): the app's steps leaderboard. Steps tick up live; Sofia overtakes Emma, her trend
  // turns green, the rank badges re-number and her steps ring fills.
  { const box = panelOf('ranking'); if (box) {
    const lbRows = [...box.querySelectorAll('.lbr')];
    const BASE = [0, 1, 2, 3, 4, 5, 6]; const SWAP = [0, 1, 3, 2, 4, 5, 6]; // slot per row before and after
    const UP = lbRows[3].querySelector('.rk__c').innerHTML;
    const ringColor = (v) => (v < 5000 ? 'rgb(255,59,48)' : v < 10000 ? 'rgb(255,149,0)' : 'rgb(52,199,89)');
    let timer = 0; let tick = 0;
    const setSlots = (slots) => lbRows.forEach((row, i) => { row.style.setProperty('--slot', String(slots[i])); row.dataset.rank = String(slots[i] + 1); row.querySelector('.rk__n').textContent = String(slots[i] + 1); });
    const val = (row, n) => {
      row.dataset.now = String(n); row.querySelector('.val__n b').textContent = fmtPt(n);
      const rk = row.querySelector('.rk'); rk.style.setProperty('--sp', Math.min(1, n / 10000).toFixed(3)); rk.style.setProperty('--sc', ringColor(n));
    };
    const trend = (cls, text) => { const t = lbRows[3].querySelector('.val em'); t.className = `r ${cls}`; t.textContent = text; };
    function before() {
      setSlots(BASE); lbRows.forEach((r) => val(r, Number(r.dataset.v)));
      trend('down', '↘11%'); lbRows[2].querySelector('.rk__c').textContent = '—';
    }
    function climb() {
      val(lbRows[3], 8120); setSlots(SWAP); trend('up', '↗39%');
      lbRows[2].querySelector('.rk__c').innerHTML = '<svg width="9" height="6" viewBox="0 0 9 6"><path d="M1 1l3.5 3.5L8 1" fill="none" stroke="rgb(231,76,60)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      lbRows[3].querySelector('.rk__c').innerHTML = UP;
    }
    demos.ranking = {
      start() {
        before(); if (RM) { climb(); return; }
        tick = 0; timer = window.setInterval(() => {
          tick += 1; const phase = tick % 8;
          // Live counting on every tick: small bumps on every row.
          lbRows.forEach((r, i) => { if (i !== 3 || phase < 3) val(r, Number(r.dataset.now) + [24, 9, 7, 31, 4, 6, 3][i]); });
          if (phase === 3) climb();
          if (phase === 0) before();
        }, 900);
      },
      stop() { window.clearInterval(timer); timer = 0; },
    };
  } }
  // Running board (layer 2): ranked by pace. Jake finishes a faster 5K, his pace drops to
  // 4:38/km and he moves up to third.
  { const box = panelOf('running'); if (box) {
    const runRows = [...box.querySelectorAll('.lbr')];
    const BASE = [0, 1, 2, 3, 4, 5, 6]; const AFTER = [0, 1, 3, 4, 2, 5, 6];
    const jake = runRows[4]; const jPace = jake.querySelector('.val__run'); const jSub = jake.querySelector('.lbw__s');
    const was = [jPace.textContent, jSub.textContent];
    let timer = 0; let tick = 0;
    const setSlots = (slots) => runRows.forEach((row, i) => { row.style.setProperty('--slot', String(slots[i])); row.dataset.rank = String(slots[i] + 1); row.querySelector('.rk__n').textContent = String(slots[i] + 1); });
    const before = () => { setSlots(BASE); [jPace.textContent, jSub.textContent] = was; };
    const after = () => { jPace.textContent = '4:38/km'; jSub.textContent = '5.0 km · 23:10'; setSlots(AFTER); };
    demos.running = {
      start() {
        before(); if (RM) { after(); return; }
        tick = 0; timer = window.setInterval(() => { tick += 1; const phase = tick % 8; if (phase === 3) after(); if (phase === 0) before(); }, 900);
      },
      stop() { window.clearInterval(timer); timer = 0; },
    };
  } }
  // Brand rewards (layer 3): the shoe reward fills its last two days and turns ready (blue ring),
  // then the coffee is claimed and shows the green tick.
  { const box = panelOf('rewards'); if (box) {
    const rws = [...box.querySelectorAll('.rwr')]; const shoes = rws[1]; const coffee = rws[0];
    const pipsEls = [...shoes.querySelectorAll('.rwr__pips i')];
    const coffeeTile = coffee.querySelector('.rwr__logo'); const coffeeLine = coffee.querySelector('.rwr__line'); const coffeeInd = coffee.querySelector('.rwr__ind');
    const keep = { tile: coffeeTile.outerHTML, line: coffeeLine.textContent, ind: coffeeInd.innerHTML };
    const done = box.querySelector('.rwr__done').outerHTML;
    let timer = 0; let tick = 0;
    const setPips = (n) => { pipsEls.forEach((p, k) => p.classList.toggle('is-on', k < n)); shoes.style.setProperty('--rp', String(n / 5)); shoes.dataset.ring = n >= 5 ? 'ready' : 'day'; };
    function before() {
      setPips(3);
      coffee.dataset.ring = 'ready'; coffee.style.setProperty('--rp', '1'); coffeeLine.textContent = keep.line; coffeeInd.innerHTML = keep.ind;
      const t = coffee.querySelector('.rwr__done, .rwr__logo'); if (t) t.outerHTML = keep.tile;
    }
    function claim() {
      coffee.dataset.ring = 'none'; coffee.style.setProperty('--rp', '0'); coffeeLine.textContent = 'Claimed. Show the QR code at the counter.'; coffeeInd.innerHTML = '';
      const t = coffee.querySelector('.rwr__done, .rwr__logo'); if (t) t.outerHTML = done;
    }
    demos.rewards = {
      start() {
        before(); if (RM) { setPips(5); claim(); return; }
        tick = 0; timer = window.setInterval(() => {
          tick += 1; const phase = tick % 10;
          if (phase === 2) setPips(4); if (phase === 4) setPips(5); if (phase === 6) claim(); if (phase === 0) before();
        }, 900);
      },
      stop() { window.clearInterval(timer); timer = 0; },
    };
  } }
  // Weekly progress (layer 2): this week's blue bars fill up over last week's, the totals count up.
  { const box = panelOf('weekly'); if (box) {
    const cols = [...box.querySelectorAll('.wk2__col:not(.is-future)')];
    let timers = []; let cancels = [];
    function reset() { cols.forEach((c) => { c.querySelector('.wk2__now').style.height = '0px'; c.classList.remove('is-shown'); }); box.querySelectorAll('b[data-v]').forEach((el) => { el.textContent = '0'; }); }
    demos.weekly = {
      start() {
        reset();
        cols.forEach((c, i) => timers.push(window.setTimeout(() => { const b = c.querySelector('.wk2__now'); b.style.height = `${b.dataset.h}px`; c.classList.add('is-shown'); }, RM ? 0 : 200 + i * 450)));
        timers.push(window.setTimeout(() => { cancels = [...box.querySelectorAll('b[data-v]')].map((el) => countUp(el, Number(el.dataset.v), 1400, (n) => { el.textContent = fmtPt(n); })); }, RM ? 0 : 1400));
      },
      stop() { timers.forEach((t) => window.clearTimeout(t)); timers = []; cancels.forEach((c) => c()); cancels = []; },
    };
  } }

  let visible = false; let running = '';
  function runDemoFor(k) {
    const holder = panels[k] && panels[k].querySelector('[data-demo]');
    const want = visible && holder ? holder.dataset.demo : '';
    if (want === running) return;
    if (running && demos[running]) demos[running].stop();
    running = want;
    if (running && demos[running]) demos[running].start();
  }

  // ---------- Dust pages ----------
  const stick = sec.querySelector('.feat__stick');
  const dust = createDust(stick, sec.querySelector('.feat__dust'), panels.map((p) => [...p.querySelectorAll('.feat__intro > *, .points, .feat__defs')]));
  const sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  // The app pages' 3D phone (features-3d.js): it stands in for the flat phone while it turns.
  const appPanels = panels.filter((p) => p.classList.contains('feat__panel--app'));
  const isApp = (k) => appPanels.includes(panels[k]);
  const appIdx = (k) => appPanels.indexOf(panels[k]);
  let phone3d = null;
  const placePhone3d = () => {
    const ph = appPanels[0] && appPanels[0].querySelector('.phone');
    if (!phone3d || !ph) return;
    const r = ph.getBoundingClientRect(); const sr = stick.getBoundingClientRect();
    phone3d.place({ left: r.left - sr.left, top: r.top - sr.top, width: r.width, height: r.height });
  };
  let current = -1;
  function paint(t) {
    const a = Math.floor(t + 1e-6); const b = Math.min(STEPS, a + 1); const u = b === a ? 0 : t - a;
    const phones = b !== a && isApp(a) && isApp(b);
    const turn = RM ? (u < 0.5 ? 0 : 1) : sm(0.1, 0.9, u); // between two app pages: half a turn, as on 10 Delivery
    const enter = b !== a && !isApp(a) && isApp(b) && !RM ? sm(0.4, 0.9, u) : -1; // onto the first app page: a quarter turn in from edge-on
    let turning3d = false;
    if (phone3d) {
      if (phones && turn > 0 && turn < 1) { phone3d.set(turn * Math.PI, -0.06 * Math.sin(turn * Math.PI), appIdx(a), appIdx(b)); turning3d = true; }
      else if (enter > 0 && enter < 1) { phone3d.set((enter - 1) * Math.PI / 2, -0.06 * Math.sin(enter * Math.PI), appIdx(b), appIdx(b)); turning3d = true; }
      phone3d.show(turning3d);
    }
    panels.forEach((p, i) => {
      let txt = 0; let gfx = 0;
      if (i === a) { txt = 1 - (RM ? sm(0.4, 0.5, u) : sm(WIN.outA, WIN.outB, u)); gfx = 1 - sm(0.05, 0.5, u); }
      if (i === b && b !== a) { txt = RM ? sm(0.5, 0.6, u) : sm(WIN.inA, WIN.inB, u); gfx = sm(0.4, 0.85, u); }
      // Between two phone pages the phone makes half a turn on its vertical axis, as on 10 Delivery
      // (same timing): the outgoing screen turns away to edge-on, then the next one comes round.
      // With WebGL the 3D phone does the turn and the flat phone shows only at rest; without it the
      // flat phone turns with a CSS rotation.
      const phone = p.querySelector('.phone');
      if (phones && (i === a || i === b)) {
        const out = i === a;
        const on = phone3d ? (out ? turn <= 0 : turn >= 1) : (out ? turn < 0.5 : turn >= 0.5);
        gfx = on ? 1 : 0;
        p.style.setProperty('--frame', on ? '1' : '0');
        if (phone) phone.style.transform = RM || phone3d ? '' : `perspective(1800px) rotateX(${(-3.4 * Math.sin(turn * Math.PI)).toFixed(2)}deg) rotateY(${((out ? turn : turn - 1) * 180).toFixed(2)}deg)`;
      } else if (phone3d && enter >= 0 && i === b) {
        gfx = enter >= 1 ? 1 : 0;
        p.style.setProperty('--frame', String(gfx));
        if (phone) phone.style.transform = '';
      } else {
        p.style.removeProperty('--frame');
        if (phone) phone.style.transform = '';
      }
      p.style.setProperty('--txt', txt.toFixed(3)); p.style.setProperty('--gfx', gfx.toFixed(3));
      p.style.visibility = txt > 0 || gfx > 0 ? 'visible' : 'hidden';
    });
    if (!RM) dust.draw(a, b, u);
    const k = Math.round(t);
    if (k !== current) {
      current = k;
      nav.forEach((btn, i) => btn.setAttribute('aria-current', String(i === k - 1))); // page 0 is the opening title
      sec.querySelectorAll('.tl__layer').forEach((layer) => layer.classList.toggle('is-on', layer.contains(nav[k - 1] || null)));
      panels.forEach((p, i) => p.toggleAttribute('inert', i !== k));
    }
    runDemoFor(k);
  }
  // Slow motion: one scroll step takes about 3.5 to 4 s, so the dust drifts rather than jumps.
  const follow = followScroll(sec, { steps: STEPS, reduced: RM, onFrame: paint, cruise: 0.3, acc: 0.7 });
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; paint(follow.t); }).observe(sec);
  // The rail jumps to a panel by scrolling to its step, so it works with the deck's snapping.
  nav.forEach((b, i) => b.addEventListener('click', () => {
    const top = sec.offsetTop + ((i + 1) / (STEPS + 0.6)) * (sec.offsetHeight - window.innerHeight);
    window.scrollTo({ top, behavior: RM ? 'auto' : 'smooth' });
  }));
  // Skip: straight to the section after this one.
  const skip = sec.querySelector('.feat__skip');
  if (skip) skip.addEventListener('click', () => window.scrollTo({ top: sec.offsetTop + sec.offsetHeight, behavior: 'auto' }));
  // The dust is sampled from the laid-out text, so it is rebuilt when layout, fonts or theme change.
  const rebuild = () => { dust.invalidate(); placePhone3d(); paint(follow.t); };
  window.addEventListener('resize', rebuild);
  if (document.fonts) document.fonts.ready.then(rebuild);
  new MutationObserver(rebuild).observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
  follow.sync();
  window.featuresAt = (v) => follow.jump(v); // debugging: show any point of the section
  if (appPanels.length && !RM) {
    import('/proto/features-3d.js?v=1')
      .then(({ makeFeatPhone3D }) => makeFeatPhone3D(stick, appPanels.map((p) => p.querySelector('.phone').dataset.screen)))
      .then((p) => { if (!p) return; phone3d = p; placePhone3d(); paint(follow.t); })
      .catch((e) => console.warn('Formats 3D phone unavailable, keeping the flat one', e));
  }
}
