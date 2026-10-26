// 05 The two formats, League and Conquer: both videos wait on their poster with a big play button.
// Play starts one with sound and pauses the other; a click on the playing video pauses it. When
// the page leaves the screen both pause.
(() => {
  const sec = document.getElementById('formats');
  if (!sec) return;
  const cards = [...sec.querySelectorAll('.fmtv')].map((card) => ({ card, video: card.querySelector('video'), btn: card.querySelector('.fmtv__play') }));
  const pause = (c) => { c.video.pause(); c.card.classList.remove('is-playing'); };
  const play = (c) => { cards.forEach((o) => { if (o !== c) pause(o); }); c.card.classList.add('is-playing'); c.video.play().catch(() => pause(c)); };
  cards.forEach((c) => {
    c.btn.addEventListener('click', () => play(c));
    c.video.addEventListener('click', () => (c.video.paused ? play(c) : pause(c)));
    c.video.addEventListener('ended', () => pause(c));
  });
  new IntersectionObserver(([en]) => { if (!en.isIntersecting) cards.forEach(pause); }, { threshold: 0.2 }).observe(sec);
})();
