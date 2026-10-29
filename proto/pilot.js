// 15 Get started: when the pilot plan comes on screen, its eight weeks fill in order (pilot.css).
// It plays once; without this script the plan shows filled.
(() => {
  const plan = document.querySelector('#demo .plt');
  if (!plan) return;
  new IntersectionObserver(([en], io) => {
    if (en.isIntersecting) { plan.classList.add('is-in'); io.disconnect(); }
  }, { threshold: 0.6 }).observe(plan);
})();
