// Deck mockup.
// Scrolling (every screen): every section is one full-screen page and the browser's own scroll snap
// lands on exactly one page at a time. Nothing intercepts the wheel, so the page always moves
// with your fingers. Scroll scenes keep their steps as snap points: the problem's four stages,
// the three belief panels, and the start and end of the sentence. Content taller than a page is
// scaled to fit; the two fullest sections are split into two pages.
// Present (button, bottom left): one slide at a time with arrow keys or a clicker. Esc exits.
(() => {
  // Present mode needs a keyboard or clicker, so it is offered only with a mouse on a wide screen.
  const presentable = window.matchMedia('(min-width: 900px) and (pointer: fine)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const main = document.querySelector('main');

  // ---------- Split the fullest sections into two pages ----------
  const games = document.getElementById('games');
  if (games) {
    const more = document.createElement('section');
    more.className = games.className; more.id = 'games-more'; more.setAttribute('aria-label', 'More games');
    more.innerHTML = '<div class="wrap"><div class="games"></div></div>';
    games.querySelectorAll('.game--season, .game--medals').forEach((c) => more.querySelector('.games').appendChild(c));
    games.after(more);
  }
  const revenue = document.getElementById('revenue');
  const split = revenue && revenue.querySelector('.block__split');
  if (split) {
    const impact = document.createElement('section');
    impact.className = revenue.className; impact.id = 'impact'; impact.setAttribute('aria-label', 'Impact you can measure');
    [...split.children].forEach((c) => impact.appendChild(c));
    split.remove(); revenue.after(impact);
  }

  // ---------- Pages and scenes ----------
  const scenes = ['belief', 'what'];
  // Scroll scenes (the 3D engine, the sideways features) have their own pinned stage; they are
  // never wrapped or scaled.
  const all = [...document.querySelectorAll('main > section, main > .problem-pin > section, body > footer')].filter((s) => !s.classList.contains('engine') && !s.hasAttribute('data-steps'));
  const pages = all.filter((s) => !scenes.includes(s.id));
  all.forEach((s) => {
    const fit = document.createElement('div'); fit.className = 'slide__fit';
    [...s.children].filter((c) => !['absolute', 'fixed'].includes(getComputedStyle(c).position)).forEach((c) => fit.appendChild(c));
    s.appendChild(fit);
  });
  pages.forEach((s) => s.classList.add('page'));
  root.classList.add('is-full');

  function fitOne(s) {
    const fit = s.querySelector(':scope > .slide__fit'); if (!fit) return;
    fit.style.transform = 'none';
    const cs = getComputedStyle(s);
    const avail = s.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const k = Math.min(1, avail / fit.scrollHeight);
    fit.style.transform = k < 1 ? `scale(${k.toFixed(4)})` : 'none';
  }

  // Snap points for the problem's stages, one per scroll step.
  const pin = document.getElementById('problemPin');
  const marks = [0, 1, 2, 3].map(() => { const m = document.createElement('i'); m.className = 'snap-mark'; m.setAttribute('aria-hidden', 'true'); pin && pin.appendChild(m); return m; });
  // The sentence: snap at its start and once every word is lit.
  const what = document.getElementById('what');
  if (what) { const end = document.createElement('i'); end.className = 'snap-mark snap-mark--end'; end.setAttribute('aria-hidden', 'true'); what.appendChild(end); }

  // The 3D scroll scenes: one snap point per step (t = 0..steps over steps + 0.6 parts of the
  // scroll), so each scroll gesture moves the scene exactly one step. A scene in chapters (the
  // engine) has one snap point per chapter instead, evenly spread, and plays each by itself.
  const scenes3d = [...document.querySelectorAll('section[data-steps], section#engine')].map((sec) => {
    const steps = Number(sec.dataset.steps || 6);
    const chapters = sec.dataset.chapters ? sec.dataset.chapters.split(',').length : 0;
    const marks = Array.from({ length: chapters || steps + 1 }, () => { const m = document.createElement('i'); m.className = 'snap-mark'; m.setAttribute('aria-hidden', 'true'); sec.appendChild(m); return m; });
    return { sec, steps, chapters, marks };
  });

  function layout() {
    if (root.classList.contains('is-deck')) return;
    pages.forEach(fitOne);
    if (window.problemMeasure) window.problemMeasure();
    // The last step's mark sits at the very end of the scene, so leaving it takes one screen of
    // scroll, the same as between any two pages (otherwise a phone swipe springs back there).
    scenes3d.forEach(({ sec, steps, chapters, marks }) => { const span = sec.offsetHeight - window.innerHeight; marks.forEach((m, k) => { m.style.top = `${chapters ? Math.round((k / Math.max(1, chapters - 1)) * span) : k === steps ? span : Math.round((k / (steps + 0.6)) * span)}px`; }); });
    const seg = Math.max(360, window.innerHeight * 0.7);
    marks.forEach((m, k) => { m.style.top = `${k * seg + (k ? 2 : 0)}px`; });
  }

  // ---------- Present mode ----------
  layout();
  window.addEventListener('load', layout);
  if (document.fonts) document.fonts.ready.then(layout);
  if (!presentable) { window.addEventListener('resize', layout); return; }
  const bar = document.createElement('div'); bar.className = 'deck-bar';
  bar.innerHTML = '<button class="deck-btn deck-btn--present" type="button"><span class="deck-btn__play" aria-hidden="true"></span>Present</button>'
    + '<span class="deck-count" aria-hidden="true"><span class="deck-count__n"></span><span class="deck-count__bar"><i></i></span></span>'
    + '<span class="deck-hint">Use the arrow keys</span>'
    + '<button class="deck-btn deck-btn--ghost deck-btn--exit" type="button">Exit (Esc)</button>';
  document.body.appendChild(bar);
  // Present button in the nav, next to the light/dark switch.
  const navBtn = document.createElement('button'); navBtn.type = 'button'; navBtn.className = 'deck-nav-btn';
  navBtn.innerHTML = '<span class="deck-btn__play" aria-hidden="true"></span>Present';
  const toggle = document.getElementById('themeToggle'); if (toggle) toggle.before(navBtn);
  const pad = (n) => String(n).padStart(2, '0');

  let on = false; let cur = 0; let sub = 0;
  const stepsOf = (s) => (window.deckEffects && window.deckEffects.steps && window.deckEffects.steps[s.id]) || (s.id === 'problem' ? 4 : s.id === 'belief' ? 3 : 1);

  function setBelief(step) {
    document.querySelectorAll('.belief__panel').forEach((p, n) => p.classList.toggle('is-shown', n === step));
    const track = document.getElementById('track'); if (!track) return;
    const lane = (sel, l) => track.querySelector(`${sel}[data-lane="${l}"]`);
    [0, 1, 2].forEach((l) => {
      const prog = lane('.track__progress', l); const len = prog.getTotalLength();
      prog.style.strokeDasharray = len; prog.style.strokeDashoffset = l <= step ? 0 : len;
      prog.classList.toggle('is-done', l < step); prog.classList.toggle('is-active', l === step);
      lane('.track__lane', l).classList.toggle('is-active', l === step);
      lane('.track__label', l).classList.toggle('is-active', l === step);
    });
    const end = lane('.track__progress', step); const pt = end.getPointAtLength(end.getTotalLength() * 0.999);
    const runner = document.getElementById('trackRunner'); runner.setAttribute('cx', pt.x); runner.setAttribute('cy', pt.y);
    document.getElementById('trackCore').textContent = ['Why', 'How', 'What'][step];
  }
  let probTween = 0;
  function setProblem(step) {
    cancelAnimationFrame(probTween);
    const from = typeof window.problemStep === 'number' ? window.problemStep : 0; const t0 = performance.now(); const dur = reduced ? 1 : 900;
    const tick = (now) => {
      const u = Math.min(1, (now - t0) / dur);
      window.problemStep = from + (step - from) * u;
      if (window.problemRedraw) window.problemRedraw();
      if (u < 1) probTween = requestAnimationFrame(tick);
    };
    probTween = requestAnimationFrame(tick);
  }

  function show(k, step) {
    k = Math.max(0, Math.min(all.length - 1, k));
    if (k !== cur) document.querySelectorAll('.sentence__w').forEach((w) => w.classList.remove('is-lit'));
    all.forEach((s, n) => { s.classList.toggle('is-current', n === k); s.classList.toggle('is-before', n < k); s.toggleAttribute('inert', n !== k); });
    const prev = cur >= 0 ? all[cur] : null;
    cur = k; sub = step;
    const s = all[k];
    // Optional page effects (the jelly mockup) hear about slide changes.
    if (window.deckEffects && (!prev || prev !== s)) window.deckEffects.onSlide(s.id, prev && prev.id);
    if (s.id === 'problem') setProblem(Math.min(step, 3));
    if (s.id === 'belief') setBelief(step);
    if (window.deckEffects && window.deckEffects.onStep) window.deckEffects.onStep(s.id, step);
    if (s.id === 'what') document.querySelectorAll('.sentence__w').forEach((w, n) => setTimeout(() => w.classList.add('is-lit'), reduced ? 0 : 150 + n * 60));
    bar.querySelector('.deck-count__n').textContent = `${pad(k + 1)} / ${pad(all.length)}`;
    bar.querySelector('i').style.setProperty('--p', String((k + 1) / all.length));
  }
  function step(dir) {
    const n = stepsOf(all[cur]);
    if (dir > 0) { if (sub < n - 1) show(cur, sub + 1); else if (cur < all.length - 1) show(cur + 1, 0); } else if (sub > 0) show(cur, sub - 1); else if (cur > 0) show(cur - 1, stepsOf(all[cur - 1]) - 1);
  }

  function enter() {
    if (on) return; on = true;
    const mid = window.innerHeight / 2; let start = 0;
    // Start on the slide that covers the middle of the screen.
    all.forEach((s, n) => { const r = s.getBoundingClientRect(); if (r.top <= mid && r.bottom >= mid) start = n; });
    root.classList.remove('is-full'); root.classList.add('is-deck');
    all.forEach((s) => s.classList.add('slide'));
    window.problemStep = 0;
    all.forEach(fitOne);
    if (window.problemMeasure) window.problemMeasure();
    cur = -1; show(start, 0);
    if (root.requestFullscreen && !document.fullscreenElement) root.requestFullscreen().catch(() => {});
  }
  function exit() {
    if (!on) return; on = false;
    const back = all[cur]; const backSub = sub;
    all.forEach((s) => { s.classList.remove('slide', 'is-current', 'is-before'); s.removeAttribute('inert'); });
    document.querySelectorAll('.belief__panel').forEach((p) => p.classList.remove('is-shown'));
    scenes.forEach((id) => { const f = document.querySelector(`#${id} > .slide__fit`); if (f) f.style.transform = 'none'; });
    root.classList.remove('is-deck'); root.classList.add('is-full');
    if (window.deckEffects) window.deckEffects.onExit();
    delete window.problemStep;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    requestAnimationFrame(() => {
      layout();
      const target = back.id === 'problem' ? (marks[backSub] || document.querySelector('.jelly-end') || marks[3]) : back.id === 'belief' ? document.querySelectorAll('.belief__panel')[backSub] : back;
      target.scrollIntoView({ block: back.id === 'belief' ? 'center' : 'start', behavior: 'instant' });
      window.dispatchEvent(new Event('scroll'));
    });
  }

  bar.querySelector('.deck-btn--present').addEventListener('click', enter);
  navBtn.addEventListener('click', enter);
  bar.querySelector('.deck-btn--exit').addEventListener('click', exit);
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && on) exit(); });
  window.addEventListener('keydown', (e) => {
    if (!on || (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]'))) return;
    const fwd = ['ArrowDown', 'ArrowRight', 'PageDown'].includes(e.key) || (e.key === ' ' && !e.shiftKey);
    const bwd = ['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key) || (e.key === ' ' && e.shiftKey);
    if (e.key === 'Escape') exit(); else if (e.key === 'Home') { e.preventDefault(); show(0, 0); } else if (e.key === 'End') { e.preventDefault(); show(all.length - 1, 0); } else if (fwd || bwd) { e.preventDefault(); step(fwd ? 1 : -1); }
  });
  window.addEventListener('wheel', (e) => { if (on) e.preventDefault(); }, { passive: false });
  window.addEventListener('resize', () => { if (on) { all.forEach(fitOne); if (window.problemMeasure) window.problemMeasure(); } else layout(); });

})();
