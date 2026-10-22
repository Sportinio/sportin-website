// Integrations scene: the page after the engine. It starts on the finished Gamification engine
// chip and follows the scroll through t = 0..5, resting on whole steps:
// 0 the chip; 1 it spins and settles inside a phone; 2 the blue Motion chip (SportIn's own
// real-time technology) appears below the phone and streams live into it; 3 the phone moves aside
// and a watch joins, linked to the phone; 4 the brands members wear appear around the watch, each
// drawing a line to it; 5 pulses run along every line: from each brand into the watch, from the
// watch into the phone, and live from Motion into the phone. Two ways in, one engine.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createChip } from '/proto/chip3d.js?v=2';
import { followScroll } from '/proto/scroll-follow.js?v=1';

const sec = document.getElementById('integrate');
const stage = sec.querySelector('.engine__stage');
const stick = sec.querySelector('.engine__stick');
const canvas = sec.querySelector('canvas'); stick.prepend(canvas);
const texts = [...sec.querySelectorAll('.eng-txt')];
const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const clamp = (v) => Math.max(0, Math.min(1, v));
const sm = (u) => u * u * u * (u * (u * 6 - 15) + 10);
const win = (t, a, b) => sm(clamp((t - a) / (b - a)));
const lerp = (a, b, u) => a + (b - a) * u;
const BLUE = '#0751fb'; const INK = '#0a1020'; const SLATE = '#5a6377'; const MUTE = '#8a93a6';

// ---------- Renderer, camera, light (same studio as the engine scene) ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(renderer), 0.04).texture;
const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(2.5, 14, 5); scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 0.6); fill.position.set(-6, 4, 10); scene.add(fill);
const rig = new THREE.Group(); scene.add(rig); // everything turns together for a little depth

// ---------- Shapes ----------
// Rounded rectangles with soft, continuous corners, like the device frames.
function rrShape(w, h, r) {
  const s = new THREE.Shape(); const x = -w / 2; const y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
const BEVEL = 0.035;
function slab(w, h, r, depth, mat) {
  const g = new THREE.ExtrudeGeometry(rrShape(w, h, r), { depth, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 5, curveSegments: 28 });
  g.translate(0, 0, -depth / 2); return new THREE.Mesh(g, mat);
}
// A flat face with 0..1 texture coordinates, for screens and bezels.
function face(w, h, r, mat) {
  const g = new THREE.ShapeGeometry(rrShape(w, h, r), 28);
  const p = g.attributes.position; const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, (p.getY(i) + h / 2) / h);
  return new THREE.Mesh(g, mat);
}
function canvasTex(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return { c, ctx: c.getContext('2d'), tex };
}
function font(ctx, weight, size, fam = 'Instrument Sans') { ctx.font = `${weight} ${size}px "${fam}", sans-serif`; }
const group = (list) => (m) => { m.transparent = true; list.push(m); return m; };
const fade = (list, obj, o) => { list.forEach((m) => { m.opacity = o; }); obj.visible = o > 0.004; };
function labelSprite(text, color, w) {
  const { ctx, tex } = canvasTex(760, 110);
  font(ctx, 600, 40, 'IBM Plex Mono'); ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 380, 58);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, toneMapped: false })); sp.scale.set(w, w * (110 / 760), 1); rig.add(sp); return sp;
}

// ---------- The phone (after the frame Adrian supplied: dark steel rim, black bezel, notch) ----------
const PH = { w: 2.3, h: 4.75, d: 0.24, sw: 2.02, sh: 4.47 };
const PZ = PH.d / 2 + BEVEL; // front face
const phone = new THREE.Group(); rig.add(phone);
const phoneMats = []; const pm = group(phoneMats);
const steelMat = pm(new THREE.MeshPhysicalMaterial({ color: 0x3a3e45, metalness: 1, roughness: 0.26, clearcoat: 0.4 }));
phone.add(slab(PH.w, PH.h, 0.42, PH.d, steelMat));
const black = () => pm(new THREE.MeshPhysicalMaterial({ color: 0x07080b, roughness: 0.14, metalness: 0.2, clearcoat: 1 }));
const pBezel = face(2.22, 4.67, 0.38, black()); pBezel.position.z = PZ + 0.002; phone.add(pBezel);
const PS = canvasTex(640, Math.round(640 * (PH.sh / PH.sw)));
const pScreen = face(PH.sw, PH.sh, 0.28, pm(new THREE.MeshBasicMaterial({ map: PS.tex, toneMapped: false }))); pScreen.position.z = PZ + 0.004; phone.add(pScreen);
const notch = face(0.82, 0.2, 0.1, black()); notch.position.set(0, PH.sh / 2 - 0.09, PZ + 0.006); phone.add(notch);
[[-1, 1.15, 0.36], [-1, 0.6, 0.36], [1, 0.9, 0.55]].forEach(([side, y, len]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, len, 0.09), steelMat); b.position.set(side * (PH.w / 2 + BEVEL + 0.012), y, 0); phone.add(b); });

