// Evidence page: when the page arrives, the three numbers count up and Deloitte's bars grow.
// The final numbers are in the HTML, so the page reads correctly without this script.
(() => {
  const sec = document.getElementById('evidence');
  if (!sec) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const counts = [...sec.querySelectorAll('.ev__count')];
  const ease = (u) => 1 - (1 - u) ** 3;
  function run() {
    sec.classList.add('is-counted');
    if (reduced) return;
    const t0 = performance.now();
    const tick = (now) => {
      const u = Math.min(1, (now - t0) / 1100);
      counts.forEach((c) => { c.textContent = String(Math.round(Number(c.dataset.to) * ease(u))); });
      if (u < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  new IntersectionObserver((entries, io) => {
    if (entries[0].isIntersecting) { run(); io.disconnect(); }
  }, { threshold: 0.5 }).observe(sec);
})();
