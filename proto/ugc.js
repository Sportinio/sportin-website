// Member content strip: the first card starts level with the heading, a button pauses the drift,
// and only videos that are on screen play (none while the page is away, none with reduced motion).
const ugc = document.getElementById('ugc');
if (ugc) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stage = ugc.querySelector('.ugc__stage'); const strip = ugc.querySelector('.ugc__strip'); const track = ugc.querySelector('.ugc__track'); const head = ugc.querySelector('.ugc__head');
  const DUR = 110; // seconds for one full loop, as in ugc.css

  // Start the loop so the first card lines up with the heading's left edge.
  function align() {
    const o = head.getBoundingClientRect().left - strip.getBoundingClientRect().left;
    const S = track.scrollWidth / 2 + 10;
    if (S > 0) track.style.animationDelay = `${-(((S - o) % S) / S) * DUR}s`;
  }
  if (!reduce) { align(); window.addEventListener('resize', align); }
  // The deck fits each page to the screen once fonts report ready, which can be before the web
  // fonts are applied; if this page was shrunk by that early measure, ask for one more fit.
  window.addEventListener('load', () => setTimeout(() => {
    const fit = ugc.querySelector(':scope > .slide__fit');
    if (fit && fit.style.transform && fit.style.transform !== 'none') window.dispatchEvent(new Event('resize'));
    else if (!reduce) align();
  }, 500));

  const pause = ugc.querySelector('.ugc__pause');
  if (pause) pause.addEventListener('click', () => {
    const on = stage.classList.toggle('is-paused');
    pause.setAttribute('aria-pressed', String(on)); pause.setAttribute('aria-label', on ? 'Play the templates' : 'Pause the templates');
    ugc.querySelectorAll('video').forEach((v) => { if (on) v.pause(); else if (v.dataset.seen === '1') v.play().catch(() => {}); });
  });

  let pageOn = false;
  const videos = [...ugc.querySelectorAll('video')];
  // Phones play only the video most in view, so the strip keeps a smooth frame rate.
  const narrow = window.matchMedia('(max-width: 700px)');
  const ratio = new Map();
  const best = () => { let top = null; let r = 0; ratio.forEach((v, el) => { if (v > r) { r = v; top = el; } }); return top; };
  const sync = (v) => { const want = pageOn && v.dataset.seen === '1' && !reduce && !stage.classList.contains('is-paused') && (!narrow.matches || v === best()); if (want) v.play().catch(() => {}); else v.pause(); };
  const seen = new IntersectionObserver((entries) => { entries.forEach((en) => { en.target.dataset.seen = en.isIntersecting ? '1' : '0'; ratio.set(en.target, en.intersectionRatio); }); videos.forEach(sync); }, { root: strip, threshold: [0, 0.25, 0.5, 0.75, 1] });
  videos.forEach((v) => seen.observe(v));
  new IntersectionObserver(([en]) => { pageOn = en.isIntersecting; ugc.classList.toggle('is-off', !pageOn); videos.forEach(sync); }, { threshold: 0.15 }).observe(ugc);
}