const ENG = { y: 0.75, s: 0.3 }; // the engine chip's place on the phone, in phone coordinates
const toScreenY = (y) => ((PH.sh / 2 - y) / PH.sh) * PS.c.height;
let liveSteps = 4218;
function drawPhoneScreen(time, b) {
  const { ctx, c } = PS; const W = c.width; const Hh = c.height;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, Hh);
  // App header: the client's brand.
  font(ctx, 500, 26, 'IBM Plex Mono'); ctx.fillStyle = SLATE; ctx.textAlign = 'center'; ctx.fillText('Your brand', W / 2 + 14, 118);
  const tw = ctx.measureText('Your brand').width; ctx.fillStyle = BLUE; ctx.beginPath(); ctx.arc(W / 2 + 14 - tw / 2 - 18, 109, 7, 0, Math.PI * 2); ctx.fill();
  font(ctx, 500, 22, 'IBM Plex Mono'); ctx.fillStyle = MUTE; ctx.fillText('SportIn engine', W / 2, toScreenY(ENG.y - 0.62));
  if (b > 0.01) {
    // The live readout fed by Motion, at the bottom of the screen right above the Motion chip.
    ctx.globalAlpha = b;
    const y0 = toScreenY(-0.75);
    font(ctx, 600, 22, 'IBM Plex Mono'); const label = 'LIVE · MOTION'; const lw = ctx.measureText(label).width + 48;
    ctx.fillStyle = 'rgba(7,81,251,0.1)'; ctx.beginPath(); ctx.roundRect(W / 2 - lw / 2, y0 - 26, lw, 40, 20); ctx.fill();
    ctx.fillStyle = BLUE; ctx.globalAlpha = b * (0.55 + 0.45 * Math.sin(time * 5)); ctx.beginPath(); ctx.arc(W / 2 - lw / 2 + 18, y0 - 6, 6, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = b; ctx.textAlign = 'left'; ctx.fillText(label, W / 2 - lw / 2 + 32, y0 + 2);
    font(ctx, 800, 64, 'Archivo'); ctx.fillStyle = INK; ctx.textAlign = 'center';
    ctx.fillText(Math.floor(liveSteps).toLocaleString('en-US'), W / 2, y0 + 92);
    font(ctx, 500, 24); ctx.fillStyle = SLATE; ctx.fillText('steps, in real time', W / 2, y0 + 132);
    ctx.strokeStyle = BLUE; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let x = 0; x <= 420; x += 6) {
      const k = (x / 420) * Math.PI * 6 - time * 6; const spike = Math.max(0, Math.sin(k)) ** 12;
      const yy = y0 + 196 - spike * 46 + Math.sin(k * 0.5) * 4; if (x === 0) ctx.moveTo(W / 2 - 210 + x, yy); else ctx.lineTo(W / 2 - 210 + x, yy);
    }
    ctx.stroke(); ctx.globalAlpha = 1;
  }
  ctx.fillStyle = 'rgba(10,16,32,0.18)'; ctx.beginPath(); ctx.roundRect(W / 2 - 90, Hh - 34, 180, 10, 5); ctx.fill();
  ctx.textAlign = 'left';
  PS.tex.needsUpdate = true;
}

