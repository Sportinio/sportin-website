// Stadium at Night (page 01). A night stadium drawn live: three tiers of seats around the pitch,
// each seat a point of light. The hero opens in the dark; one fan's phone light comes on at the
// centre of the far stand, the light spreads round the bowl, and from then on a wave of light
// rolls round the stands while cameras flash. Floodlights stand at the four corners and the pitch
// is drawn as HUD lines. Renders only while the hero is on screen and the tab is visible.
import * as THREE from 'three';

(() => {
  const canvas = document.getElementById('stadium');
  if (!canvas) return;
  const hero = canvas.closest('.arena');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia('(max-width: 760px)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { hero.classList.add('is-flat'); return; }
  renderer.setClearColor(0x000000, 0);
  const PR = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
  renderer.setPixelRatio(PR);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(mobile ? 86 : 62, 1, 0.5, 700);

  // ---- The bowl: a rounded rectangle around a 105 x 68 pitch. ----
  const PW = 105, PH = 68, N = 2.7;
  const rim = (t, off) => {
    const a = t * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    return [Math.sign(c) * Math.pow(Math.abs(c), 2 / N) * (PW / 2 + off), Math.sign(s) * Math.pow(Math.abs(s), 2 / N) * (PH / 2 + off)];
  };
  const perimeter = (off) => { let p = 0, [px, pz] = rim(0, off); for (let i = 1; i <= 256; i++) { const [x, z] = rim(i / 256, off); p += Math.hypot(x - px, z - pz); px = x; pz = z; } return p; };
  const TIERS = [
    { base: 4, rows: 14, off: 9, rise: 0.8, step: 0.85 },
    { base: 17, rows: 16, off: 23, rise: 0.86, step: 0.85 },
    { base: 33, rows: 16, off: 40, rise: 0.92, step: 0.85 },
  ];
  const spacing = mobile ? 1.05 : 0.62;
  const pos = [], ang = [], seed = [], seed2 = [];
  let rnd = 12345; const rand = () => { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; };
  TIERS.forEach((T) => {
    for (let r = 0; r < T.rows; r++) {
      const off = T.off + r * T.step, y = T.base + r * T.rise;
      const count = Math.round(perimeter(off) / spacing);
      for (let i = 0; i < count; i++) {
        const t = (i + rand() * 0.6) / count;
        const [x, z] = rim(t, off);
        // No seats behind the goals' corner towers: four small gaps for the floodlight masts.
        const gap = Math.min(Math.abs(t - 0.125), Math.abs(t - 0.375), Math.abs(t - 0.625), Math.abs(t - 0.875));
        if (gap < 0.006) continue;
        pos.push(x, y + (rand() - 0.5) * 0.25, z); ang.push(t); seed.push(rand()); seed2.push(rand());
      }
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aAngle', new THREE.Float32BufferAttribute(ang, 1));
  geo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
  geo.setAttribute('aSeed2', new THREE.Float32BufferAttribute(seed2, 1));
  const uniforms = { uTime: { value: 0 }, uWake: { value: reduced ? 1 : 0 }, uPR: { value: PR }, uLive: { value: reduced ? 0 : 1 } };
  const seats = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aAngle; attribute float aSeed; attribute float aSeed2;
      uniform float uTime, uWake, uPR, uLive;
      varying float vB; varying float vFlash; varying vec3 vC;
      float hash(float n) { return fract(sin(n) * 43758.5453); }
      void main() {
        // The light spreads from the centre of the far stand (angle 0.75) round both sides.
        float d = abs(aAngle - 0.75); d = min(d, 1.0 - d);
        float front = uWake * 0.56;
        float lit = (1.0 - smoothstep(front - 0.07, front, d)) * step(0.001, uWake);
        float phone = step(aSeed, 0.6);                           // not every fan lifts a phone
        float twinkle = 0.78 + 0.22 * sin(uTime * (1.2 + aSeed * 2.2) + aSeed2 * 6.2832);
        float wave = exp(-pow((fract(aAngle - uTime * 0.04) - 0.5) * 13.0, 2.0)) * uLive;
        float slot = floor(uTime * 0.6 + aSeed2 * 4.0);
        float ft = fract(uTime * 0.6 + aSeed2 * 4.0);
        float flash = step(0.991, hash(aSeed * 97.1 + slot)) * smoothstep(0.0, 0.04, ft) * (1.0 - smoothstep(0.04, 0.3, ft)) * uLive;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float depth = clamp(1.0 - (-mv.z - 40.0) / 300.0, 0.0, 1.0);
        float b = 0.045 + lit * phone * (0.3 + 0.4 * twinkle + 1.0 * wave);
        vB = b * (0.55 + 0.45 * depth);
        vFlash = flash * lit;
        vC = mix(vec3(1.0, 0.86, 0.64), vec3(0.42, 0.64, 1.0), step(0.84, aSeed2));
        float sz = (1.5 + lit * phone * (1.3 + wave * 0.9) + flash * lit * 5.0) * uPR * (150.0 / -mv.z);
        gl_PointSize = clamp(sz, 1.0, 26.0 * uPR);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vB; varying float vFlash; varying vec3 vC;
      void main() {
        vec2 p = gl_PointCoord - 0.5; float r = length(p) * 2.0;
        float a = smoothstep(1.0, 0.0, r); a *= a;
        vec3 c = vC * vB + vec3(1.0, 0.98, 0.92) * vFlash;
        gl_FragColor = vec4(c * a, a * clamp(vB + vFlash, 0.0, 1.0));
      }`,
  }));
  scene.add(seats);

  // ---- The pitch, as HUD lines. ----
  const L = [];
  const rect = (w, h, cx, cz) => { L.push(cx - w / 2, 0, cz - h / 2, cx + w / 2, 0, cz - h / 2, cx + w / 2, 0, cz - h / 2, cx + w / 2, 0, cz + h / 2, cx + w / 2, 0, cz + h / 2, cx - w / 2, 0, cz + h / 2, cx - w / 2, 0, cz + h / 2, cx - w / 2, 0, cz - h / 2); };
  rect(PW, PH, 0, 0);
  L.push(0, 0, -PH / 2, 0, 0, PH / 2);
  rect(16.5, 40.3, -PW / 2 + 8.25, 0); rect(16.5, 40.3, PW / 2 - 8.25, 0);
  rect(5.5, 18.3, -PW / 2 + 2.75, 0); rect(5.5, 18.3, PW / 2 - 2.75, 0);
  for (let i = 0; i < 72; i++) { const a0 = (i / 72) * Math.PI * 2, a1 = ((i + 1) / 72) * Math.PI * 2; L.push(Math.cos(a0) * 9.15, 0, Math.sin(a0) * 9.15, Math.cos(a1) * 9.15, 0, Math.sin(a1) * 9.15); }
  const lines = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(L, 3)), new THREE.LineBasicMaterial({ color: 0x5b8dff, transparent: true, opacity: 0.0 }));
  lines.position.y = 0.05; scene.add(lines);
  const G = [];
  for (let x = -PW / 2; x <= PW / 2 + 0.01; x += 5.25) G.push(x, 0, -PH / 2, x, 0, PH / 2);
  for (let z = -PH / 2; z <= PH / 2 + 0.01; z += 5.25) G.push(-PW / 2, 0, z, PW / 2, 0, z);
  const grid = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(G, 3)), new THREE.LineBasicMaterial({ color: 0x3d7bff, transparent: true, opacity: 0.0 }));
  grid.position.y = 0.02; scene.add(grid);
  // A soft pool of light on the grass.
  const radial = (inner, outer) => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, inner); g.addColorStop(1, outer); x.fillStyle = g; x.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(150, 100), new THREE.MeshBasicMaterial({ map: radial('rgba(40,90,220,0.32)', 'rgba(40,90,220,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = -0.2; scene.add(pool);

  // ---- Floodlights at the four corners. ----
  const glare = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(255,252,240,1)'); g.addColorStop(0.08, 'rgba(255,246,220,0.9)'); g.addColorStop(0.3, 'rgba(255,232,190,0.28)'); g.addColorStop(1, 'rgba(255,225,180,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c); })();
  const lights = [];
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const p = new THREE.Vector3(sx * 56, 52, sz * 44);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glare, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    sp.position.copy(p); sp.scale.setScalar(11); scene.add(sp);
    lights.push({ sp, k: Math.random() * 10 });
  });

  // ---- Camera: at the heart of the pitch, looking up at the far stand, drifting slowly. ----
  const eye = new THREE.Vector3(0, mobile ? 7 : 7.5, mobile ? 34 : 26);
  const look = new THREE.Vector3(0, mobile ? 30 : 27, -80);
  let yaw = 0, pitch = 0, tYaw = 0, tPitch = 0;
  if (!mobile) window.addEventListener('pointermove', (e) => { tYaw = (e.clientX / window.innerWidth - 0.5) * 0.14; tPitch = (e.clientY / window.innerHeight - 0.5) * 0.06; }, { passive: true });

  const size = () => {
    const r = hero.getBoundingClientRect(); const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  size(); new ResizeObserver(() => { size(); if (reduced) render(0); }).observe(hero);

  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  let t0 = 0;
  function render(now) {
    const t = (now - t0) / 1000;
    const wake = reduced ? 1 : ease(Math.min(1, Math.max(0, (t - 0.5) / 3.4)));
    uniforms.uTime.value = t; uniforms.uWake.value = wake;
    const open = Math.min(1, Math.max(0, (t - 1.1) / 1.6));
    lines.material.opacity = 0.55 * open; grid.material.opacity = 0.13 * open; pool.material.opacity = open;
    lights.forEach((l) => { const f = 0.85 + 0.15 * Math.sin(t * 7 + l.k) * Math.sin(t * 3.1 + l.k * 2); l.sp.material.opacity = 0.9 * open * f; });
    yaw += (tYaw + Math.sin(t * 0.07) * 0.1 - yaw) * 0.04; pitch += (tPitch - pitch) * 0.04;
    camera.position.copy(eye);
    const lk = look.clone(); lk.x += Math.sin(yaw) * 80; lk.y -= pitch * 80; camera.lookAt(lk);
    renderer.render(scene, camera);
  }
  let raf = 0, seen = true;
  const frame = (now) => { if (!t0) t0 = now; render(now); raf = requestAnimationFrame(frame); };
  const start = () => { if (!raf && !reduced) raf = requestAnimationFrame(frame); };
  const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };
  if (reduced) { t0 = 0; render(10000); }
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; seen && !document.hidden ? start() : stop(); }, { threshold: 0.02 }).observe(hero);
  document.addEventListener('visibilitychange', () => (document.hidden || !seen ? stop() : start()));
  document.documentElement.classList.add('stadium-ready');
})();
