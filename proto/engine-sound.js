// Transformer-style sound for the engine scene, synthesized in the browser (no audio files).
// Each cue fires when the scene crosses a point on its timeline, in either direction:
// the flips whir and whoosh, the split hisses open and the connections tick into place, the
// press ends in a deep clunk, and the chip stands up with a rising whine and a lock click.
// Browsers only allow sound after a click, so it starts from the sound button, off by default.

// [timeline point, cue]. Points match the choreography windows in engine3d.js.
const CUES = [
  [0.45, 'settle'],
  [2.05, 'flip'], [3.05, 'flip'],
  [4.05, 'split'], [4.7, 'tick'], [4.82, 'tick'],
  [5.05, 'press'], [5.45, 'clunk'],
  [5.55, 'rise'], [5.98, 'lock'],
];

export function createEngineSound() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  let ctx = null; let out = null; let noise = null;
  let on = false; let prev = null; const lastAt = {};

  function init() {
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
    out = ctx.createGain(); out.gain.value = 0.55; out.connect(comp); comp.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  // ---------- Building blocks ----------
  function env(t0, peak, attack, dur) {
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    g.connect(out); return g;
  }
  function noiseSrc(t0, dur) { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; s.start(t0, Math.random()); s.stop(t0 + dur + 0.05); return s; }
  // Filtered noise swept through a band: air moving past the plate.
  function whoosh(t0, dur, peak = 0.35) {
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(380, t0); bp.frequency.exponentialRampToValueAtTime(2600, t0 + dur * 0.45); bp.frequency.exponentialRampToValueAtTime(520, t0 + dur);
    noiseSrc(t0, dur).connect(bp); bp.connect(env(t0, peak, dur * 0.35, dur));
  }
  // Two detuned saws through a low-pass, with a fast wobble: a small servo motor.
  function servo(t0, dur, f0, f1, peak = 0.12) {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700; lp.Q.value = 2;
    const g = env(t0, peak, 0.06, dur); lp.connect(g);
    const wob = ctx.createOscillator(); wob.frequency.value = 22; const wobG = ctx.createGain(); wobG.gain.value = f0 * 0.025; wob.connect(wobG);
    [0, 9].forEach((cents) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.detune.value = cents;
      o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
      wobG.connect(o.frequency); o.connect(lp); o.start(t0); o.stop(t0 + dur + 0.05);
    });
    wob.start(t0); wob.stop(t0 + dur + 0.05);
  }
  function hiss(t0, dur, peak = 0.18) {
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3200;
    noiseSrc(t0, dur).connect(hp); hp.connect(env(t0, peak, 0.04, dur));
  }
  function thud(t0, f0, f1, dur, peak) {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    o.connect(env(t0, peak, 0.008, dur)); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  // Short inharmonic partials: struck metal.
  function ping(t0, freqs, dur, peak) {
    freqs.forEach((f, i) => { const o = ctx.createOscillator(); o.frequency.value = f; o.connect(env(t0, peak / (i + 1), 0.004, dur)); o.start(t0); o.stop(t0 + dur + 0.05); });
  }
  function click(t0, peak = 0.3) {
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2200;
    noiseSrc(t0, 0.03).connect(hp); hp.connect(env(t0, peak, 0.002, 0.03));
    ping(t0, [2400, 3650], 0.06, peak * 0.5);
  }

  // ---------- Cues ----------
  const play = {
    settle: (t0) => { thud(t0, 160, 90, 0.18, 0.16); click(t0 + 0.01, 0.12); },
    flip: (t0) => { whoosh(t0, 0.85); servo(t0, 0.8, 140, 230, 0.1); servo(t0 + 0.42, 0.4, 230, 120, 0.06); click(t0 + 0.82, 0.18); },
    split: (t0) => { hiss(t0, 0.9); servo(t0, 0.9, 90, 170, 0.08); thud(t0, 70, 50, 0.6, 0.12); },
    tick: (t0) => { click(t0, 0.26); ping(t0, [1480, 2210], 0.12, 0.08); },
    press: (t0) => { servo(t0, 0.65, 210, 110, 0.12); whoosh(t0, 0.6, 0.18); },
    clunk: (t0) => { thud(t0, 95, 42, 0.38, 0.5); ping(t0, [1240, 1870, 2630], 0.2, 0.12); hiss(t0 + 0.02, 0.25, 0.08); },
    rise: (t0) => { servo(t0, 0.75, 120, 420, 0.1); whoosh(t0, 0.7, 0.14); },
    lock: (t0) => { click(t0, 0.32); thud(t0, 140, 80, 0.14, 0.2); },
  };

  return {
    get on() { return on; },
    // Must be called from a click: browsers only start audio after a user gesture.
    async toggle() {
      if (!ctx) init();
      on = !on;
      if (on && ctx.state !== 'running') await ctx.resume();
      if (on) play.lock(ctx.currentTime + 0.02); // a small confirmation
      return on;
    },
    // Called every frame with the scene's position on its timeline.
    update(t) {
      if (prev === null) { prev = t; return; }
      if (on && ctx && ctx.state === 'running' && t !== prev) {
        CUES.forEach(([at, cue]) => {
          const crossed = (prev < at && t >= at) || (prev > at && t <= at);
          const now = ctx.currentTime;
          if (crossed && !(lastAt[at] > now - 0.35)) { lastAt[at] = now; play[cue](now + 0.01); }
        });
      }
      prev = t;
    },
  };
}
