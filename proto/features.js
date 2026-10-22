// Competitions: the grey section after the engine. Scrolling down moves the panels sideways, one
// panel per scroll step, at the same eased pace as the 3D scenes (scroll-follow.js): League, then Conquer.
// Demos for other feature panels stay ready (guarded) in case those panels come back.
// Panel 1, Competitions, shows two formats that play themselves while the panel is on screen:
// a Champions League style cup walks through its stages, and a national league plays a matchday
// and updates its table.
import { followScroll } from '/proto/scroll-follow.js?v=1';

const sec = document.getElementById('features');
if (sec) {
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const track = sec.querySelector('.feat__track');
  const panels = [...sec.querySelectorAll('.feat__panel')];
  const nav = [...sec.querySelectorAll('.feat__nav button')];
  const STEPS = panels.length - 1;

  // ---------- Knockout bracket (built here to keep the markup short) ----------
  // Round of 16 (8 teams shown), quarter-finals (4), final (2), champion: data-stage 2, 3, 4.
  const svg = sec.querySelector('.cup__ko');
  if (svg) {
    const NS = 'http://www.w3.org/2000/svg';
    const el = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); parent.appendChild(n); return n; };
    const cols = [
      { x: 0, n: 8, stage: 2, label: 'Round of 16', names: ['Harbour Gym', 'Park Crew', 'North Runners', 'Bike Club', 'City Walkers', 'Office Team', 'Riverside', 'Team Blue'] },
      { x: 150, n: 4, stage: 3, label: 'Quarter-finals', names: ['Harbour Gym', 'North Runners', 'Office Team', 'Riverside'] },
      { x: 300, n: 2, stage: 4, label: 'Final', names: ['North Runners', 'Office Team'] },
    ];
    const TOP = 24; const H = 280; const BW = 118; const BH = 26;
    const ys = (n) => Array.from({ length: n }, (_, i) => TOP + (H / n) * (i + 0.5));
    cols.forEach((col) => { const l = el('text', { x: col.x, y: 10, class: 'lbl' }, svg); l.textContent = col.label; });
    { const l = el('text', { x: 450, y: 10, class: 'lbl' }, svg); l.textContent = 'Champion'; }
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
  const rail = sec.querySelector('.rail');
  const railItems = rail ? [...rail.querySelectorAll('li')] : [];
  const cupParts = [...sec.querySelectorAll('.cup [data-stage]')];
  let stage = 0;
  function showStage(s) {
    stage = s;
    railItems.forEach((li, i) => { li.classList.toggle('is-on', i === s); li.classList.toggle('is-done', i < s); });
    if (rail) rail.style.setProperty('--rp', String(s / (railItems.length - 1)));
    cupParts.forEach((p) => { const n = Number(p.dataset.stage); p.classList.toggle('is-on', n === s); p.classList.toggle('is-done', n < s); });
  }

  // ---------- National league format: a goal goes in, a team climbs the table ----------
  const live = sec.querySelector('.fix__row[data-live]');
  const rows = [...sec.querySelectorAll('.tbl__row[data-team]')];
  const climber = sec.querySelector('.tbl__row[data-climb]');
  const passed = sec.querySelector('.tbl__row[data-passed]');
  // A row's numbers (pos, P, W, D, L, Pts) before and after the goal, from data-before/data-after.
  const setRow = (row, vals) => { const cells = row.querySelectorAll('span'); const v = vals.split('|'); [0, 2, 3, 4, 5, 6].forEach((c, i) => { cells[c].textContent = v[i]; }); };
  function leagueBefore() {
    if (!live) return;
    live.classList.add('is-live'); live.querySelector('.fix__score').textContent = '1 – 1';
    rows.forEach((r) => { r.style.transform = ''; r.classList.remove('is-up'); });
    setRow(climber, climber.dataset.before); setRow(passed, passed.dataset.before);
  }
  function leagueAfter() {
    if (!live) return;
    live.querySelector('.fix__score').textContent = '2 – 1'; live.classList.remove('is-live');
    const h = climber.offsetTop - passed.offsetTop; // one row, including the gap
    climber.style.transform = `translateY(${-h}px)`; passed.style.transform = `translateY(${h}px)`;
    climber.classList.add('is-up');
    setRow(climber, climber.dataset.after); setRow(passed, passed.dataset.after);
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
        if (RM) { showStage(railItems.length - 1); return; }
        tick = 0; showStage(0);
        timer = window.setInterval(() => { tick += 1; showStage(tick % railItems.length); }, 1500);
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

  // Conquer (Game of Run): a runner crosses the map and claims hexes; a rival takes some back;
  // the territory shares update.
  { const box = panelOf('conquer'); const svgMap = box.querySelector('.hexmap-f'); const NS = 'http://www.w3.org/2000/svg';
    const COLORS = ['#0751fb', '#6f97ff', '#9aa3b5']; const FREE = '#e6e9ef';
    const COLS_H = 13; const ROWS_H = 7; const R = 20; const HW = Math.sqrt(3) * R;
    const hexes = [];
    for (let r = 0; r < ROWS_H; r++) for (let q = 0; q < COLS_H; q++) {
      const cx = HW * (q + 0.5 + (r % 2) * 0.5) + 4; const cy = R * 1.5 * r + R + 4;
      const pts = Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 180 * (60 * i - 30); return `${(cx + R * Math.cos(a)).toFixed(1)},${(cy + R * Math.sin(a)).toFixed(1)}`; }).join(' ');
      const poly = document.createElementNS(NS, 'polygon'); poly.setAttribute('points', pts); svgMap.appendChild(poly);
      hexes.push({ q, r, cx, cy, poly, owner: -1 });
    }
    svgMap.setAttribute('viewBox', `0 0 ${(HW * (COLS_H + 0.5) + 8).toFixed(0)} ${(R * 1.5 * (ROWS_H - 1) + 2 * R + 8).toFixed(0)}`);
    const runner = document.createElementNS(NS, 'circle'); runner.setAttribute('r', '7'); runner.setAttribute('class', 'runner'); svgMap.appendChild(runner);
    const terr = [...box.querySelectorAll('.terr li')];
    const at = (q, r) => hexes[r * COLS_H + q];
    // Start: three home areas. Then a fixed loop path for the runner (team 0) and a rival (team 1).
    const HOME = [[[1, 1], [2, 1], [1, 2], [2, 2], [1, 3]], [[10, 1], [11, 1], [10, 2], [11, 2], [11, 3]], [[5, 5], [6, 5], [7, 5], [6, 6], [5, 6]]];
    const PATH = [[2, 3], [3, 3], [4, 3], [5, 2], [6, 2], [7, 2], [8, 3], [8, 4], [7, 4], [6, 4], [5, 4], [4, 4], [3, 4], [3, 5], [4, 5]];
    const RIVAL = [[9, 2], [9, 3], [8, 2], [7, 3], [9, 4]];
    let timer = 0; let i = 0;
    function own(h, team) { h.owner = team; h.poly.setAttribute('fill', team < 0 ? FREE : COLORS[team]); }
    function shares() {
      const n = hexes.length; const counts = [0, 0, 0]; hexes.forEach((h) => { if (h.owner >= 0) counts[h.owner] += 1; });
      terr.forEach((li, k) => { const pct = Math.round((counts[k] / n) * 100); li.querySelector('.bar i').style.setProperty('--f', String(Math.min(1, pct / 30))); li.querySelector('em').textContent = `${pct}%`; });
    }
    function reset() {
      hexes.forEach((h) => own(h, -1)); HOME.forEach((cells, team) => cells.forEach(([q, r]) => own(at(q, r), team)));
      i = 0; const [q, r] = PATH[0]; runner.setAttribute('cx', at(q, r).cx); runner.setAttribute('cy', at(q, r).cy); shares();
    }
    function step() {
      if (i < PATH.length) { const [q, r] = PATH[i]; const h = at(q, r); own(h, 0); runner.setAttribute('cx', h.cx); runner.setAttribute('cy', h.cy); }
      if (i >= 6 && i - 6 < RIVAL.length) { const [q, r] = RIVAL[i - 6]; own(at(q, r), 1); }
      shares(); i += 1;
      if (i > PATH.length + 4) reset();
    }
    demos.conquer = {
      start() { reset(); if (RM) { while (i < PATH.length) step(); return; } timer = window.setInterval(step, 420); },
      stop() { window.clearInterval(timer); timer = 0; },
    }; }

  // Ranking (layer 2): the app's leaderboard. Steps tick up live; Sofia overtakes Emma, her trend
  // turns green, and the ranks re-number.
  { const box = panelOf('ranking'); if (box) {
    const lbRows = [...box.querySelectorAll('.lb')];
    const BASE = [0, 1, 2, 3, 4, 5, 6]; const SWAP = [0, 1, 3, 2, 4, 5, 6]; // slot per row before and after
    let timer = 0; let tick = 0;
    const setSlots = (slots) => lbRows.forEach((row, i) => { row.style.setProperty('--slot', String(slots[i])); row.querySelector('.lb__rank').textContent = String(slots[i] + 1); row.classList.toggle('is-first', slots[i] === 0); });
    const val = (row, n) => { const b = row.querySelector('.lb__val b'); b.textContent = fmtNum(n); };
    function before() {
      setSlots(BASE); lbRows.forEach((r) => { r.classList.remove('is-up'); val(r, Number(r.querySelector('.lb__val b').dataset.v)); });
      const t = lbRows[3].querySelector('.lb__val em'); t.className = 'down'; t.textContent = '↘11%';
    }
    function climb() {
      const sofia = lbRows[3]; sofia.classList.add('is-up'); val(sofia, 8120); setSlots(SWAP);
      const t = sofia.querySelector('.lb__val em'); t.className = 'up'; t.textContent = '↗39%';
    }
    demos.ranking = {
      start() {
        before(); if (RM) { climb(); return; }
        tick = 0; timer = window.setInterval(() => {
          tick += 1; const phase = tick % 8;
          // Live counting on every tick: small bumps on the top rows.
          lbRows.forEach((r, i) => { const b = r.querySelector('.lb__val b'); const n = Number(b.textContent.replace(/,/g, '')); if (i !== 3 || phase < 3) val(r, n + [24, 9, 7, 31, 4, 6, 3][i]); });
          if (phase === 3) climb();
          if (phase === 0) before();
        }, 900);
      },
      stop() { window.clearInterval(timer); timer = 0; },
    };
  } }
  // Weekly progress (layer 2): the bars grow day by day, the tiles count up.
  { const box = panelOf('weekly'); if (box) {
    const days = [...box.querySelectorAll('.wk__day:not(.is-next)')];
    let timers = []; let cancels = [];
    function reset() { days.forEach((d) => { d.style.setProperty('--h', '0'); d.classList.remove('is-shown'); d.querySelector('.wk__v').textContent = d.dataset.v; }); box.querySelectorAll('[data-v]').forEach((el) => { if (el.tagName === 'B') el.textContent = '0'; }); }
    demos.weekly = {
      start() {
        reset();
        days.forEach((d, i) => timers.push(window.setTimeout(() => { d.style.setProperty('--h', d.dataset.h); d.classList.add('is-shown'); }, RM ? 0 : 200 + i * 450)));
        timers.push(window.setTimeout(() => { cancels = [...box.querySelectorAll('b[data-v]')].map((el) => countUp(el, Number(el.dataset.v), 1400)); }, RM ? 0 : 1400));
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

  // ---------- Sideways scroll ----------
  let current = -1;
  function paint(t) {
    track.style.transform = `translateX(${(-t * 100).toFixed(3)}%)`;
    const k = Math.round(t);
    if (k !== current) {
      current = k;
      nav.forEach((b, i) => b.setAttribute('aria-current', String(i === k)));
      sec.querySelectorAll('.tl__layer').forEach((layer) => layer.classList.toggle('is-on', layer.contains(nav[k] || null)));
      panels.forEach((p, i) => p.toggleAttribute('inert', i !== k));
    }
    runDemoFor(k);
  }
  const follow = followScroll(sec, { steps: STEPS, reduced: RM, onFrame: paint });
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; paint(follow.t); }).observe(sec);
  // The rail jumps to a panel by scrolling to its step, so it works with the deck's snapping.
  nav.forEach((b, i) => b.addEventListener('click', () => {
    const top = sec.offsetTop + (i / (STEPS + 0.6)) * (sec.offsetHeight - window.innerHeight);
    window.scrollTo({ top, behavior: RM ? 'auto' : 'smooth' });
  }));
  window.addEventListener('resize', () => paint(follow.t));
  follow.sync();
}
