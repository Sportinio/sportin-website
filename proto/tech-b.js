// 08 Technology (concept B): three stations take turns being live on one timeline.
// Commentary: a sound wave moved by the clip's loudness. Sportinho: the Signal sphere from
// SignalStack (signal-sphere.js), moved by his voice. Tracking: a route draws itself while pace,
// distance and time count. Loudness is measured from the clips ahead of time (30 frames a second),
// so the visuals move with sound off. A station's play button plays its clip: the cycle waits,
// that station goes live and follows the real playback, and the cycle resumes when it ends.
import { createSphereRenderer } from '/proto/signal-sphere.js?v=1';

const LEVELS = {"c":[0.042,0.066,0.181,0.405,0.515,0.471,0.394,0.359,0.502,0.638,0.519,0.354,0.309,0.297,0.241,0.292,0.499,0.51,0.3,0.216,0.258,0.381,0.556,0.501,0.242,0.06,0.017,0.254,0.587,0.536,0.386,0.414,0.455,0.454,0.37,0.226,0.238,0.392,0.457,0.464,0.366,0.154,0.061,0.111,0.37,0.706,0.72,0.557,0.386,0.175,0.095,0.134,0.153,0.376,0.575,0.315,0.225,0.457,0.388,0.191,0.184,0.351,0.596,0.672,0.593,0.529,0.44,0.267,0.104,0.102,0.141,0.071,0.014,0.012,0.009,0.007,0.006,0.005,0.004,0.002,0.012,0.267,0.583,0.429,0.168,0.16,0.257,0.478,0.591,0.395,0.208,0.208,0.269,0.36,0.487,0.545,0.483,0.443,0.459,0.48,0.5,0.418,0.352,0.47,0.512,0.311,0.106,0.044,0.046,0.045,0.222,0.562,0.633,0.453,0.34,0.322,0.303,0.214,0.09,0.021,0.049,0.121,0.152,0.133,0.081,0.024,0.002,0.001,0.001,0.003,0.044,0.21,0.547,0.78,0.665,0.47,0.334,0.2,0.168,0.222,0.25,0.223,0.139,0.044,0.005,0.004,0.005,0.007,0.038,0.199,0.348,0.383,0.597,0.829,0.755,0.552,0.353,0.159,0.289,0.661,0.626,0.335,0.244,0.389,0.625,0.738,0.782,0.731,0.536,0.348,0.186,0.092,0.209,0.49,0.575,0.376,0.215,0.204,0.182,0.138,0.226,0.342,0.304,0.207,0.134,0.061,0.013,0.002,0.002,0.001,0.001,0.001,0.001,0.001,0.021,0.171,0.419,0.446,0.265,0.242,0.391,0.452,0.316,0.131,0.075,0.227,0.514,0.593,0.43,0.267,0.122,0.156,0.411,0.511,0.346,0.155,0.067,0.074,0.081,0.042,0.011,0.002,0.001,0.001,0.001,0.0,0.0,0.208,0.617,0.69,0.402,0.205,0.224,0.307,0.283,0.207,0.394,0.689,0.626,0.453,0.395,0.263,0.102,0.078,0.185,0.379,0.591,0.605,0.44,0.311,0.269,0.225,0.124,0.037,0.018,0.024,0.026,0.028,0.165,0.518,0.617,0.327,0.375,0.713,0.62,0.376,0.457,0.551,0.473,0.414,0.354,0.275,0.416,0.664,0.662,0.451,0.238,0.106,0.054,0.062,0.075,0.092,0.188,0.243,0.207,0.374,0.641,0.645,0.566,0.575,0.469,0.378,0.562,0.648,0.474,0.382,0.422,0.428,0.357,0.311,0.314,0.321,0.279,0.158,0.047,0.251,0.607,0.495,0.158,0.084,0.122,0.128,0.326,0.688,0.768,0.583,0.423,0.336,0.369,0.54,0.641,0.561,0.423,0.365,0.413,0.44,0.407,0.322,0.211,0.162,0.227,0.475,0.677,0.606,0.488,0.354,0.172,0.221,0.512,0.683,0.563,0.429,0.47,0.489,0.407,0.362,0.418,0.393,0.2,0.175,0.405,0.55,0.464,0.309,0.196,0.147,0.306,0.56,0.515,0.253,0.106,0.241,0.546,0.643,0.607,0.582,0.359,0.134,0.113,0.185,0.33,0.418,0.459,0.556,0.552,0.447,0.406,0.39,0.301,0.153,0.041,0.009,0.009,0.01,0.009,0.007,0.005,0.004,0.003,0.003,0.003,0.002,0.103,0.326,0.445,0.425,0.427,0.401,0.408,0.605,0.69,0.499,0.355,0.336,0.24,0.085,0.06,0.201,0.359,0.431,0.504,0.553,0.459,0.332,0.303,0.324,0.333,0.386,0.518,0.601,0.527,0.301,0.174,0.189,0.1,0.039,0.206,0.451,0.539,0.495,0.37,0.177,0.088,0.252,0.556,0.588,0.318,0.108,0.083,0.299,0.565,0.521,0.329,0.235,0.193,0.17,0.176,0.153,0.074,0.016,0.005,0.007,0.007,0.005,0.004,0.004,0.003,0.004,0.004,0.084,0.337,0.508,0.344,0.118,0.082,0.2,0.457,0.738,0.731,0.491,0.446,0.592,0.734,0.733,0.47,0.239,0.227,0.321,0.546,0.73,0.552,0.244,0.203,0.451,0.606,0.39,0.138,0.057,0.083,0.357,0.567,0.481,0.491,0.483,0.388,0.355,0.296,0.236,0.242,0.361,0.601,0.69,0.52,0.421,0.416,0.371,0.358,0.372,0.317,0.233,0.198,0.157,0.081,0.064,0.081,0.143,0.372,0.597,0.661,0.603,0.493,0.395,0.248,0.098,0.184,0.558,0.756,0.5,0.199,0.088,0.166,0.499,0.721,0.586,0.424,0.382,0.37,0.382,0.396,0.396,0.373,0.307,0.21,0.093,0.019,0.007,0.007,0.006,0.005,0.005,0.004,0.004,0.003,0.161,0.455,0.495,0.273,0.09,0.235,0.623,0.617,0.457,0.564,0.528,0.423,0.402,0.281,0.147,0.127,0.165,0.266,0.429,0.493,0.447,0.3,0.111,0.035,0.049,0.305,0.644,0.538,0.238,0.102,0.048,0.042,0.075,0.253,0.519,0.557,0.366,0.18,0.079,0.038,0.028,0.239,0.541,0.504,0.355,0.31,0.281,0.268,0.235,0.193,0.152,0.082,0.019,0.001,0.001,0.001,0.001,0.0,0.0,0.001,0.081,0.411,0.772,0.835,0.69,0.44,0.251,0.231,0.189,0.12,0.166,0.176,0.076,0.029,0.038,0.045],"s":[0.0,0.0,0.0,0.0,0.0,0.0,0.002,0.067,0.207,0.294,0.438,0.712,0.765,0.521,0.264,0.114,0.043,0.01,0.001,0.0,0.005,0.144,0.374,0.419,0.331,0.269,0.359,0.622,0.724,0.587,0.386,0.257,0.298,0.419,0.484,0.441,0.348,0.344,0.566,0.78,0.713,0.576,0.494,0.428,0.432,0.475,0.447,0.352,0.429,0.62,0.634,0.532,0.529,0.649,0.635,0.455,0.309,0.252,0.295,0.464,0.606,0.547,0.44,0.385,0.273,0.161,0.155,0.282,0.409,0.364,0.239,0.148,0.093,0.06,0.025,0.003,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.072,0.308,0.593,0.719,0.605,0.452,0.554,0.717,0.659,0.545,0.479,0.384,0.237,0.101,0.043,0.037,0.242,0.617,0.666,0.527,0.601,0.668,0.48,0.181,0.025,0.059,0.292,0.615,0.732,0.618,0.423,0.21,0.116,0.193,0.317,0.42,0.452,0.378,0.287,0.26,0.359,0.498,0.528,0.554,0.595,0.569,0.506,0.414,0.382,0.389,0.399,0.468,0.512,0.452,0.319,0.208,0.12,0.069,0.172,0.351,0.428,0.373,0.23,0.097,0.05,0.049,0.108,0.401,0.734,0.676,0.433,0.398,0.495,0.487,0.398,0.484,0.693,0.71,0.572,0.482,0.493,0.546,0.581,0.592,0.537,0.497,0.511,0.395,0.214,0.186,0.184,0.093,0.124,0.312,0.392,0.317,0.194,0.166,0.242,0.211,0.119,0.153,0.359,0.547,0.527,0.451,0.443,0.406,0.323,0.265,0.235,0.32,0.485,0.454,0.256,0.123,0.127,0.161,0.122,0.08,0.13,0.216,0.22,0.164,0.089,0.024,0.002,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.003,0.142,0.458,0.651,0.62,0.525,0.407,0.353,0.463,0.603,0.586,0.442,0.306,0.241,0.277,0.443,0.716,0.892,0.834,0.621,0.335,0.11,0.027,0.008,0.001,0.0,0.0,0.0,0.0,0.0,0.008,0.123,0.384,0.644,0.691,0.554,0.561,0.7,0.659,0.395,0.146,0.053,0.04,0.035,0.044,0.191,0.442,0.564,0.582,0.573,0.51,0.487,0.532,0.536,0.496,0.411,0.302,0.245,0.318,0.512,0.54,0.307,0.139,0.244,0.443,0.541,0.52,0.398,0.239,0.098,0.032,0.11,0.426,0.719,0.677,0.573,0.53,0.406,0.249,0.147,0.266,0.582,0.694,0.527,0.51,0.591,0.489,0.447,0.552,0.574,0.413,0.194,0.076,0.085,0.151,0.322,0.638,0.88,0.893,0.621,0.329,0.395,0.567,0.567,0.457,0.342,0.276,0.201,0.18,0.316,0.474,0.498,0.416,0.284,0.153,0.07,0.03,0.009,0.001,0.0,0.0,0.0]};
const STATIONS = [ // seconds each station is live in the cycle, then a short rest before the next
  { key: 'c', dur: 20.95, audio: '/proto/media/tech/commentary.mp3' },
  { key: 's', dur: 11.3, audio: '/proto/media/tech/sportinho.mp3' },
  { key: 't', dur: 9 },
];
const GAP = 0.9;

