// Technology we own: each voice card runs the Signal sphere (signal-sphere.js, from SignalStack).
// Idle, it breathes in calm bands; while its clip plays it switches to the booking sphere's
// speaking waves, moved by the real audio level (Web Audio analyser). One clip plays at a time.
import { createSphereRenderer } from '/proto/signal-sphere.js?v=1';

const sec = document.getElementById('technology');
if (sec) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let actx = null;
  let current = null;
  const cards = [...sec.querySelectorAll('.tv-play')].map((btn) => {
    const canvas = btn.closest('.tech__card').querySelector('.tv__sphere');
    const card = { btn, canvas, audio: null, analyser: null, data: null, level: 0, playing: false, size: 0 };
    card.read = () => ({ thinking: card.level, mode: 'voice', variant: 'voice-blue', activity: card.playing ? 'speaking' : 'idle', speakingStyle: 'legacy', transitionSpeed: 'normal' });
    return card;
  });

  // The renderer's sphere fills 75% of its size; size it from the dark panel so the dots keep the
  // spacing they have in SignalStack (a small sphere packs its 68 x 136 grid into a blob).
  function fit() {
    // One size for both cards (their panels differ slightly when a title wraps).
    const size = Math.round(Math.min(...cards.map((c) => { const b = c.canvas.parentElement.getBoundingClientRect(); return Math.min(b.width, b.height); })) * 1.05);
    cards.forEach((card) => {
      if (!size || size === card.size) return;
      card.size = size; card.canvas.style.width = card.canvas.style.height = `${size * 2}px`;
      card.frame = createSphereRenderer(card.canvas, size, card.read);
    });
  }
  fit(); window.addEventListener('resize', fit);

  function levelOf(card) {
    if (!card.analyser) return 0;
    card.analyser.getByteTimeDomainData(card.data);
    let sum = 0; for (let i = 0; i < card.data.length; i++) { const v = (card.data[i] - 128) / 128; sum += v * v; }
    return Math.min(1, Math.sqrt(sum / card.data.length) * 3.2);
  }

  function stop(card) {
    if (!card || !card.audio) return;
    card.audio.pause(); card.playing = false;
    card.btn.classList.remove('is-playing'); card.btn.setAttribute('aria-pressed', 'false');
    if (current === card) current = null;
  }

  cards.forEach((card) => card.btn.addEventListener('click', () => {
    if (card.playing) { stop(card); return; }
    stop(current);
    if (!card.audio) {
      card.audio = new Audio(card.btn.dataset.audio);
      card.audio.addEventListener('ended', () => stop(card));
      try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        const src = actx.createMediaElementSource(card.audio);
        card.analyser = actx.createAnalyser(); card.analyser.fftSize = 1024;
        card.data = new Uint8Array(card.analyser.fftSize);
        src.connect(card.analyser); card.analyser.connect(actx.destination);
      } catch { card.analyser = null; }
    }
    if (actx && actx.state === 'suspended') actx.resume();
    card.audio.play().then(() => {
      card.playing = true; current = card;
      card.btn.classList.add('is-playing'); card.btn.setAttribute('aria-pressed', 'true');
    }).catch(() => stop(card));
  }));

  // Draw only while the page is on screen; one still frame with reduced motion.
  let raf = 0; let visible = false;
  function loop() {
    cards.forEach((card) => { const target = card.playing ? levelOf(card) : 0; card.level += (target - card.level) * 0.25; if (card.frame) card.frame(); });
    raf = requestAnimationFrame(loop);
  }
  if (reduce) cards.forEach((card) => card.frame && card.frame());
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (reduce) return;
    if (visible) fit();
    if (visible && !raf) loop();
    if (!visible) { cancelAnimationFrame(raf); raf = 0; stop(current); }
  }, { threshold: 0.1 }).observe(sec);
}
