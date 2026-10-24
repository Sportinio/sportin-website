// The Signal AI particle sphere from SignalStack (src/app/utils/signalSphere/sphereRenderer.ts and
// sphereGeometry.ts on main), ported to plain JavaScript for the website: the dot sphere only, the
// drawing code unchanged. The website uses the booking sphere's settings: voice mode, voice-blue,
// legacy speaking waves driven by the audio level while a clip plays.
// createSphereRenderer(canvas, size, read) returns one frame; read() returns the inputs each frame.

// Latitude rings x longitude points on the unit sphere (the dot sphere's 68 x 136 grid). Phones use a
// 48 x 96 grid: the sphere is small there, so it looks the same with half the dots to move.
function buildParticles(LAT = 68) {
  const particles = [];
  for (let lat = 0; lat <= LAT; lat++) {
    const phi = (lat / LAT) * Math.PI;
    const y0 = Math.cos(phi);
    const ringR = Math.sin(phi);
    const lonCount = Math.max(1, Math.round(LAT * 2 * ringR));
    for (let lon = 0; lon < lonCount; lon++) {
      const theta = (lon / lonCount) * Math.PI * 2;
      particles.push({ phi, theta, x0: ringR * Math.cos(theta), y0, z0: ringR * Math.sin(theta) });
    }
  }
  return particles;
}

