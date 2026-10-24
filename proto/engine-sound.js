// Sound for the engine scene, synthesized in the browser (no audio files). Each moment has its
// own character:
// - Competitions: the knockout builds with small gadget blips and data chirps, the champion
//   gets a confirm tone.
// - Challenges: a loading sound. Ticks climb in pitch as the ring fills, then a done chime.
// - Switching layer (the flips): a tech swoosh with a fast digital arpeggio.
// - Connected: the layers unfold with a falling arpeggio, each link locks with a data blip and a
//   pulse runs down.
// - Building the chip: a power-up riser, a bass impact with a bright chord as the layers lock,
//   then a shimmer as the chip stands and a two-tone "ready" chime.
// Each cue fires when the scene crosses a point on its timeline, in either direction. Browsers
// only allow sound after a click, so it starts from the sound button, off by default.

// [timeline point, cue, argument]. Points match the choreography windows in engine3d.js.
const LOADING_TICKS = 16; // over rp 1.3..2.0
const CUES = [
  [0.4, 'gadget', 4], [0.55, 'chirp', 0], [0.68, 'gadget', 2], [0.78, 'chirp', 1], [0.88, 'champion', 0],
  ...Array.from({ length: LOADING_TICKS }, (_, i) => [1.3 + ((i + 0.5) / LOADING_TICKS) * 0.68, 'load', i]),
  [1.99, 'loaded', 0],
  [2.05, 'layer', 0], [3.05, 'layer', 1],
  [4.05, 'unfold', 0], [4.7, 'link', 0], [4.82, 'link', 1], [4.86, 'pulse', 0],
  [5.05, 'powerup', 0], [5.45, 'impact', 0], [5.55, 'shimmer', 0], [5.98, 'ready', 0],
];
const NOTE = (n) => 440 * 2 ** ((n - 69) / 12); // MIDI note to Hz

