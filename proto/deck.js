// Deck mockup.
// Scrolling (desktop): every section is one full-screen page and the browser's own scroll snap
// lands on exactly one page at a time. Nothing intercepts the wheel, so the page always moves
// with your fingers. Scroll scenes keep their steps as snap points: the problem's four stages,
// the three belief panels, and the start and end of the sentence. Content taller than a page is
// scaled to fit; the two fullest sections are split into two pages.
// Present (in the nav) is the voiced pitch: proto/pitch/pitch.js.
(() => {
  const desktop = window.matchMedia('(min-width: 900px) and (pointer: fine)');
  if (!desktop.matches) return;
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
  // scroll), so each scroll gesture moves the scene exactly one step.
  const scenes3d = [...document.querySelectorAll('section[data-steps], section#engine')].map((sec) => {
    const steps = Number(sec.dataset.steps || 6);
    const marks = Array.from({ length: steps + 1 }, () => { const m = document.createElement('i'); m.className = 'snap-mark'; m.setAttribute('aria-hidden', 'true'); sec.appendChild(m); return m; });
    return { sec, steps, marks };
  });

  function layout() {
    if (root.classList.contains('is-deck')) return;
    pages.forEach(fitOne);
    if (window.problemMeasure) window.problemMeasure();
    scenes3d.forEach(({ sec, steps, marks }) => { const span = sec.offsetHeight - window.innerHeight; marks.forEach((m, k) => { m.style.top = `${Math.round((k / (steps + 0.6)) * span)}px`; }); });
    const seg = Math.max(360, window.innerHeight * 0.7);
    marks.forEach((m, k) => { m.style.top = `${k * seg + (k ? 2 : 0)}px`; });
  }

  window.addEventListener('resize', layout);

  layout();
  window.addEventListener('load', layout);
  if (document.fonts) document.fonts.ready.then(layout);
})();
