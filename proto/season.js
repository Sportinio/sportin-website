// 11 The season: when the page comes on screen, the bars rise and the line draws (season.css).
// It plays once; the finished chart is what the HTML shows without this script.
(() => {
  const sec = document.getElementById('season');
  if (!sec) return;
  new IntersectionObserver(([en], io) => {
    if (en.isIntersecting) { sec.classList.add('is-in'); io.disconnect(); }
  }, { threshold: 0.4 }).observe(sec);
})();
