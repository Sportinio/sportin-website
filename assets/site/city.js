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
    let PR = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.25);
    renderer.setPixelRatio(PR); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x04060d); scene.fog = new THREE.FogExp2(0x05070f, 0.0014);
    const camera = new THREE.PerspectiveCamera(mobile ? 52 : 38, 1, 1, 4000);
    let seed = 5; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

    // ---- Light: a cold moon, warm floodlights. ----
    scene.add(new THREE.HemisphereLight(0x2a3d6e, 0x0a0c14, 1.1));
    const moon = new THREE.DirectionalLight(0x8aa2e0, 0.9); moon.position.set(-300, 500, 200); scene.add(moon);
    // The glow of the ground itself: a warm light over the pitch that fills the bowl and spills onto the roof.
    const bowlLight = new THREE.PointLight(0xffe2b4, 9000, 460, 1.5); bowlLight.position.set(0, 44, 0); scene.add(bowlLight);

    // ---- Ground. ----
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshStandardMaterial({ color: 0x0a0c14, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.2; scene.add(ground);

    const M = new THREE.Matrix4(), Q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -0.18), P = new THREE.Vector3(), Sc = new THREE.Vector3();
    // ---- The stadium: an oval bowl of three tiers of seats, a ribbed facade with a club-blue LED
    // band, a roof of trusses and translucent panels you can see the stands through, and four
    // floodlight masts. Lathe profiles, scaled 1.28 : 1 into an oval. ----
    const stadium = new THREE.Group(); stadium.rotation.y = -0.32; scene.add(stadium);
    const OV = 1.28;
    const lathe = (pts, mat, segs = 128) => { const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs), mat); m.scale.set(OV, 1, 1); stadium.add(m); return m; };
    // Seat rows: a texture of narrow rows with aisles, so the tiers read as seating from the air.
    const seatTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#5f6f94'; x.fillRect(0, 0, 256, 64); x.fillStyle = '#3f4b6a'; for (let i = 0; i < 64; i += 4) x.fillRect(0, i, 256, 1.5); x.fillStyle = '#9aa6c4'; for (let i = 0; i < 256; i += 32) x.fillRect(i, 0, 2.5, 64); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(56, 1); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const seatMat = new THREE.MeshStandardMaterial({ map: seatTex, roughness: 0.9, side: THREE.DoubleSide, emissive: 0x3a4d80, emissiveIntensity: 0.9, emissiveMap: seatTex });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3b4152, roughness: 0.7, metalness: 0.2, side: THREE.DoubleSide });
    // Lower tier, middle tier, upper tier: each a sloped band of seats with a vertical wall below it.
    lathe([[44, 0], [50, 0], [50, 2]], wallMat); lathe([[50, 2], [62, 9]], seatMat);
    lathe([[62, 9], [62, 13]], wallMat); lathe([[62, 13], [77, 23]], seatMat);
    lathe([[77, 23], [77, 27]], wallMat); lathe([[77, 27], [94, 39]], seatMat);
    // The facade: a dark outer wall, vertical ribs, and the LED band in club blue.
    lathe([[94, 39], [96, 39], [96, 0], [94, 0]], new THREE.MeshStandardMaterial({ color: 0x262b38, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide }));
    const ribs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 40, 1.8), new THREE.MeshStandardMaterial({ color: 0x7a8294, roughness: 0.5, metalness: 0.5 }), 96);
    for (let i = 0; i < 96; i++) { const a = (i / 96) * Math.PI * 2; P.set(Math.cos(a) * 97.2 * OV, 20, Math.sin(a) * 97.2); const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a); Sc.set(1, 1, 1); M.compose(P, q, Sc); ribs.setMatrixAt(i, M); }
    stadium.add(ribs);
    lathe([[96.6, 28], [96.6, 31.5]], new THREE.MeshBasicMaterial({ color: 0x3d7bff, side: THREE.DoubleSide }));
    // The roof: trusses from the facade in over the upper tier, translucent panels between them, and a
    // bright inner rim where the lights sit.
    const truss = new THREE.InstancedMesh(new THREE.BoxGeometry(28, 1.4, 1.2), new THREE.MeshStandardMaterial({ color: 0xb8bfd0, roughness: 0.4, metalness: 0.6 }), 64);
    for (let i = 0; i < 64; i++) { const a = (i / 64) * Math.PI * 2; const r = 83; P.set(Math.cos(a) * r * OV, 42.6, Math.sin(a) * r); const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a); Sc.set(OV, 1, 1); M.compose(P, q, Sc); truss.setMatrixAt(i, M); }
    stadium.add(truss);
    lathe([[70, 41.8], [96, 41.8]], new THREE.MeshStandardMaterial({ color: 0x2b303e, roughness: 0.55, metalness: 0.35, side: THREE.DoubleSide }));
    lathe([[69.5, 41.4], [71.5, 41.4]], new THREE.MeshBasicMaterial({ color: 0xffe9c4, side: THREE.DoubleSide }));
    // Lamps along the roof edge, the ring of light a ground has from the air.
    const roofLamps = []; for (let i = 0; i < 96; i++) { const a = (i / 96) * Math.PI * 2; roofLamps.push(Math.cos(a) * 70.5 * OV, 41.2, Math.sin(a) * 70.5); }
    const rlg = new THREE.BufferGeometry(); rlg.setAttribute('position', new THREE.Float32BufferAttribute(roofLamps, 3));
    stadium.add(new THREE.Points(rlg, new THREE.PointsMaterial({ color: 0xfff1d6, size: 4.5, sizeAttenuation: true, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending })));
    // The pitch, floodlit: its own light so it is the brightest thing in the city.
    const pc = document.createElement('canvas'); pc.width = 1050; pc.height = 680; const pq = pc.getContext('2d');
    for (let i = 0; i < 10; i++) { pq.fillStyle = i % 2 ? '#2e8a4e' : '#287b45'; pq.fillRect(i * 105, 0, 105, 680); }
    pq.strokeStyle = 'rgba(255,255,255,0.95)'; pq.lineWidth = 5; pq.strokeRect(20, 20, 1010, 640); pq.beginPath(); pq.moveTo(525, 20); pq.lineTo(525, 660); pq.stroke();
    pq.beginPath(); pq.arc(525, 340, 91, 0, Math.PI * 2); pq.stroke(); pq.strokeRect(20, 138, 165, 403); pq.strokeRect(865, 138, 165, 403); pq.strokeRect(20, 248, 55, 183); pq.strokeRect(975, 248, 55, 183);
    const pitchTex = new THREE.CanvasTexture(pc); pitchTex.colorSpace = THREE.SRGBColorSpace;
    const pitch = new THREE.Mesh(new THREE.PlaneGeometry(105, 68), new THREE.MeshStandardMaterial({ map: pitchTex, emissive: 0xffffff, emissiveMap: pitchTex, emissiveIntensity: 1.0, roughness: 0.95 }));
    pitch.rotation.x = -Math.PI / 2; pitch.position.y = 0.05; stadium.add(pitch);
    const apron = new THREE.Mesh(new THREE.RingGeometry(0, 44, 64), new THREE.MeshStandardMaterial({ color: 0x2c5a3c, roughness: 1 })); apron.rotation.x = -Math.PI / 2; apron.scale.set(OV, 1, 1); apron.position.y = 0.02; stadium.add(apron);
    // Floodlights: four masts outside the corners with a glare; two of them carry spotlights on the pitch.
    const glareScale = 26; const glare = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,252,240,1)'); g.addColorStop(0.12, 'rgba(255,246,220,0.85)'); g.addColorStop(0.4, 'rgba(255,236,200,0.18)'); g.addColorStop(1, 'rgba(255,230,190,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => {
      const x = a * 122, z = b * 90;
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.6, 64, 8), new THREE.MeshStandardMaterial({ color: 0x8a8f9c, roughness: 0.5, metalness: 0.6 })); mast.position.set(x, 32, z); stadium.add(mast);
      const head = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 2), new THREE.MeshBasicMaterial({ color: 0xfff4dc })); head.position.set(x, 65, z); head.lookAt(0, 20, 0); stadium.add(head);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glare, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp.position.set(x, 65, z); sp.scale.setScalar(glareScale); stadium.add(sp);
      if (a === b) { const light = new THREE.SpotLight(0xfff0d2, 2600, 420, 0.66, 0.5, 1.4); light.position.set(x, 65, z); light.target.position.set(0, 0, 0); stadium.add(light, light.target); }
    });

    // The forecourt: a paved plaza around the ground, with a ring of lamps and the roads out.
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(148, 96), new THREE.MeshStandardMaterial({ color: 0x2e3447, roughness: 1 })); plaza.rotation.x = -Math.PI / 2; plaza.scale.set(OV, 1, 1); plaza.position.y = 0.01; stadium.add(plaza);
    const plazaLamps = []; for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; plazaLamps.push(Math.cos(a) * 140 * OV, 6, Math.sin(a) * 140); if (i % 2 === 0) plazaLamps.push(Math.cos(a) * 112 * OV, 5, Math.sin(a) * 112); }
    const plg = new THREE.BufferGeometry(); plg.setAttribute('position', new THREE.Float32BufferAttribute(plazaLamps, 3));
    stadium.add(new THREE.Points(plg, new THREE.PointsMaterial({ color: 0xffd9a0, size: 5.5, sizeAttenuation: true, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending })));
    const plazaLight = new THREE.PointLight(0xffd0a0, 1800, 330, 1.6); plazaLight.position.set(0, 24, 0); stadium.add(plazaLight);

    // ---- The city: blocks of buildings around the ground, and every window a point of light. ----
    const BLK = 56, ST = 14, R = mobile ? 900 : 1150;
    const boxes = [];
    const win = [], winRank = [], winSeed = [], lamps = [];
    const angC = Math.cos(-0.18), angS = Math.sin(-0.18);
    const turn = (x, z) => [x * angC - z * angS, x * angS + z * angC];
    for (let gx = -R; gx < R; gx += BLK) for (let gz = -R; gz < R; gz += BLK) {
      const [cx, cz] = turn(gx + BLK / 2, gz + BLK / 2);
      const d = Math.hypot(cx / 1.28, cz); if (d < 150) continue; // the stadium forecourt
      if (Math.hypot(cx, cz) > R) continue;
      if (rnd() < 0.08) { if (rnd() < 0.5) { const [lx, lz] = turn(gx + 4, gz + 4); lamps.push(lx, 4, lz); } continue; } // parks, water, gaps
      // One to three buildings per block.
      const n = 1 + (rnd() * 3 | 0); const slots = n === 1 ? [[0, 0, 1, 1]] : n === 2 ? [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]] : [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 1], [0, 0.5, 0.5, 0.5]];
      slots.forEach(([u, v, w, h]) => {
        const inner = BLK - ST; const bw = inner * w - (w < 1 ? 3 : 0), bd = inner * h - (h < 1 ? 3 : 0);
        const near = clamp(1 - (d - 150) / 900);
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
    const bMat = new THREE.MeshLambertMaterial({ color: 0x303750 });
    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), bMat, boxes.length);
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
          vC = mix(vec3(1.0, 0.62, 0.28) * 0.75, vec3(0.34, 0.58, 1.0) * 1.35, lit); vA = tw * (0.55 + 0.45 * lit);
          gl_PointSize = clamp((2.8 + 1.2 * lit) * uPR * 330.0 / -mv.z, 1.2, 8.0 * uPR); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vC; varying float vA; void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; float a = (1.0 - smoothstep(0.55, 1.0, r)) * vA; gl_FragColor = vec4(vC * a, a); }` }));
    scene.add(windows);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lamps, 3));
    scene.add(new THREE.Points(lg, new THREE.PointsMaterial({ color: 0xffb060, size: 2.2, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })));

    // ---- Her window: a real fan behind the glass, on a building that stays blue. ----
    const video = document.querySelector('.tifo__crowd');
    const vt = video ? new THREE.VideoTexture(video) : null; if (vt) { vt.colorSpace = THREE.SRGBColorSpace; vt.repeat.set(0.1, 0.17); vt.offset.set(0.44, 0.26); }
    const wantX = 300, wantZ = 170;
    const herB = boxes.filter((b) => Math.hypot(b.x / 1.28, b.z) > 175).sort((a, b) => Math.hypot(a.x - wantX, a.z - wantZ) - Math.hypot(b.x - wantX, b.z - wantZ))[0];
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
    const A0 = new THREE.Vector3(-150, 80, 400), A1 = new THREE.Vector3(-210, 330, 470); // lift-off to cruising height, high enough to see into the bowl
    let px = 0, py = 0, vx = 0, vy = 0, enteredAt = 0, lastP = -1;
    if (!mobile && !reduced) section.addEventListener('pointermove', (e) => { px = e.clientX / window.innerWidth - 0.5; py = e.clientY / window.innerHeight - 0.5; }, { passive: true });

    // ---- Bloom. ----
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), mobile ? 0.45 : 0.6, 0.45, 0.82); composer.addPass(bloom);
    // Quality guard: the first two seconds on screen are timed; a slow machine loses bloom, then resolution.
    let frames = 0, timing0 = 0, quality = 2;
    const degrade = () => { quality--; if (quality === 1) { bloom.enabled = false; } else if (quality <= 0) { PR = 1; renderer.setPixelRatio(PR); wu.uPR.value = PR; size(); } };
    let W = 0, H = 0;
    const size = () => {
      const r = section.getBoundingClientRect(); W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      renderer.setSize(W, H, false); composer.setSize(W, H); bloom.setSize(W / 3, H / 3);
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
        const herEye = tmpL.clone().addScaledVector(toward, 90).add(new THREE.Vector3(0, 30, 0));
        eye.lerp(herEye, drop); look.lerp(tmpL, drop);
      }
      camera.position.copy(eye); camera.lookAt(look);
      her.visible = drop > 0.02 || p > 2.2;
      if (bloom.enabled) composer.render(); else renderer.render(scene, camera);
      if (quality > 0 && !reduced && te > 0.8) { if (!timing0) timing0 = now; frames++; if (now - timing0 > 2) { const fps = frames / (now - timing0); if (fps < 38) degrade(); frames = 0; timing0 = now; } }
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