const root = document.querySelector('.tb');
if (root) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cards = [...root.querySelectorAll('.st')];
  const total = STATIONS.reduce((a, s) => a + s.dur + GAP, 0);
  const level = (key, t) => { const a = LEVELS[key]; return a[Math.max(0, Math.min(a.length - 1, Math.floor(t * 30)))] || 0; };

  // ---- Commentary wave ----
  const wave = cards[0].querySelector('.st__wave'); const wctx = wave.getContext('2d');
  let phase = 0;
  function drawWave(amp) {
    const dpr = Math.min(2, window.devicePixelRatio || 1); const w = wave.clientWidth; const h = wave.clientHeight;
    if (wave.width !== Math.round(w * dpr)) { wave.width = Math.round(w * dpr); wave.height = Math.round(h * dpr); }
    wctx.setTransform(dpr, 0, 0, dpr, 0, 0); wctx.clearRect(0, 0, w, h);
    const mid = h / 2; const A = 4 + amp * h * 0.34;
    const layers = [{ f: 1.6, s: 1, a: 1, c: 'rgba(111,151,255,0.95)', lw: 2.4 }, { f: 2.3, s: -1.3, a: 0.7, c: 'rgba(157,183,255,0.6)', lw: 1.8 }, { f: 3.4, s: 1.8, a: 0.45, c: 'rgba(255,255,255,0.5)', lw: 1.2 }];
    layers.forEach((Ly) => {
      wctx.beginPath();
      for (let x = 0; x <= w; x += 3) {
        const u = x / w; const taper = Math.sin(Math.PI * u) ** 1.6;
        const y = mid + Math.sin(u * Math.PI * 2 * Ly.f + phase * Ly.s) * A * Ly.a * taper * (0.85 + 0.15 * Math.sin(phase * 0.7 + u * 9));
        if (x === 0) wctx.moveTo(x, y); else wctx.lineTo(x, y);
      }
      wctx.strokeStyle = Ly.c; wctx.lineWidth = Ly.lw; wctx.stroke();
    });
  }

  // ---- Sportinho sphere ----
  const sphere = cards[1].querySelector('.st__sphere'); let sphereFrame = null; let sphereSize = 0;
  const sphereIn = { level: 0, live: false };
  const read = () => ({ thinking: sphereIn.level, mode: 'voice', variant: 'voice-blue', activity: sphereIn.live ? 'speaking' : 'idle', speakingStyle: 'legacy', transitionSpeed: 'normal' });
  function fitSphere() {
    const b = sphere.parentElement.getBoundingClientRect(); const size = Math.round(Math.min(b.width, b.height));
    if (!size || size === sphereSize) return; sphereSize = size;
    sphere.style.width = sphere.style.height = `${size * 2}px`; sphereFrame = createSphereRenderer(sphere, size, read);
  }

  // ---- Tracking ----
  const route = cards[2].querySelector('.st__route'); const dot = cards[2].querySelector('.st__dot');
  const len = route.getTotalLength(); route.style.strokeDasharray = `${len} ${len}`;
  const paceEl = cards[2].querySelector('.st__pace'); const kmEl = cards[2].querySelector('.st__km'); const timeEl = cards[2].querySelector('.st__time');
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  function drawTrack(p, t) {
    route.style.strokeDashoffset = String(len * (1 - p)); const pt = route.getPointAtLength(len * p);
    dot.setAttribute('cx', pt.x.toFixed(1)); dot.setAttribute('cy', pt.y.toFixed(1));
    kmEl.textContent = (p * 1.2).toFixed(2); timeEl.textContent = fmt(p * 374); paceEl.textContent = fmt(312 + Math.round(2 * Math.sin(t * 1.3)));
  }

  // ---- Play buttons (commentary and Sportinho) ----
  const audios = STATIONS.map((s) => { if (!s.audio) return null; const a = new Audio(); a.preload = 'none'; a.src = s.audio; return a; }); // fetched on first play
  const buttons = cards.map((c) => c.querySelector('.st__play'));
  let manual = -1; // the station whose clip is playing, or -1 for the automatic cycle
  function stopManual() {
    if (manual < 0) return;
    audios[manual].pause(); buttons[manual].setAttribute('aria-pressed', 'false'); manual = -1;
  }
  buttons.forEach((btn, i) => {
    if (!btn) return;
    audios[i].addEventListener('ended', () => { if (manual === i) { audios[i].currentTime = 0; stopManual(); } });
    btn.addEventListener('click', () => {
      if (manual === i) { stopManual(); return; }
      stopManual();
      audios[i].play().then(() => { manual = i; btn.setAttribute('aria-pressed', 'true'); }).catch(() => {});
    });
  });

  // ---- Timeline ----
  let clock = 0; let last = 0; let raf = 0; let visible = true;
  function frame(now) {
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
    let live; let lt;
    if (manual >= 0) { live = manual; lt = audios[manual].currentTime; }
    else {
      clock = (clock + dt) % total; let t = clock; let i = 0;
      while (i < STATIONS.length - 1 && t > STATIONS[i].dur + GAP) { t -= STATIONS[i].dur + GAP; i += 1; }
      live = t <= STATIONS[i].dur ? i : -1; lt = Math.min(t, STATIONS[i].dur);
    }
    cards.forEach((c, k) => c.classList.toggle('is-live', k === live));
    phase += 0.045;
    drawWave(live === 0 ? level('c', lt) : 0.04);
    sphereIn.live = live === 1; sphereIn.level += ((live === 1 ? level('s', lt) : 0) - sphereIn.level) * 0.3;
    if (sphereFrame) sphereFrame();
    if (live === 2) drawTrack(lt / STATIONS[2].dur, lt); // otherwise the finished route stays until its next turn
    raf = requestAnimationFrame(frame);
  }
  fitSphere(); window.addEventListener('resize', fitSphere);
  drawTrack(0, 0);
  if (reduce) { drawWave(0.4); if (sphereFrame) sphereFrame(); drawTrack(1, 0); cards[0].classList.add('is-live'); }
  else {
    raf = requestAnimationFrame(frame);
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !visible) { visible = true; last = 0; raf = requestAnimationFrame(frame); }
      if (!en.isIntersecting && visible) { visible = false; cancelAnimationFrame(raf); stopManual(); }
    }, { threshold: 0.15 }).observe(root);
  }
}