export function createSphereRenderer(canvas, size, read) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  let inputs = read();
  const dpr = Math.min(window.innerWidth <= 700 ? 1.5 : 3, window.devicePixelRatio || 1); // phones: 1.5x is sharp at this size and far less work
  const pad = 2.0; // canvas is 2x the size to avoid clipping waves
  const s = Math.round(size * pad * dpr);
  canvas.width = s;
  canvas.height = s;
  const cx = s / 2, cy = s / 2, R = size * dpr / 2 * 0.75;

  // ── Static gradient: bottom=orange → red → purple → blue → top=cyan ──
  function lerpC(a, b, t) {
    return a.map((v, i) => Math.round(v + (b[i] - v) * Math.max(0, Math.min(1, t))));
  }
  // While LISTENING the blue voice sphere shifts to silver — an unmissable
  // "mic is live" signal — cross-faded by listeningBlend like every other
  // state property, so color melts silver on press and back to blue on release.
  // Adrian confirmed this palette (from #342) was fine — the shape was
  // the actual problem, not the color. Reverted after #343 over-darkened it.
  // The middle stop sits at the equator, where the swirl-textured shape
  // (no longer scrambled by the old wavy displacement) shows it as a sharp
  // band rather than a soft shade. Dip softened ~55% so it blends instead
  // of striping. Adrian: "what is that dark line in the middle?"
  const SILVER_STOPS = [
    [216, 221, 229],
    [199, 204, 213],
    [178, 184, 195],
    [201, 206, 215],
    [230, 234, 240],
  ];
  function staticColor(y) {
    const t = (y + 1) / 2;
    const stops = inputs.variant === 'voice-blue' ? [
      [184, 218, 255],
      [144, 202, 255],
      [ 91, 184, 250],
      [130, 207, 255],
      [205, 235, 255],
    ] : [
      [255, 110,   0],
      [255,  20,  60],
      [180,  15, 200],
      [ 70,  30, 255],
      [  0, 210, 255],
    ];
    const idx = t * (stops.length - 1);
    const lo = Math.floor(idx), hi = Math.min(lo + 1, stops.length - 1);
    let c = lerpC(stops[lo], stops[hi], idx - lo);
    if (inputs.variant === 'voice-blue' && listeningBlend > 0.01) {
      const s = lerpC(SILVER_STOPS[lo], SILVER_STOPS[hi], idx - lo);
      c = lerpC(c, s, listeningBlend);
    }
    return [c[0], c[1], c[2]];
  }

  // ── Build particle grid (latitude rings × longitude points) ──
  const FOLD = false;
  const particles = buildParticles(window.innerWidth <= 700 ? 48 : 68);

  let time = 0, rotY = 0;
  let thinkingIntensity = 0; // 0=normal, 1=fully thinking — smoothly lerped
  // State changes must morph one persistent particle surface, never look like
  // a replacement sphere. These weights cross-fade the three wave fields.
  let idleBlend = 1;
  let thinkingBlend = 0;
  let speakingBlend = 0;
  let legacySpeakingBlend = 0;
  let listeningBlend = 0;

  const draw = () => {
    inputs = read();
    ctx.clearRect(0, 0, s, s);

    // Smooth lerp toward target thinking state
    const prop = inputs.thinking;
    const isVoice = inputs.mode === 'voice';
    const isBlueVoice = inputs.variant === 'voice-blue';
    const motionState = inputs.activity;
    // Booking keeps the approved blue identity, but uses the former, more
    // expressive active-wave behaviour only while its voice response plays.
    const wantsLegacyActive = isBlueVoice && inputs.speakingStyle === 'legacy' && motionState === 'speaking';
    const audioEnergy = typeof prop === 'number' ? Math.max(0, Math.min(1, prop)) : prop ? 0.6 : 0;
    const targetIdle = motionState === 'thinking' || motionState === 'speaking' ? 0 : 1;
    const targetThinking = motionState === 'thinking' ? 1 : 0;
    const targetSpeaking = motionState === 'speaking' ? 1 : 0;
    const isSlowTransition = inputs.transitionSpeed === 'slow';
    // Listening must feel immediate: at the base 'slow' rate, residual
    // thinking/speaking layers keep deforming the surface for 5-10s after a
    // state change - the user holds Space and sees spikes, not calm bands.
    // Thinking entry is also quickened so release feels responsive.
    const baseMorph = isSlowTransition ? 0.012 : 0.038;
    const morphSpeed = baseMorph * (motionState === 'listening' ? 4.5 : motionState === 'thinking' ? 2 : 1);
    idleBlend += (targetIdle - idleBlend) * morphSpeed;
    thinkingBlend += (targetThinking - thinkingBlend) * morphSpeed;
    speakingBlend += (targetSpeaking - speakingBlend) * morphSpeed;
    listeningBlend += ((motionState === 'listening' ? 1 : 0) - listeningBlend) * morphSpeed;
    // The booking sphere's legacy speaking pattern is a visual layer, not a
    // state replacement. Cross-fading it avoids the hard switch at audio
    // start/stop and lets the particle surface settle naturally.
    legacySpeakingBlend += ((wantsLegacyActive ? 1 : 0) - legacySpeakingBlend) * (isSlowTransition ? 0.008 : 0.022);
    const target = isBlueVoice
      ? motionState === 'thinking' ? 0.55 : motionState === 'listening' ? 0 : motionState === 'speaking' ? (0.28 + audioEnergy * 0.55) + legacySpeakingBlend * (Math.max(0.6, audioEnergy) - (0.28 + audioEnergy * 0.55)) : 0
      : typeof prop === 'number' ? prop : (prop ? 1 : 0);
    thinkingIntensity += (target - thinkingIntensity) * (isSlowTransition ? 0.016 : 0.055);

    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);

    // ── Base idle wave (identical in both modes) ──
    const rendered = particles.map(p => {
      // The standard sphere keeps its original organic surface.
      const organicW =
        0.16 * Math.sin(p.phi * 5 + p.theta * 2 + time)
      + 0.09 * Math.sin(p.phi * 8 - p.theta * 3 + time * 0.85)
      + 0.06 * Math.sin(p.phi * 3 + p.theta * 7 + time * 1.4)
      + 0.04 * Math.sin(p.phi * 11 + p.theta * 4 - time * 0.6);
      // Signal voice is built from calm, stacked waveform latitudes. Keeping
      // radial movement restrained preserves the approved circular silhouette.
      const legacyIdleW = 0.55 * (
        0.16 * Math.sin(p.phi * 5 + p.theta * 2 + time)
      + 0.09 * Math.sin(p.phi * 8 - p.theta * 3 + time * 0.85)
      + 0.06 * Math.sin(p.phi * 3 + p.theta * 7 + time * 1.4)
      + 0.04 * Math.sin(p.phi * 11 + p.theta * 4 - time * 0.6)
      );
      // Listening rounds the silhouette toward the reference sphere: idle's
      // harmonics naturally lobe (visible even at idle), so a moderate damp
      // (not the 88% that erased the sphere, not 0% which kept the lobes)
      // smooths the edge while staying clearly visible.
      // Pushed near-full: geometry-only damping keeps the sphere visible
      // (dot alpha/radius come from rotation-projected depth, which stays a
      // smooth -1..1 gradient even at r=1 for every particle — the earlier
      // 'disappearing' sphere was a color-contrast problem, not a geometry
      // one, now that SILVER_STOPS is a genuine mid-grey).
      // Adrian: the shape he wants for listening is exactly what thinking
      // already looks like (thinking's idleBlend fades to ~0, leaving a
      // near-flat r=1 base). Matching that directly for listening too.
      // The folder sphere breathes less, so its icons stay readable.
      const signalW = legacyIdleW * idleBlend * (1 - listeningBlend) * (FOLD ? 0.7 : 1);
      const baseW = isBlueVoice ? signalW : organicW;

      // ── Chat active-state wave (shared by both modes) ──
      const breathe = thinkingIntensity * (0.5 + 0.5 * Math.sin(time * 1.7)) * 0.96;
      const amp = 1 + thinkingIntensity * 1.44 + breathe;
      const freq = 1 + thinkingIntensity * 0.6 + thinkingIntensity * 0.2 * Math.sin(time * 2.3);
      const thinkW =
        0.16 * Math.sin(p.phi * 5 * freq + p.theta * 2 + time)
      + 0.09 * Math.sin(p.phi * 8 * freq - p.theta * 3 + time * 0.85)
      + 0.06 * Math.sin(p.phi * 3 + p.theta * 7 * freq + time * 1.4)
      + 0.04 * Math.sin(p.phi * 11 + p.theta * 4 - time * 0.6)
      + thinkingIntensity * 0.08 * Math.sin(p.phi * 14 + p.theta * 9 + time * 2.2)
      + thinkingIntensity * 0.05 * Math.sin(p.phi * 6 + time * 3.1);
      // Blend from base idle → amplified thinking wave
      let w = isBlueVoice
        ? signalW
        : baseW + thinkingIntensity * (amp * thinkW - baseW);

      if (isVoice && (!isBlueVoice || speakingBlend > 0.001 || legacySpeakingBlend > 0.001)) {
        // ── Voice mode: dynamic audio-reactive waves — wider spread, more chaos ──
        const level = thinkingIntensity;
        const eqDist = Math.abs(p.phi - Math.PI / 2);
        const eqFactor = 1 - eqDist / (Math.PI / 2);
        // Softer falloff so waves spread beyond equator
        const eqSpread = Math.pow(eqFactor, 1.3);

        // The voice-blue variant uses ordered harmonic bands: every wave is
        // a deterministic multiple of the base phase, so motion reads like
        // an algorithm propagating through the sphere rather than noise.
        const phase = p.theta * 4 - time * 3.6;
        const signalAudioWave = (
          0.28 * Math.sin(phase)
        + 0.17 * Math.sin(phase * 2 + p.phi * 3)
        + 0.09 * Math.sin(phase * 3 - p.phi * 2)
        );
        const legacyAudioWave = (
          0.32 * Math.sin(p.theta * 3 + time * 5.5)
        + 0.22 * Math.sin(p.theta * 5 - time * 4.8)
        + 0.16 * Math.sin(p.theta * 8 + time * 7.2)
        + 0.10 * Math.sin(p.theta * 13 - time * 3.5)
        );
        const audioWave = level * eqSpread * (isBlueVoice
          ? signalAudioWave * (1 - legacySpeakingBlend) + legacyAudioWave * legacySpeakingBlend
          : legacyAudioWave);
        // Cross-axis turbulence — breaks symmetry, adds organic movement
        const turbulenceStrength = isBlueVoice
          ? 0.22 * (1 - legacySpeakingBlend) + 0.6 * legacySpeakingBlend
          : 0.6;
        const turbulence = level * turbulenceStrength * (
          0.12 * Math.sin(p.phi * 7 + p.theta * 4 + time * 3.8)
        + 0.08 * Math.sin(p.phi * 12 - p.theta * 6 + time * 6.0)
        + 0.06 * Math.sin(p.phi * 4 + p.theta * 11 - time * 4.5)
        );
        // Pulsing swell — whole sphere breathes with audio
        const swell = level * 0.06 * Math.sin(time * 3.2);
        w += audioWave + turbulence + swell;
      }

      const r = 1 + w;
      let x = p.x0 * r;
      let z = p.z0 * r;
      const latitudeFalloff = Math.sin(p.phi);
      let layerWave = 0;
      if (isBlueVoice) {
        const speakerEnergy = 0.35 + audioEnergy * 0.65;
        const phase = p.theta * 3 + p.phi * 1.4 - time * 1.15;
        const amplitude = (0.078 + speakerEnergy * 0.16) * latitudeFalloff;
        const speakingWave = amplitude * (
          Math.sin(phase)
          + 0.38 * Math.sin(phase * 2 + p.phi * 0.7 - time * 0.26)
          + 0.22 * Math.sin(phase * 3 - p.phi * 0.5 + time * 0.48)
          + 0.12 * Math.sin(phase * 4 + p.phi * 1.8 - time * 0.18)
        );
        const interference = 0.9 + 0.14 * Math.sin(p.phi * 9 + p.theta * 7 + time * 0.16);
        const interiorFalloff = Math.pow(latitudeFalloff, 1.7);
        const thinkingWave = 0.030 * interiorFalloff * interference * (
          Math.sin(p.theta * 3 + p.phi * 6 - time * 0.55)
          + 0.58 * Math.sin(p.theta * 5 - p.phi * 4 + time * 0.37)
          + 0.36 * Math.sin(p.theta * 8 + p.phi * 9 - time * 0.29)
          + 0.24 * Math.sin(p.theta * 11 - p.phi * 7 + time * 0.21)
          + 0.17 * Math.sin(p.theta * 13 + p.phi * 13 - time * 0.17)
          + 0.11 * Math.sin(p.theta * 17 - p.phi * 10 + time * 0.13)
          + 0.07 * Math.sin(p.theta * 19 + p.phi * 5 + time * 0.09)
        );
        layerWave = (speakingWave * speakingBlend * (1 - legacySpeakingBlend) + thinkingWave * thinkingBlend) * (1 - listeningBlend);
      }
      let y = p.y0 * r + layerWave;
      // Thinking is not another sphere. The same particles enter a calm
      // neural-dots flow: they orbit and regroup inside the surface while
      // its circular silhouette remains recognisable.
      // Listening now shares thinking's swirl texture (summed, not gated
      // out) — the two states are mutually exclusive so this never double-
      // counts, and it's the exact shape Adrian pointed at in his recording.
      const swirlBlend = thinkingBlend + listeningBlend;
      if (isBlueVoice && swirlBlend > 0.001) {
        const thoughtPhase = time * 1.8 + p.theta * 5 + p.phi * 7;
        const thoughtFlow = swirlBlend * latitudeFalloff * (0.05 + 0.035 * Math.sin(thoughtPhase));
        x += Math.cos(p.theta + Math.PI / 2) * thoughtFlow;
        z += Math.sin(p.theta + Math.PI / 2) * thoughtFlow;
        y += Math.sin(thoughtPhase * 1.35) * swirlBlend * 0.052;
      }
      const rx = x * cosY + z * sinY;
      const rz = -x * sinY + z * cosY;
      const square = isBlueVoice && Math.sin(p.phi * 31 + p.theta * 17) > 0.72;
      return { sx: cx + rx * R, sy: cy - y * R, depth: rz, y0: p.y0, square };
    });

    rendered.sort((a, b) => a.depth - b.depth);

    const baseDotR = (inputs.variant === 'voice-blue' ? 1.04 : 1.1) * dpr;
    const dotR = isBlueVoice ? baseDotR : baseDotR * (isVoice ? 1 + thinkingIntensity * 0.15 : 1);
    rendered.forEach(item => {
      const { sx, sy, depth, y0, square } = item;
      const bright = Math.max(0, depth);
      let alpha = depth < 0
        ? (inputs.variant === 'voice-blue' ? 0.52 : 0.04) + (depth + 1) * (inputs.variant === 'voice-blue' ? 0.2 : 0.06)
        : (inputs.variant === 'voice-blue' ? 0.76 : 0.18) + bright * (inputs.variant === 'voice-blue' ? 0.22 : 0.6);

      const [cr, cg, cb] = staticColor(y0);

      const r = depth < 0 ? dotR * 0.7 : dotR * (0.7 + bright * 0.7);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
      if (square) {
        ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
      } else {
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    if (isBlueVoice) {
      // Listening = slow motion: the whole surface drops to ~a third of idle
      // speed while the user talks, then accelerates back through the same
      // cross-fade when they release (thinking/speaking speeds unchanged).
      const slowMo = 1 - 0.35 * listeningBlend;
      // Thinking = the same calm bands RACING: ~2.6x idle speed, per Adrian's
      // spec (listening slow-silver -> release -> visibly fast blue bands).
      const waveSpeed = (0.009 * idleBlend + 0.0235 * thinkingBlend + 0.0115 * speakingBlend) * slowMo;
      const rotationSpeed = (0.0011 * idleBlend + 0.0052 * thinkingBlend + 0.0022 * speakingBlend) * slowMo;
      time += waveSpeed;
      rotY += rotationSpeed + (FOLD ? 0.0015 : 0);
    } else {
      time += 0.010 + thinkingIntensity * (isVoice ? 0.0168 : 0.0072);
      rotY += 0.004 + thinkingIntensity * (isVoice ? 0.0036 : 0.003);
    }
  };

  return draw;
}
