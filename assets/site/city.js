// 02 The problem: the night city from above, in real 3D (three.js).
// The final whistle has gone. A drone lifts off the stadium roof. The ground is a lit bowl in a
// dark city, and the city's windows are lit club blue: every fan at home. The page holds still
// for three scroll steps; at each one more windows cool to sodium amber, the far ones first,
// until six in a hundred are left near the ground. On the last step the drone drops toward one
// window still blue: her, a real fan behind the glass (the crowd footage).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const pin = document.getElementById('problemPin'); const section = document.getElementById('problem');
const canvas = section && section.querySelector('.p2__wall');
if (pin && section && canvas) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia('(max-width: 900px)').matches;
  const stages = [...section.querySelectorAll('.p2__stage')];
  const shares = stages.map((s) => Number(s.dataset.share));
  const seg = () => Math.max(360, window.innerHeight * 0.7);
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const easeIO = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const measure = () => { section.style.top = '0px'; pin.style.height = `${section.offsetHeight + seg() * 3}px`; };
  window.problemMeasure = measure; window.problemRedraw = () => {};

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }); }
  catch (e) { section.classList.add('is-flat'); }
  if (renderer) {
    const PR = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.5);
    renderer.setPixelRatio(PR); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x04060d); scene.fog = new THREE.FogExp2(0x05070f, 0.00105);
    const camera = new THREE.PerspectiveCamera(mobile ? 52 : 38, 1, 1, 4000);
    let seed = 5; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

    // ---- Light: a cold moon, warm floodlights. ----
    scene.add(new THREE.HemisphereLight(0x2a3d6e, 0x0a0c14, 1.1));
    const moon = new THREE.DirectionalLight(0x8aa2e0, 0.9); moon.position.set(-300, 500, 200); scene.add(moon);
    // The glow of the ground itself: a warm light over the pitch that fills the bowl and spills onto the roof.
    const bowlLight = new THREE.PointLight(0xffe2b4, 6000, 520, 1.5); bowlLight.position.set(0, 50, 0); scene.add(bowlLight);

    // ---- Ground. ----
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshStandardMaterial({ color: 0x0a0c14, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.2; scene.add(ground);

    // ---- The stadium: a lathed bowl, scaled to an oval, with tiers, a roof ring and four masts. ----
    const stadium = new THREE.Group(); stadium.rotation.y = -0.32; scene.add(stadium);
    const profile = [[44, 0], [50, 0], [52, 6], [62, 6], [64, 14], [76, 14], [78, 24], [92, 24], [94, 36], [96, 36], [96, 40], [60, 43], [58, 43], [58, 40]].map(([r, y]) => new THREE.Vector2(r, y));
    const bowlMat = new THREE.MeshStandardMaterial({ color: 0x4a5062, roughness: 0.8, metalness: 0.15, side: THREE.DoubleSide });
    const bowl = new THREE.Mesh(new THREE.LatheGeometry(profile, 96), bowlMat); bowl.scale.set(1.28, 1, 1); stadium.add(bowl);
    // Seats: a lighter, subtly striped band on each tier, lit from the pitch.
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x5a6378, roughness: 0.9, side: THREE.DoubleSide, emissive: 0x2a3b66, emissiveIntensity: 0.6 });
    [[52, 6, 62, 6.4], [64, 14, 76, 14.4], [78, 24, 92, 24.4]].forEach(([r0, y0, r1, y1]) => { const m = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(r0, y0 + 0.3), new THREE.Vector2(r1, y1 + 0.3)], 96), seatMat); m.scale.set(1.28, 1, 1); stadium.add(m); });
    // The lit inner edge of the roof.
    const rim = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(58, 42.6), new THREE.Vector2(62, 42.6)], 96), new THREE.MeshBasicMaterial({ color: 0xffe9c4, side: THREE.DoubleSide }));
    rim.scale.set(1.28, 1, 1); stadium.add(rim);
    // Roof top, dark.
    const roof = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(60, 43.2), new THREE.Vector2(96, 40.4)], 96), new THREE.MeshStandardMaterial({ color: 0x3a3f4d, roughness: 0.55, metalness: 0.4, side: THREE.DoubleSide }));
    roof.scale.set(1.28, 1, 1); stadium.add(roof);
    // The pitch, with its lines drawn on a canvas.
    const pc = document.createElement('canvas'); pc.width = 1050; pc.height = 680; const pq = pc.getContext('2d');
    pq.fillStyle = '#1d5a33'; pq.fillRect(0, 0, 1050, 680);
    for (let i = 0; i < 10; i++) { pq.fillStyle = i % 2 ? '#1f6238' : '#1d5a33'; pq.fillRect(i * 105, 0, 105, 680); }
    pq.strokeStyle = 'rgba(255,255,255,0.9)'; pq.lineWidth = 5; pq.strokeRect(20, 20, 1010, 640); pq.beginPath(); pq.moveTo(525, 20); pq.lineTo(525, 660); pq.stroke();
    pq.beginPath(); pq.arc(525, 340, 91, 0, Math.PI * 2); pq.stroke(); pq.strokeRect(20, 138, 165, 403); pq.strokeRect(865, 138, 165, 403); pq.strokeRect(20, 248, 55, 183); pq.strokeRect(975, 248, 55, 183);
    const pitchTex = new THREE.CanvasTexture(pc); pitchTex.colorSpace = THREE.SRGBColorSpace;
    const pitch = new THREE.Mesh(new THREE.PlaneGeometry(105, 68), new THREE.MeshStandardMaterial({ map: pitchTex, roughness: 0.95 }));
    pitch.rotation.x = -Math.PI / 2; pitch.position.y = 0.05; stadium.add(pitch);
    // Floodlights: four masts outside the corners, a glare and a spotlight on the pitch.
    const glareScale = 26; const glare = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,252,240,1)'); g.addColorStop(0.12, 'rgba(255,246,220,0.85)'); g.addColorStop(0.4, 'rgba(255,236,200,0.18)'); g.addColorStop(1, 'rgba(255,230,190,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => {
      const x = a * 118, z = b * 86;
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.6, 62, 8), new THREE.MeshStandardMaterial({ color: 0x8a8f9c, roughness: 0.5, metalness: 0.6 })); mast.position.set(x, 31, z); stadium.add(mast);
      const head = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 2), new THREE.MeshBasicMaterial({ color: 0xfff4dc })); head.position.set(x, 63, z); head.lookAt(0, 20, 0); stadium.add(head);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glare, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.position.set(x, 63, z); sp.scale.setScalar(glareScale); stadium.add(sp);
      const light = new THREE.SpotLight(0xfff0d2, 2200, 420, 0.62, 0.5, 1.4); light.position.set(x, 63, z); light.target.position.set(0, 0, 0); stadium.add(light, light.target);
    });

    // ---- The city: blocks of buildings around the ground, and every window a point of light. ----
    const BLK = 56, ST = 14, R = 1500;
    const boxes = [];
    const win = [], winRank = [], winSeed = [], lamps = [];
    const angC = Math.cos(-0.18), angS = Math.sin(-0.18);
    const turn = (x, z) => [x * angC - z * angS, x * angS + z * angC];
    for (let gx = -R; gx < R; gx += BLK) for (let gz = -R; gz < R; gz += BLK) {
      const [cx, cz] = turn(gx + BLK / 2, gz + BLK / 2);
      const d = Math.hypot(cx / 1.28, cz); if (d < 190) continue; // the stadium forecourt
      if (Math.hypot(cx, cz) > R) continue;
      if (rnd() < 0.08) { if (rnd() < 0.5) { const [lx, lz] = turn(gx + 4, gz + 4); lamps.push(lx, 4, lz); } continue; } // parks, water, gaps
      // One to three buildings per block.
      const n = 1 + (rnd() * 3 | 0); const slots = n === 1 ? [[0, 0, 1, 1]] : n === 2 ? [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]] : [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 1], [0, 0.5, 0.5, 0.5]];
      slots.forEach(([u, v, w, h]) => {
        const inner = BLK - ST; const bw = inner * w - (w < 1 ? 3 : 0), bd = inner * h - (h < 1 ? 3 : 0);
        const near = clamp(1 - (d - 190) / 900);
        const bh = 9 + rnd() * rnd() * (8 + 14 * near) + (rnd() < 0.025 ? 24 + rnd() * 30 : 0);
        const lx0 = gx + ST / 2 + inner * u + bw / 2, lz0 = gz + ST / 2 + inner * v + bd / 2;
        const [bx, bz] = turn(lx0, lz0);
        boxes.push({ x: bx, z: bz, w: bw, d: bd, h: bh });
        // Windows on the four faces, in floors of 3.2 m; not every room is lit.
        const floors = Math.max(1, Math.floor((bh - 2) / 3.2)), hw = bw / 2, hd = bd / 2;
        const density = 0.42 + rnd() * 0.3;
        for (let f = 0; f < floors; f++) {
          const y = 2 + f * 3.2 + 1.2;
          const per = (len) => Math.max(1, Math.floor(len / 3.4));
          const faces = [[-hw, hw, -hd, 'z'], [-hw, hw, hd, 'z'], [-hd, hd, -hw, 'x'], [-hd, hd, hw, 'x']];
          faces.forEach(([a0, a1, off, axis]) => { const k = per(a1 - a0); for (let i = 0; i < k; i++) { if (rnd() > density) continue; const t = a0 + ((i + 0.5) / k) * (a1 - a0); const lx = axis === 'z' ? t : off, lz = axis === 'z' ? off : t; const [wx, wz] = turn(lx0 + lx, lz0 + lz); win.push(wx + (axis === 'z' ? 0 : Math.sign(off) * 0.2 * angC), y, wz + (axis === 'z' ? Math.sign(off) * 0.2 : 0)); winSeed.push(rnd()); winRank.push(0); } });
        }
      });
      // Street lamps along one side of the block.
      for (let i = 0; i < 3; i++) if (rnd() < 0.7) { const [lx, lz] = turn(gx + ST / 4, gz + (i + 0.5) * BLK / 3); lamps.push(lx, 5, lz); }
    }
    const bMat = new THREE.MeshStandardMaterial({ color: 0x232838, roughness: 0.85, metalness: 0.05 });
    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), bMat, boxes.length);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -0.18), P = new THREE.Vector3(), Sc = new THREE.Vector3();
    boxes.forEach((b, i) => { P.set(b.x, b.h / 2, b.z); Sc.set(b.w, b.h, b.d); M.compose(P, Q, Sc); inst.setMatrixAt(i, M); });
    scene.add(inst);
    // Who goes quiet first: the far windows, with some luck in it. rank in [0,1): lit while rank < share.
    const N = winRank.length; const order = [];
    for (let i = 0; i < N; i++) { const d = Math.hypot(win[i * 3], win[i * 3 + 2]); order.push({ i, s: d / R * 0.8 + winSeed[i] * 0.45 }); }
    order.sort((a, b) => a.s - b.s); order.forEach((o, k) => { winRank[o.i] = k / N; });
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(win, 3)); wg.setAttribute('aRank', new THREE.Float32BufferAttribute(winRank, 1)); wg.setAttribute('aSeed', new THREE.Float32BufferAttribute(winSeed, 1));
    const wu = { uShare: { value: 1 }, uTime: { value: 0 }, uPR: { value: PR } };
    const windows = new THREE.Points(wg, new THREE.ShaderMaterial({ uniforms: wu, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float aRank, aSeed; uniform float uShare, uTime, uPR; varying vec3 vC; varying float vA;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); float lit = 1.0 - smoothstep(uShare - 0.02, uShare + 0.01, aRank);
          float tw = 0.8 + 0.2 * sin(uTime * (0.7 + aSeed * 1.5) + aSeed * 6.2832);
          vC = mix(vec3(1.0, 0.62, 0.28) * 0.6, vec3(0.32, 0.56, 1.0) * 1.05, lit); vA = tw * (0.5 + 0.5 * lit);
          gl_PointSize = clamp((2.0 + 1.0 * lit) * uPR * 300.0 / -mv.z, 1.0, 7.0 * uPR); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vC; varying float vA; void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; float a = (1.0 - smoothstep(0.55, 1.0, r)) * vA; gl_FragColor = vec4(vC * a, a); }` }));
    scene.add(windows);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lamps, 3));
    scene.add(new THREE.Points(lg, new THREE.PointsMaterial({ color: 0xffb060, size: 2.2, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })));

    // ---- Her window: a real fan behind the glass, on a building that stays blue. ----
    const video = document.querySelector('.tifo__crowd');
    const vt = video ? new THREE.VideoTexture(video) : null; if (vt) { vt.colorSpace = THREE.SRGBColorSpace; vt.repeat.set(0.1, 0.17); vt.offset.set(0.44, 0.26); }
    const wantX = 300, wantZ = 170;
    const herB = boxes.filter((b) => Math.hypot(b.x / 1.28, b.z) > 220).sort((a, b) => Math.hypot(a.x - wantX, a.z - wantZ) - Math.hypot(b.x - wantX, b.z - wantZ))[0];
    const her = new THREE.Group();
    const toward = new THREE.Vector3(-170, 0, 400).normalize(); // the side the drone comes from
    if (herB) {
      her.position.set(herB.x, Math.min(herB.h - 3, 11), herB.z).addScaledVector(toward, Math.max(herB.w, herB.d) / 2 + 0.4);
      her.lookAt(her.position.clone().addScaledVector(toward, 10));
      const frame = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4.6), new THREE.MeshBasicMaterial({ color: 0x4a86ff })); frame.position.z = -0.05; her.add(frame);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 3.8), new THREE.MeshBasicMaterial({ map: vt || null, color: vt ? 0xffffff : 0x9db8ff })); her.add(glass);
      const herLight = new THREE.PointLight(0x4a86ff, 60, 40, 1.6); herLight.position.z = 6; her.add(herLight);
      scene.add(her);
    }

    // ---- Camera: the drone. ----
    const look = new THREE.Vector3(), eye = new THREE.Vector3(), tmpL = new THREE.Vector3();
    const A0 = new THREE.Vector3(-160, 60, 440), A1 = new THREE.Vector3(-230, 190, 520); // lift-off to cruising height
    let px = 0, py = 0, vx = 0, vy = 0, enteredAt = 0, lastP = -1;
    if (!mobile && !reduced) section.addEventListener('pointermove', (e) => { px = e.clientX / window.innerWidth - 0.5; py = e.clientY / window.innerHeight - 0.5; }, { passive: true });

    // ---- Bloom. ----
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), mobile ? 0.45 : 0.6, 0.45, 0.82); composer.addPass(bloom);
    let W = 0, H = 0;
    const size = () => {
      const r = section.getBoundingClientRect(); W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      renderer.setSize(W, H, false); composer.setSize(W, H); bloom.setSize(W / 2, H / 2);
      camera.aspect = W / H;
      // The title sits left: push the ground right of centre (and down on phones, under the title).
      if (mobile) camera.setViewOffset(W, H, 0, -H * 0.18, W, H); else camera.setViewOffset(W, H, -W * 0.17, -H * 0.04, W, H);
      camera.updateProjectionMatrix();
    };
    const progress = () => (typeof window.problemStep === 'number' ? window.problemStep : Math.max(0, Math.min(3, (section.getBoundingClientRect().top - pin.getBoundingClientRect().top) / seg())));
    const litShare = (p) => { const a = Math.floor(p), b = Math.min(3, a + 1); return shares[a] + (shares[b] - shares[a]) * (p - a); };

    function frame() {
      const now = performance.now() / 1000, te = enteredAt ? now - enteredAt : 0;
      const p = progress(); const cur = Math.min(3, Math.floor(p + 0.35));
      if (cur !== lastP) { stages.forEach((s, i) => s.classList.toggle('is-on', i === cur)); section.classList.toggle('is-late', cur === 3); lastP = cur; }
      const share = litShare(p);
      if (window.tifoCrowd) window.tifoCrowd.level(share);
      wu.uShare.value = share; wu.uTime.value = now;
      // Lift-off, then a slow orbit as the stages pass, then the drop toward her.
      const rise = reduced ? 1 : easeOut(clamp(te / 3));
      const drop = reduced ? (p >= 3 ? 1 : 0) : easeIO(clamp((p - 2.4) / 0.6));
      vx += (px - vx) * 0.03; vy += (py - vy) * 0.03;
      const orbit = -0.06 * Math.min(p, 2.4) + vx * 0.12 + (reduced ? 0 : Math.sin(now * 0.05) * 0.03);
      eye.lerpVectors(A0, A1, rise); eye.applyAxisAngle(new THREE.Vector3(0, 1, 0), orbit); eye.y += vy * -30;
      look.set(0, 12, 0);
      if (herB && drop > 0) {
        her.getWorldPosition(tmpL);
        const herEye = tmpL.clone().addScaledVector(toward, 95).add(new THREE.Vector3(0, 34, 0));
        eye.lerp(herEye, drop); look.lerp(tmpL, drop);
      }
      camera.position.copy(eye); camera.lookAt(look);
      her.visible = drop > 0.02 || p > 2.2;
      composer.render();
      // Arrival from the hero: out of black as the drone lifts.
      canvas.style.opacity = reduced ? '1' : String(clamp(te / 0.8));
    }
    new IntersectionObserver(([e]) => { if (e.isIntersecting && !enteredAt) enteredAt = performance.now() / 1000; }, { threshold: 0.3 }).observe(section);
    measure(); size();
    let raf = 0, seen = false;
    const loop = () => { frame(); raf = requestAnimationFrame(loop); };
    const start = () => { if (!raf && !reduced) raf = requestAnimationFrame(loop); if (video && video.paused) video.play().catch(() => {}); };
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };
    new IntersectionObserver(([e]) => { seen = e.isIntersecting; seen && !document.hidden ? start() : stop(); }, { threshold: 0.02 }).observe(section);
    document.addEventListener('visibilitychange', () => (document.hidden || !seen ? stop() : start()));
    let tm = 0; new ResizeObserver(() => { clearTimeout(tm); tm = setTimeout(() => { measure(); size(); if (reduced) frame(); }, 120); }).observe(section);
    window.addEventListener('resize', measure);
    if (reduced) { frame(); window.addEventListener('scroll', frame, { passive: true }); }
    document.documentElement.classList.add('city-ready');
  }
}
