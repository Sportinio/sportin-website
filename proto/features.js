// Features: the grey section after the engine. Scrolling down moves the panels sideways, one
// panel per scroll step, at the same eased pace as the 3D scenes (scroll-follow.js).
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
      { x: 0, n: 8, stage: 2, names: ['Harbour Gym', 'Park Crew', 'North Runners', 'Bike Club', 'City Walkers', 'Office Team', 'Riverside', 'Team Blue'] },
      { x: 100, n: 4, stage: 3, names: ['Harbour Gym', 'North Runners', 'Office Team', 'Riverside'] },
      { x: 200, n: 2, stage: 4, names: ['North Runners', 'Office Team'] },
    ];
    const H = 156; const BW = 78; const BH = 15;
    const ys = (n) => Array.from({ length: n }, (_, i) => (H / n) * (i + 0.5));
    cols.forEach((col, ci) => {
      const g = el('g', { 'data-stage': col.stage }, svg);
      const next = cols[ci + 1];
      ys(col.n).forEach((y, i) => {
        if (next) { const ny = ys(next.n)[Math.floor(i / 2)]; el('path', { d: `M${col.x + BW} ${y} H${col.x + BW + 6} V${ny} H${next.x}` }, g); }
        el('rect', { x: col.x, y: y - BH / 2, width: BW, height: BH, rx: 5 }, g);
        const tx = el('text', { x: col.x + 7, y: y + 3.3 }, g); tx.textContent = col.names[i];
      });
    });
    // Champion.
    const champ = el('g', { 'data-stage': 4, class: 'win' }, svg);
    const fy = ys(2);
    cols[2].names.forEach((_, i) => el('path', { d: `M${200 + BW} ${fy[i]} H${200 + BW + 6} V${H / 2} H${300}` }, champ));
    el('rect', { x: 300, y: H / 2 - 11, width: 86, height: 22, rx: 7 }, champ);
    const ct = el('text', { x: 309, y: H / 2 + 3.5 }, champ); ct.textContent = 'North Runners';
    svg.setAttribute('viewBox', `0 0 388 ${H}`);
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
    const h = climber.offsetHeight;
    climber.style.transform = `translateY(${-h}px)`; passed.style.transform = `translateY(${h}px)`;
    climber.classList.add('is-up');
    setRow(climber, climber.dataset.after); setRow(passed, passed.dataset.after);
  }

  // ---------- Run the demos only while Competitions is on screen ----------
  let visible = false; let timer = 0; let tick = 0;
  function startDemos() {
    if (timer) return;
    if (RM) { showStage(railItems.length - 1); leagueAfter(); return; }
    tick = 0; showStage(0); leagueBefore();
    timer = window.setInterval(() => {
      tick += 1;
      showStage(tick % railItems.length);
      if (tick % 5 === 2) leagueAfter();
      if (tick % 5 === 0) leagueBefore();
    }, 1400);
  }
  function stopDemos() { window.clearInterval(timer); timer = 0; }

  // ---------- Sideways scroll ----------
  let current = -1;
  function paint(t) {
    track.style.transform = `translateX(${(-t * 100).toFixed(3)}%)`;
    const k = Math.round(t);
    if (k !== current) {
      current = k;
      nav.forEach((b, i) => b.setAttribute('aria-current', String(i === k)));
      panels.forEach((p, i) => p.toggleAttribute('inert', i !== k));
    }
    if (visible && k === 0) startDemos(); else stopDemos();
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