// ---------- The chips: the Gamification engine (from the last page) and Motion by SportIn ----------
const engine = createChip(renderer, {}); rig.add(engine.group);
// Motion is its own technology, so it sits outside the phone, below it, in SportIn blue.
const motion = createChip(renderer, { title: 'MOTION', sub: 'REAL-TIME', code: 'SI-M1', tone: 'blue' }); rig.add(motion.group);
const MOT = { y: -PH.h / 2 - 0.78, s: 0.26 }; // below the phone, in phone coordinates
const motionLabel = labelSprite('MOTION BY SPORTIN · REAL TIME', BLUE, 2.4);

// ---------- The watch (after the frame Adrian supplied: aluminium case, black bezel, band, crown) ----------
const WC = { w: 1.42, h: 1.72, d: 0.36 }; const WZ = WC.d / 2 + BEVEL;
const WATCH_X = 2.7;
const watch = new THREE.Group(); rig.add(watch);
const watchMats = []; const wm = group(watchMats);
const alu = wm(new THREE.MeshPhysicalMaterial({ color: 0xe4e7eb, metalness: 0.85, roughness: 0.28, clearcoat: 0.2 }));
watch.add(slab(WC.w, WC.h, 0.42, WC.d, alu));
const band = wm(new THREE.MeshPhysicalMaterial({ color: 0xebedf0, metalness: 0, roughness: 0.55, clearcoat: 0.2 }));
[1, -1].forEach((side) => { const b = slab(0.95, 1.55, 0.44, 0.12, band); b.position.set(0, side * (WC.h / 2 + 1.55 / 2 - 0.36), -0.06); watch.add(b); });
const wBezel = face(1.32, 1.62, 0.36, wm(new THREE.MeshPhysicalMaterial({ color: 0x07080b, roughness: 0.14, metalness: 0.2, clearcoat: 1 }))); wBezel.position.z = WZ + 0.002; watch.add(wBezel);
const WS = canvasTex(512, 650);
const wScreen = face(1.12, 1.42, 0.26, wm(new THREE.MeshBasicMaterial({ map: WS.tex, toneMapped: false }))); wScreen.position.z = WZ + 0.004; watch.add(wScreen);
const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 28).rotateZ(Math.PI / 2), alu); crown.position.set(WC.w / 2 + BEVEL + 0.06, 0.3, 0); watch.add(crown);
const sideBtn = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.1), alu); sideBtn.position.set(WC.w / 2 + BEVEL + 0.02, -0.18, 0); watch.add(sideBtn);
function drawWatchScreen() {
  const { ctx, c } = WS; const W = c.width;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, c.height);
  font(ctx, 500, 24, 'IBM Plex Mono'); ctx.fillStyle = SLATE; ctx.textAlign = 'center'; ctx.fillText('Your brand', W / 2, 74);
  const cx = W / 2; const cy = 330; ctx.lineWidth = 34; ctx.lineCap = 'round';
  ctx.strokeStyle = '#e9edf4'; ctx.beginPath(); ctx.arc(cx, cy, 150, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = BLUE; ctx.beginPath(); ctx.arc(cx, cy, 150, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.74); ctx.stroke();
  font(ctx, 800, 76, 'Archivo'); ctx.fillStyle = INK; ctx.fillText('7,412', cx, cy + 22);
  font(ctx, 500, 26); ctx.fillStyle = SLATE; ctx.fillText('steps', cx, cy + 62);
  font(ctx, 600, 28, 'IBM Plex Mono'); ctx.fillStyle = INK; ctx.fillText('128 bpm', cx, 590);
  ctx.textAlign = 'left'; WS.tex.needsUpdate = true;
}

// ---------- The brands members wear ----------
// Logos are monochrome brand icons (Simple Icons) where one exists, otherwise the name alone.
// They are placeholders until official brand assets are approved.
// Ten, not every brand: room to breathe matters more than a full list.
const BRANDS = [['Apple Health', 'apple'], ['Garmin', 'garmin'], ['Fitbit', 'fitbit'], ['Oura'], ['Whoop'],
  ['Samsung Health', 'samsung'], ['Polar'], ['Suunto'], ['Strava', 'strava'], ['Huawei Health', 'huawei']];