export function createEngineSound() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  let ctx = null; let out = null; let noise = null;
  let on = false; let prev = null; const lastAt = {};

  function init() {
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
    out = ctx.createGain(); out.gain.value = 0.5; out.connect(comp); comp.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  // ---------- Building blocks ----------
  function env(t0, peak, attack, dur, dest = out) {
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    g.connect(dest); return g;
  }
  function osc(t0, type, f0, f1, dur, peak, attack = 0.005) {
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t0); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    o.connect(env(t0, peak, attack, dur)); o.start(t0); o.stop(t0 + dur + 0.05); return o;
  }
  function noiseThrough(t0, dur, filter, peak, attack = 0.01) {
    const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
    s.connect(filter); filter.connect(env(t0, peak, attack, dur));
  }
  function filter(type, f, q = 1) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
  // A small electronic blip: a soft square with a quick downward chirp.
  const blip = (t0, f, peak = 0.07) => osc(t0, 'square', f, f * 0.94, 0.06, peak, 0.003);
  const arp = (t0, notes, step, type = 'square', peak = 0.05, len = 0.07) => notes.forEach((n, i) => osc(t0 + i * step, type, NOTE(n), NOTE(n), len, peak, 0.003));
  // A short burst of data: fast random high blips.
  function chatter(t0, count, peak = 0.04) { for (let i = 0; i < count; i++) blip(t0 + i * 0.028, 1800 + Math.random() * 2400, peak); }
  function chord(t0, notes, dur, peak, type = 'sine') { notes.forEach((n) => osc(t0, type, NOTE(n), NOTE(n), dur, peak, 0.01)); }

  // ---------- Cues ----------
  const play = {
    // Competitions: gadget blips as the team pills appear, data chirps as the bracket lines draw.
    gadget: (t0, n) => { for (let i = 0; i < n; i++) blip(t0 + i * 0.07, [1320, 1568, 1175, 1480][i % 4], 0.07); },
    chirp: (t0, round) => { osc(t0, 'sine', 900, 2600 + round * 400, 0.18, 0.08); chatter(t0 + 0.05, 5, 0.03); },
    champion: (t0) => { arp(t0, [76, 79, 84], 0.07, 'triangle', 0.1, 0.14); chord(t0 + 0.21, [72, 76, 79], 0.5, 0.05, 'triangle'); },
    // Challenges: a loading sound. Each tick a little higher as the ring fills.
    load: (t0, i) => { osc(t0, 'sine', NOTE(64 + i), NOTE(64 + i), 0.05, 0.06, 0.002); osc(t0, 'square', NOTE(76 + i), NOTE(76 + i), 0.025, 0.012, 0.002); },
    loaded: (t0) => { arp(t0, [84, 88, 91, 96], 0.05, 'triangle', 0.09, 0.18); },
    // Switching layer: tech swoosh, resonant zap and a fast digital arpeggio.
    layer: (t0, k) => {
      const bp = filter('bandpass', 400, 4); bp.frequency.setValueAtTime(400, t0); bp.frequency.exponentialRampToValueAtTime(5200, t0 + 0.45); bp.frequency.exponentialRampToValueAtTime(900, t0 + 0.8);
      noiseThrough(t0, 0.8, bp, 0.22, 0.25);
      osc(t0, 'sawtooth', 120, 1800, 0.35, 0.03, 0.02);
      arp(t0 + 0.3, k ? [62, 69, 74, 81, 86] : [60, 67, 72, 79, 84], 0.045, 'square', 0.045, 0.06);
      chatter(t0 + 0.62, 6, 0.025);
      blip(t0 + 0.82, 2093, 0.08);
    },
    // Connected: the layers unfold, the links lock, a pulse runs through.
    unfold: (t0) => { arp(t0, [88, 84, 79, 76, 72, 67], 0.06, 'triangle', 0.06, 0.12); noiseThrough(t0, 0.7, filter('highpass', 4000), 0.05, 0.1); },
    link: (t0, k) => { blip(t0, k ? 1760 : 1568, 0.09); osc(t0 + 0.02, 'sine', 3200, 3200, 0.12, 0.03); },
    pulse: (t0) => { arp(t0, [72, 76, 79, 84, 88], 0.035, 'sine', 0.07, 0.08); },
    // Building the chip: power-up riser, bass impact with a bright chord, shimmer, ready chime.
    powerup: (t0) => {
      const lp = filter('lowpass', 200, 8); lp.frequency.setValueAtTime(200, t0); lp.frequency.exponentialRampToValueAtTime(5000, t0 + 0.75);
      [0, 7].forEach((cents) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.detune.value = cents; o.frequency.setValueAtTime(NOTE(36), t0); o.frequency.exponentialRampToValueAtTime(NOTE(48), t0 + 0.75); o.connect(lp); o.start(t0); o.stop(t0 + 0.85); });
      lp.connect(env(t0, 0.12, 0.6, 0.8));
      chatter(t0 + 0.2, 10, 0.02);
    },
    impact: (t0) => {
      osc(t0, 'sine', 110, 38, 0.5, 0.55, 0.004); // sub hit
      noiseThrough(t0, 0.12, filter('lowpass', 1200), 0.2, 0.002);
      chord(t0 + 0.02, [60, 67, 72, 76, 79], 0.9, 0.035, 'triangle');
      osc(t0 + 0.02, 'square', NOTE(84), NOTE(84), 0.25, 0.02);
    },
    shimmer: (t0) => { const hp = filter('bandpass', 6000, 2); hp.frequency.setValueAtTime(3000, t0); hp.frequency.exponentialRampToValueAtTime(9000, t0 + 0.7); noiseThrough(t0, 0.7, hp, 0.06, 0.3); arp(t0 + 0.1, [79, 84, 88, 91], 0.12, 'sine', 0.04, 0.3); },
    ready: (t0) => { osc(t0, 'sine', NOTE(84), NOTE(84), 0.16, 0.12); osc(t0 + 0.14, 'sine', NOTE(91), NOTE(91), 0.4, 0.12); },
  };

  return {
    get on() { return on; },
    // Must be called from a click: browsers only start audio after a user gesture.
    async toggle() {
      if (!ctx) init();
      on = !on;
      if (on && ctx.state !== 'running') await ctx.resume();
      if (on) blip(ctx.currentTime + 0.02, 1568, 0.08); // a small confirmation
      return on;
    },
    // Called every frame with the scene's position on its timeline. Silent while the scene is off
    // screen, so jumping past it does not play every cue at once.
    update(t, silent = false) {
      if (prev === null || silent) { prev = t; return; }
      if (on && ctx && ctx.state === 'running' && t !== prev) {
        const now = ctx.currentTime;
        CUES.forEach(([at, cue, arg]) => {
          const crossed = (prev < at && t >= at) || (prev > at && t <= at);
          if (crossed && !(lastAt[at] > now - 0.25)) { lastAt[at] = now; play[cue](now + 0.01, arg); }
        });
      }
      prev = t;
    },
  };
}
