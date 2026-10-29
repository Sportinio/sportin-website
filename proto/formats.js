// 05 The games: four small live cards. Each one plays on its own loop while the page is on screen
// and stops when it leaves. The HTML holds a finished frame, so the page reads without this script
// (and with reduced motion, nothing moves).
(() => {
  const sec = document.getElementById('formats');
  if (!sec) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (n) => Math.floor(Math.random() * n);
  const fmt1 = (v) => v.toFixed(1);
  const loops = [];
  const every = (ms, fn) => loops.push({ ms, fn, id: 0 });

  // Derby week: the movement index scores nudge up or down; the bar follows the share.
  const derby = sec.querySelector('.derby');
  if (derby) {
    const A = derby.querySelector('[data-a]'); const B = derby.querySelector('[data-b]'); const bar = derby.querySelector('.derby__bar i');
    let a = 5.4; let b = 4.9;
    const bump = (el) => { el.classList.add('is-up'); setTimeout(() => el.classList.remove('is-up'), 420); };
    every(1700, () => {
      const club = Math.random() < 0.55;
      if (club) { a = Math.min(6.2, a + 0.1); bump(A); } else { b = Math.min(6.2, b + 0.1); bump(B); }
      if (a + b > 11) { a -= 0.1; b -= 0.1; } // keep both in the everyday range
      A.textContent = fmt1(a); B.textContent = fmt1(b);
      bar.style.setProperty('--a', (a / (a + b)).toFixed(3));
    });
  }

  // Conquer the city: the runner loops through the streets and turns each one club red;
  // after every lap the rival takes a few back, so the map never settles.
  const city = sec.querySelector('.city');
  if (city) {
    const cells = [...city.querySelectorAll('.city__c')]; const run = city.querySelector('.city__run');
    const N = 8; const at = (r, c) => cells[r * N + c];
    const path = [];
    for (let c = 1; c <= 6; c++) path.push([2, c]);
    for (let r = 3; r <= 5; r++) path.push([r, 6]);
    for (let c = 5; c >= 1; c--) path.push([5, c]);
    path.push([4, 1], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [4, 5], [4, 4], [4, 3], [4, 2]);
    let k = 0;
    every(320, () => {
      const [r, c] = path[k];
      run.setAttribute('cx', c * 20 + 10); run.setAttribute('cy', r * 20 + 10);
      at(r, c).dataset.o = '1';
      k = (k + 1) % path.length;
      if (k === 0) {
        const ours = cells.filter((el) => el.dataset.o === '1');
        for (let n = 0; n < 6 && ours.length; n++) ours.splice(rnd(ours.length), 1)[0].dataset.o = '2';
      }
    });
  }

  // Supporters' clubs: one club's score moves, the rows re-sort and slide into place.
  const tbl = sec.querySelector('.tbl');
  if (tbl) {
    const rows = [...tbl.children].map((li) => ({ li, s: Number(li.dataset.s), n: li.querySelector('.tbl__n'), b: li.querySelector('b') }));
    const place = () => {
      [...rows].sort((p, q) => q.s - p.s).forEach((row, r) => {
        row.li.style.setProperty('--r', r); row.n.textContent = String(r + 1); row.li.classList.toggle('is-top', r === 0);
      });
    };
    place();
    every(2400, () => {
      const row = rows[rnd(rows.length)];
      row.s = Math.max(4.6, Math.min(6.6, row.s + (Math.random() < 0.6 ? 0.4 : -0.3)));
      row.b.textContent = fmt1(row.s);
      place();
    });
  }

  // Walk to the stadium: steps climb to the goal while the kick-off clock counts down.
  const walk = sec.querySelector('.walk');
  if (walk) {
    const fill = walk.querySelector('.walk__fill'); const steps = walk.querySelector('.walk__steps b'); const ko = walk.querySelector('.walk__ko b');
    const GOAL = 8000; let s = 6820; let hold = 0; let left = 2 * 3600 + 14 * 60 + 9;
    const pad = (v) => String(v).padStart(2, '0');
    every(260, () => {
      if (hold > 0) { hold -= 1; if (hold === 0) s = 6120; } else { s = Math.min(GOAL, s + 31 + rnd(14)); if (s === GOAL) hold = 9; }
      steps.textContent = s.toLocaleString('en-US');
      fill.style.setProperty('--p', (s / GOAL).toFixed(3));
    });
    every(1000, () => {
      left = left > 0 ? left - 1 : 2 * 3600 + 14 * 60 + 9;
      ko.textContent = `${pad(Math.floor(left / 3600))}:${pad(Math.floor(left / 60) % 60)}:${pad(left % 60)}`;
    });
  }

  const start = () => loops.forEach((l) => { if (!l.id) l.id = setInterval(l.fn, l.ms); });
  const stop = () => loops.forEach((l) => { clearInterval(l.id); l.id = 0; });
  window.whenShown(sec, { on: () => { sec.classList.add('is-in'); if (!reduced) start(); }, off: stop });
})();
