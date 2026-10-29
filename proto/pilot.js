// 15 Get started: when the pilot plan comes on screen, its eight weeks fill in order (pilot.css).
// It plays once; without this script the plan shows filled.
(() => {
  const plan = document.querySelector('#demo .plt');
  if (!plan) return;
  window.whenShown(plan, { slide: document.getElementById('demo'), threshold: 0.6, on: () => plan.classList.add('is-filled') });
})();
