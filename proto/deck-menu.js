// The deck's menu: Problem, Solution, Integration, Games, Revenue. Integration is a step inside the
// engine's scroll scene (data-int-from), so each link scrolls to its section, or to a step of a
// scroll scene the way deck.js places its snap marks: step k sits at k / (steps + 0.6) of the
// scene's scroll span. The link for what is on screen is underlined.
(() => {
  const links = [...document.querySelectorAll('.nav__link[data-go]')];
  if (!links.length) return;
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const topOf = (el) => el.getBoundingClientRect().top + window.scrollY;
  function target(a) {
    const sec = document.getElementById(a.dataset.go);
    if (!sec) return null;
    const step = Number(a.dataset.step || 0);
    // A pinned section (the problem, inside .problem-pin) starts where its scroll track starts.
    if (!step) return topOf(sec.closest('.problem-pin') || sec);
    const steps = Number(sec.dataset.steps || 0);
    const span = sec.offsetHeight - window.innerHeight;
    return topOf(sec) + (step / (steps + 0.6)) * span;
  }
  links.forEach((a) => a.addEventListener('click', (e) => {
    const top = target(a);
    if (top == null) return;
    e.preventDefault();
    window.scrollTo({ top: Math.round(top), behavior: RM ? 'auto' : 'smooth' });
    // Scroll scenes ease towards the scroll slowly; once there, show the chosen step at once
    // instead of playing every step on the way.
    const step = Number(a.dataset.step || 0);
    let done = false;
    const land = () => {
      if (done) return; done = true;
      if (a.dataset.go === 'engine') {
        const from = Number((document.getElementById('engine') || {}).dataset?.intFrom || 0);
        if (window.engineAt) window.engineAt(step);
        if (window.integrateAt && from) window.integrateAt(step - from);
      }
      if (a.dataset.go === 'features' && window.featuresAt) window.featuresAt(step);
    };
    window.addEventListener('scrollend', land, { once: true });
    setTimeout(land, 1400);
  }));

  // Underline the last link whose place is at or above the middle of the screen, while the reader
  // is still within the menu's sections (Problem to the end of Revenue).
  const last = document.getElementById('pay');
  function mark() {
    const y = window.scrollY + window.innerHeight * 0.5;
    let on = null;
    links.forEach((a) => { const t = target(a); if (t != null && t <= y) on = a; });
    if (last && y > topOf(last) + last.offsetHeight) on = null;
    links.forEach((a) => a.classList.toggle('is-active', a === on));
  }
  let queued = false;
  window.addEventListener('scroll', () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; mark(); }); }, { passive: true });
  window.addEventListener('resize', mark);
  window.addEventListener('load', mark);
  mark();
})();
