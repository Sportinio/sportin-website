// Member content strip: pause the drift and the video while the page is off screen, so nothing
// runs where nobody can see it.
const ugc = document.getElementById('ugc');
if (ugc) {
  const videos = [...ugc.querySelectorAll('video')];
  new IntersectionObserver(([en]) => {
    ugc.classList.toggle('is-off', !en.isIntersecting);
    videos.forEach((v) => { if (en.isIntersecting) v.play().catch(() => {}); else v.pause(); });
  }, { threshold: 0.15 }).observe(ugc);
}