function drawBrand(ctx, name, icon) {
  ctx.clearRect(0, 0, 400, 120);
  ctx.beginPath(); ctx.roundRect(4, 4, 392, 112, 56); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,16,32,0.12)'; ctx.stroke();
  const iw = icon ? 46 : 0; const gap = icon ? 16 : 0;
  let size = 42; font(ctx, 600, size); while (ctx.measureText(name).width > 320 - iw - gap && size > 24) { size -= 2; font(ctx, 600, size); }
  const total = iw + gap + ctx.measureText(name).width; const x0 = 200 - total / 2;
  if (icon) ctx.drawImage(icon, x0, 37, iw, iw);
  ctx.fillStyle = SLATE; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(name, x0 + iw + gap, 62);
}
const TAG = { w: 1.25, h: 0.375 }; // brand tag size, readable from the wide camera
const logos = BRANDS.map(([name, slug]) => {
  const { ctx, tex } = canvasTex(400, 120);
  drawBrand(ctx, name, null);
  if (slug) {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => { drawBrand(ctx, name, img); tex.needsUpdate = true; };
    fetch(`https://cdn.jsdelivr.net/npm/simple-icons@13.21.0/icons/${slug}.svg`).then((r) => (r.ok ? r.text() : Promise.reject())).then((svg) => {
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace('<svg ', '<svg fill="#5a6377" '))}`;
    }).catch(() => {});
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, toneMapped: false }));
  sp.scale.set(TAG.w, TAG.h, 1); rig.add(sp); return sp;
});
// Ring positions around the watch: an ellipse that opens towards the phone, with the brands at
// equal distances along it (equal angles would bunch them at the top and bottom).
const RING = (() => {
  const RX = 3.3; const RY = 2.85; const A0 = -122; const A1 = 122; const N = 400; const pts = []; let len = 0;
  for (let k = 0; k <= N; k++) {
    const a = THREE.MathUtils.degToRad(lerp(A0, A1, k / N)); const p = [Math.cos(a) * RX, Math.sin(a) * RY];
    if (k) len += Math.hypot(p[0] - pts[k - 1][0], p[1] - pts[k - 1][1]); pts.push([...p, len]);
  }
  return BRANDS.map((_, i) => { const want = (i / (BRANDS.length - 1)) * len; return pts.find((p) => p[2] >= want - 1e-6).slice(0, 2); });
})();

// ---------- Integration lines and pulsing dots ----------
// Thin lines that draw themselves: from every brand into the watch, from the watch into the
// phone, and from Motion up into the phone. Dots pulse at each brand and run along the lines.
const PHONE_END = { x: -2.5, y: 0.5 }; // where the phone settles once the watch is in
const lineMat = new THREE.MeshBasicMaterial({ color: 0xb9cbf3, transparent: true });
function tube(curve, radius = 0.008) {
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, radius, 6, false), lineMat); rig.add(m); m.userData.curve = curve; return m;
}
const watchC = new THREE.Vector3(WATCH_X, 0, 0.1);
const brandLines = RING.map(([rx, ry]) => {
  const tag = new THREE.Vector3(WATCH_X + rx, ry, 0.1);
  const dir = watchC.clone().sub(tag).normalize();
  const a = tag.clone().addScaledVector(dir, 0.5); const b = watchC.clone().addScaledVector(dir, -0.95);
  const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(-dir.y, dir.x, 0).multiplyScalar(0.12));
  return tube(new THREE.QuadraticBezierCurve3(a, mid, b));
});
const linkCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(WATCH_X - WC.w / 2 - 0.2, 0.05, 0.1), new THREE.Vector3((WATCH_X + PHONE_END.x) / 2, 1.05, 0.1), new THREE.Vector3(PHONE_END.x + PH.w / 2 + 0.2, PHONE_END.y - 0.1, 0.1));
const link = tube(linkCurve, 0.01);
const syncedLabel = labelSprite('SYNCED · wearables and apps', '#6b7fae', 2.3);
// The live lane from Motion into the phone moves with the phone, so it is a scaled bar.
const liveMat = new THREE.MeshBasicMaterial({ color: BLUE, transparent: true });
const liveLane = new THREE.Mesh(new THREE.BoxGeometry(0.022, 1, 0.022), liveMat); rig.add(liveLane);
const dotGeo = new THREE.SphereGeometry(0.045, 16, 10);
const dotMat = new THREE.MeshBasicMaterial({ color: BLUE, transparent: true });
const nodes = new THREE.InstancedMesh(dotGeo, dotMat, BRANDS.length); rig.add(nodes);
const RUN_LINK = 3; const RUN_LIVE = 2;
const runners = new THREE.InstancedMesh(dotGeo, dotMat, BRANDS.length + RUN_LINK + RUN_LIVE); rig.add(runners);
const drawLine = (m, f) => { const n = m.geometry.index.count; m.geometry.setDrawRange(0, Math.floor((n * f) / 6) * 6); m.visible = f > 0.01; };

// ---------- Layout ----------
let W = 1; let H = 1;
function resize() {
  const r = stage.getBoundingClientRect(); const f = stick.getBoundingClientRect();
  W = Math.max(1, r.width); H = Math.max(1, r.height);
  renderer.setSize(f.width, f.height, false); camera.aspect = W / H;
  camera.setViewOffset(W, H, f.left - r.left, f.top - r.top + H * 0.07, f.width, f.height);
  camera.updateProjectionMatrix();
}

// ---------- Choreography ----------
const _m = new THREE.Matrix4(); const _q = new THREE.Quaternion(); const _s = new THREE.Vector3(); const _p = new THREE.Vector3();
let lastScreen = 0;
function paint(t, now = performance.now()) {
  const time = now / 1000;
  texts.forEach((el, k) => {
    const d = Math.abs(t - k); const o = 1 - sm(clamp((d - 0.28) / 0.22));
    el.style.opacity = String(o);
    el.style.transform = RM ? 'none' : `translateY(${((t - k) * -18).toFixed(1)}px)`;
    el.style.filter = !RM && o < 0.98 ? `blur(${((1 - o) * 6).toFixed(2)}px)` : 'none';
  });

  const a = win(t, 0.05, 0.85); // the chip spins into the phone
  const ph = win(t, 0.25, 0.85); // the phone builds around it
  const b = win(t, 1.1, 1.75); const ln = win(t, 1.45, 1.95); // Motion chip below, its live lane
  const c = win(t, 2.05, 2.8); // the phone moves aside, the watch joins
  const wa = win(t, 2.15, 2.7); const lk = win(t, 2.8, 3.0);
  const e = win(t, 4.05, 4.6); // pulses run
  const pulse = (i) => 1 + 0.35 * Math.sin(time * 5 + i * 1.7);

  rig.rotation.y = -0.08 * a + 0.12 * c;

  // Phone: centred, lifting a little to make room for Motion below, then aside for the watch.
  phone.position.set(lerp(0, PHONE_END.x, c), lerp(0, PHONE_END.y, b), 0);
  phone.scale.setScalar(lerp(0.92, 1, ph));
  fade(phoneMats, phone, ph);

  // Engine chip: from the big standing chip to its place on the phone, with one full turn.
  engine.group.position.set(lerp(0, phone.position.x, a), lerp(0, phone.position.y + ENG.y, a), lerp(0, PZ + 0.18, a));
  engine.group.rotation.set(Math.PI / 2, Math.PI * 2 * a, 0, 'YXZ');
  engine.group.scale.setScalar(lerp(1, ENG.s, a) * (1 + 0.03 * e * Math.sin(time * 4)));

  // Motion chip, below the phone, with its live lane up into the phone.
  const motY = phone.position.y + MOT.y;
  motion.group.position.set(phone.position.x, lerp(motY - 0.3, motY, b), 0.12);
  motion.group.rotation.set(Math.PI / 2, 0, 0, 'YXZ');
  motion.group.scale.setScalar(MOT.s * lerp(0.85, 1, b));
  motion.setOpacity(b);
  motionLabel.position.set(phone.position.x, motY - (3.4 / 2) * MOT.s - 0.28, 0.2);
  motionLabel.material.opacity = b; motionLabel.visible = b > 0.01;
  const laneFrom = motY + (3.4 / 2) * MOT.s + 0.03; const laneTo = phone.position.y - PH.h / 2 - BEVEL;
  liveLane.scale.y = Math.max(0.0001, (laneTo - laneFrom) * ln);
  liveLane.position.set(phone.position.x, laneFrom + ((laneTo - laneFrom) * ln) / 2, 0.1);
  liveMat.opacity = ln; liveLane.visible = ln > 0.01;

  // Watch.
  watch.position.set(lerp(5.2, WATCH_X, c), 0, 0);
  fade(watchMats, watch, wa);

  // Watch to phone link.
  drawLine(link, lk);
  syncedLabel.position.set(linkCurve.v1.x, 0.95, 0.2); syncedLabel.material.opacity = lk; syncedLabel.visible = lk > 0.01;

  // Brands pop in around the watch, then each draws its line in, and a dot pulses at its start.
  logos.forEach((sp, i) => {
    const [rx, ry] = RING[i];
    const o = win(t, 3.05 + i * 0.045, 3.3 + i * 0.045);
    sp.position.set(watch.position.x + rx, ry, 0.2);
    sp.material.opacity = o; sp.visible = o > 0.01;
    const k = lerp(0.7, 1, o); sp.scale.set(TAG.w * k, TAG.h * k, 1);
    const li = win(t, 3.25 + i * 0.045, 3.65 + i * 0.045);
    drawLine(brandLines[i], li);
    const start = brandLines[i].userData.curve.v0;
    _m.compose(start, _q.identity(), _s.setScalar(li > 0.95 ? (RM ? 0.8 : 0.8 * pulse(i)) : 0)); nodes.setMatrixAt(i, _m);
  });
  nodes.instanceMatrix.needsUpdate = true; nodes.visible = t > 3.2;
  lineMat.opacity = 1;

  // Pulses running along the lines: brand to watch, watch to phone, Motion to phone.
  runners.visible = e > 0.01 && !RM; dotMat.opacity = 1;
  if (runners.visible) {
    let n = 0;
    brandLines.forEach((ln2, i) => {
      const u = (time * 0.55 + i * 0.29) % 1;
      ln2.userData.curve.getPoint(sm(u), _p); _m.compose(_p, _q.identity(), _s.setScalar(e * pulse(i + 3) * (u > 0.96 ? 0 : 1))); runners.setMatrixAt(n++, _m);
    });
    for (let k = 0; k < RUN_LINK; k++) {
      const u = (time * 0.4 + k / RUN_LINK) % 1;
      linkCurve.getPoint(u, _p); _m.compose(_p, _q.identity(), _s.setScalar(e * pulse(k))); runners.setMatrixAt(n++, _m);
    }
    for (let k = 0; k < RUN_LIVE; k++) {
      const u = (time * 0.9 + k / RUN_LIVE) % 1;
      _p.set(phone.position.x, lerp(laneFrom, laneTo, u), 0.12); _m.compose(_p, _q.identity(), _s.setScalar(e * pulse(k + 7))); runners.setMatrixAt(n++, _m);
    }
    runners.instanceMatrix.needsUpdate = true;
  }

  // Screens: the phone's live readout redraws about 30 times a second while it is shown.
  if (b > 0.01 && !RM) liveSteps += 0.4;
  if (now - lastScreen > 33 || b <= 0.01) { drawPhoneScreen(time, b); lastScreen = now; }

  // Camera: the same eye-level framing as the standing chip, back a little to fit Motion below
  // the phone, then out to take in phone, watch and brands, centred on them.
  const aspectK = Math.max(1, 1.45 / (W / H));
  const dist = lerp(lerp(lerp(11, 12.5, a), 15, b), 19, c) * aspectK;
  const look = new THREE.Vector3(lerp(0, 0.55, c), lerp(lerp(0, 0.1, a), 0, b), 0);
  camera.position.set(look.x, look.y + dist * 0.1, dist * Math.sqrt(1 - 0.01));
  camera.lookAt(look);

  sec.style.setProperty('--cap', String(win(t, 4.6, 5)));
  renderer.render(scene, camera);
}

// ---------- Scroll and a live loop while it is on screen ----------
let visible = false;
const follow = followScroll(sec, { steps: 5, reduced: RM, onFrame: paint, keepAlive: () => visible && !RM && follow.t >= 1.2 });
new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) follow.kick(); }).observe(sec);
window.addEventListener('resize', () => { resize(); paint(follow.t); });
resize();
drawWatchScreen();
document.fonts.ready.then(() => { engine.drawEngraving(); motion.drawEngraving(); drawWatchScreen(); follow.sync(); });
follow.sync();
window.integrateAt = (v) => follow.jump(v);
