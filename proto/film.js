// The SportIn product film. The hero's "Watch the film" button opens it full screen with sound
// (closes on the button, Escape or a click outside). The last page (14) plays it in place: the
// big play button starts it with sound and the video's own controls take over. Leaving that page,
// or opening the full-screen player, pauses it.
(() => {
  const modal = document.getElementById('filmModal');
  const mVideo = modal && modal.querySelector('video');
  const page = document.getElementById('film');
  const frame = page && page.querySelector('.film__frame');
  const pVideo = frame && frame.querySelector('video');

  function pausePage() { if (pVideo && !pVideo.paused) pVideo.pause(); }
  if (modal && mVideo) {
    const close = () => { mVideo.pause(); if (modal.open) modal.close(); };
    document.querySelectorAll('[data-film]').forEach((b) => b.addEventListener('click', () => {
      pausePage();
      modal.showModal();
      mVideo.muted = false; mVideo.currentTime = mVideo.currentTime || 0;
      mVideo.play().catch(() => {}); // a click started it, so it may play with sound
    }));
    modal.querySelector('.film-modal__close').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); }); // the dark area around the film
    modal.addEventListener('close', () => mVideo.pause()); // Escape closes the dialog too
  }

  if (frame && pVideo) {
    const btn = frame.querySelector('.film__play');
    btn.addEventListener('click', () => {
      frame.classList.add('is-playing'); pVideo.controls = true;
      pVideo.play().catch(() => { frame.classList.remove('is-playing'); pVideo.controls = false; });
    });
    pVideo.addEventListener('ended', () => { frame.classList.remove('is-playing'); pVideo.controls = false; });
    new IntersectionObserver(([en]) => { if (!en.isIntersecting) pausePage(); }, { threshold: 0.25 }).observe(page);
  }
})();
