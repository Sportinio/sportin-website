// Integrations scene: the page after the engine. It starts on the finished Gamification engine
// chip and follows the scroll through t = 0..4, resting on whole steps:
// 0 the chip; 1 it spins and settles inside a phone, and a switch appears next to the phone;
// 2 a watch joins, linked to the phone; 3 the brands members wear line up in one column, each
// drawing a line to the watch; 4 pulses run along every line into the watch and on into the phone.
// The switch has two views:
// - Integrations (above): data synced from wearables and apps.
// - eMotion: SportIn's own technology. The phone's hardware (GPS, accelerometer, gyroscope,
//   barometer, step counter) feeds the blue eMotion chip, which sends it to the SportIn engine in
//   real time. The engine chip slides out of the phone so the path reads left to right.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createChip } from '/proto/chip3d.js?v=2';
import { PHONE, buildPhone, plate } from '/proto/phone3d.js?v=2';
import { followScroll } from '/proto/scroll-follow.js?v=1';

// It runs on its own page (integrate3d.html) or, in the deck, inside the engine's section right
// after the engine's last step (data-int-from), so the chip carries straight on.
const canvas = document.getElementById('int3d');
const sec = canvas.closest('section');
const FROM = Number(sec.dataset.intFrom || 0); const STEPS_ALL = Number(sec.dataset.steps || 4);
const stage = sec.querySelector('.engine__stage');
const stick = sec.querySelector('.engine__stick'); stick.prepend(canvas);
const texts = [...sec.querySelectorAll('.int-txt[data-ci]')];
const emoTexts = [...sec.querySelectorAll('.int-txt[data-mode="emotion"]')]; // one per eMotion step (data-ce)
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
const fill = new THREE.DirectionalLight(0xffffff, 0.45); fill.position.set(-6, 4, 8); scene.add(fill); // same lights as the engine, for a seamless handover
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
// A flat face with 0..1 texture coordinates, for screens and glass.
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
const showSprite = (sp, o) => { sp.material.opacity = o; sp.visible = o > 0.01; };

// ---------- The phone: the site's 3D phone (phone3d.js), the same one as 09 to 11 and 15 ----------
// Its screen is left open, so the scene shows through it as before, and the app content is drawn
// on a plate in that opening. It turns in from edge-on as it builds around the chip (a quarter
// turn, as the app phone does on 09), then stays face-on.
const FRAME = { w: 871, h: 1771, sx: 44.4, sy: 37.2, sw: 782.4, sh: 1696.8 }; // phone-frame-3d.png pixels, 12 per mm
const K = 2.3 / FRAME.w; // world units per frame pixel: the phone keeps its old size in the scene
const PH = { w: FRAME.w * K, h: FRAME.h * K, sw: FRAME.sw * K, sh: FRAME.sh * K };
const MM = K * 12; // world units per millimetre
const PZ = 0.02; // chips float just in front of the screen
const phone = new THREE.Group(); rig.add(phone);
const phoneMats = []; const pm = group(phoneMats);
const PS = canvasTex(640, Math.round(640 * (FRAME.sh / FRAME.sw))); // the screen content
const body = buildPhone([null]); body.scale.setScalar(MM); body.position.z = -(PHONE.D / 2) * MM; // front glass at z = 0
const bodyMats = new Set();
body.traverse((o) => { if (o.material && o.material.colorWrite !== false) bodyMats.add(o.material); });
phone.add(body);
const pScreen = new THREE.Mesh(plate(PHONE.SW * MM, PHONE.SH * MM, PHONE.SR * MM, 32), pm(new THREE.MeshBasicMaterial({ map: PS.tex, toneMapped: false, depthWrite: false })));
pScreen.position.z = 0.05 * MM; phone.add(pScreen);
function composePhone() { PS.tex.needsUpdate = true; }
// The body is drawn opaque at rest and only blends while it fades in.
function fadePhone(o) {
  fade(phoneMats, phone, o);
  bodyMats.forEach((m) => { m.opacity = o; const tr = o < 0.999; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } });
}

const ENG = { y: 0.75, s: 0.3 }; // the engine chip's place on the phone, in phone coordinates
const toScreenY = (y) => ((PH.sh / 2 - y) / PH.sh) * PS.c.height;
let liveSteps = 4218;
// The phone screen: the client's brand on top, the engine's slot, and in eMotion view the live
// readout from the phone's own sensors.
function drawPhoneScreen(time, inPhone, emo) {
  const { ctx, c } = PS; const W = c.width; const Hh = c.height;
  ctx.clearRect(0, 0, W, Hh); // no white layer: the text sits directly in the see-through screen
  ctx.textAlign = 'center'; // no header or engine label on the screen: the chips speak for themselves
  if (emo > 0.01) {
    ctx.globalAlpha = emo;
    const y0 = toScreenY(-0.45);
    font(ctx, 600, 46, 'IBM Plex Mono'); const label = 'LIVE · eMotion'; const lw = ctx.measureText(label).width + 84;
    ctx.fillStyle = 'rgba(7,81,251,0.1)'; ctx.beginPath(); ctx.roundRect(W / 2 - lw / 2, y0 - 50, lw, 76, 38); ctx.fill();
    ctx.fillStyle = BLUE; ctx.globalAlpha = emo * (0.55 + 0.45 * Math.sin(time * 5)); ctx.beginPath(); ctx.arc(W / 2 - lw / 2 + 34, y0 - 12, 11, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = emo; ctx.textAlign = 'left'; ctx.fillText(label, W / 2 - lw / 2 + 58, y0 + 4);
    font(ctx, 800, 120, 'Archivo'); ctx.fillStyle = INK; ctx.textAlign = 'center';
    ctx.fillText(Math.floor(liveSteps).toLocaleString('en-US'), W / 2, y0 + 150);
    font(ctx, 500, 48); ctx.fillStyle = SLATE; ctx.fillText('steps, live', W / 2, y0 + 222);
    ctx.strokeStyle = BLUE; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let x = 0; x <= 420; x += 6) {
      const k = (x / 420) * Math.PI * 6 - time * 6; const spike = Math.max(0, Math.sin(k)) ** 12;
      const yy = y0 + 320 - spike * 60 + Math.sin(k * 0.5) * 5; if (x === 0) ctx.moveTo(W / 2 - 210 + x, yy); else ctx.lineTo(W / 2 - 210 + x, yy);
    }
    ctx.stroke(); ctx.globalAlpha = 1;
  }
  ctx.fillStyle = 'rgba(10,16,32,0.18)'; ctx.beginPath(); ctx.roundRect(W / 2 - 90, Hh - 34, 180, 10, 5); ctx.fill();
  ctx.textAlign = 'left';
  composePhone();
}

// ---------- The chips ----------
const engine = createChip(renderer, {}); rig.add(engine.group);
// eMotion has its own shape, so it never reads as a second engine: a square sensor package with a
// round blue lid, a fine metal ring and engraved rings, like a motion sensor.
function createSensorChip() {
  const group = new THREE.Group(); const mats = [];
  const cm = (m) => { m.transparent = true; mats.push(m); return m; };
  const S = 3.4; const ST = 0.14; const LT = 0.2; const lift = -(ST + LT) / 2; // centred on its own middle
  const sub = new THREE.Mesh(new RoundedBoxGeometry(S, ST, S, 4, 0.14), cm(new THREE.MeshPhysicalMaterial({ color: 0xe6edff, roughness: 0.42, metalness: 0.04, clearcoat: 0.35, clearcoatRoughness: 0.35 })));
  sub.position.y = lift + ST / 2; group.add(sub);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.035, 12, 120).rotateX(Math.PI / 2), cm(new THREE.MeshPhysicalMaterial({ color: 0xcfd5dd, metalness: 1, roughness: 0.25 })));
  ring.position.y = lift + ST + 0.02; group.add(ring);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.18, LT, 96), cm(new THREE.MeshPhysicalMaterial({ color: 0x1d5cff, metalness: 0.55, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2 })));
  lid.position.y = lift + ST + LT / 2; group.add(lid);
  const E = canvasTex(768, 768); const logo = new Image(); logo.src = '/assets/site/logo/sportin-wordmark-white.svg';
  const face = new THREE.Mesh(new THREE.CircleGeometry(1.12, 96).rotateX(-Math.PI / 2), cm(new THREE.MeshStandardMaterial({ map: E.tex, metalness: 0.3, roughness: 0.4, depthWrite: false })));
  face.position.y = lift + ST + LT + 0.002; group.add(face);
  function drawEngraving() {
    const { ctx } = E; ctx.clearRect(0, 0, 768, 768); const cx = 384;
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 3; [330, 290].forEach((r) => { ctx.beginPath(); ctx.arc(cx, cx, r, 0, Math.PI * 2); ctx.stroke(); });
    if (logo.complete && logo.naturalWidth) { const w = 250; const h = w * (logo.naturalHeight / logo.naturalWidth); ctx.globalAlpha = 0.85; ctx.drawImage(logo, cx - w / 2, 250 - h / 2, w, h); ctx.globalAlpha = 1; }
    font(ctx, 700, 96); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('eMotion', cx, 384);
    font(ctx, 600, 34, 'IBM Plex Mono'); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillText('REAL-TIME', cx, 476);
    E.tex.needsUpdate = true;
  }
  logo.onload = drawEngraving; drawEngraving();
  // Contact pads along all four edges.
  const N = 11; const pads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.01, 0.16), cm(new THREE.MeshPhysicalMaterial({ color: 0xd2d7de, metalness: 1, roughness: 0.3 })), N * 4);
  { const m = new THREE.Matrix4(); const q = new THREE.Quaternion(); const one = new THREE.Vector3(1, 1, 1); const Y = new THREE.Vector3(0, 1, 0); let i = 0;
    for (let k = 0; k < N; k++) {
      const v = -S / 2 + 0.45 + k * ((S - 0.9) / (N - 1));
      [[v, S / 2 - 0.13, 0], [v, -S / 2 + 0.13, 0], [S / 2 - 0.13, v, 1], [-S / 2 + 0.13, v, 1]].forEach(([x, z, rot]) => { q.setFromAxisAngle(Y, rot ? Math.PI / 2 : 0); m.compose(new THREE.Vector3(x, lift + ST + 0.005, z), q, one); pads.setMatrixAt(i++, m); });
    } }
  group.add(pads);
  return { group, drawEngraving, setOpacity(o) { mats.forEach((m) => { m.opacity = o; }); group.visible = o > 0.004; } };
}
const emotion = createSensorChip(); rig.add(emotion.group);

// ---------- The watch (after the frame Adrian supplied: one aluminium rim, black glass, band, crown) ----------
const WC = { w: 1.42, h: 1.72, d: 0.36, r: 0.42 }; const WZ = WC.d / 2 + BEVEL;
const watch = new THREE.Group(); rig.add(watch);
const watchMats = []; const wm = group(watchMats);
const alu = wm(new THREE.MeshPhysicalMaterial({ color: 0xe4e7eb, metalness: 0.85, roughness: 0.28, clearcoat: 0.2 }));
watch.add(slab(WC.w, WC.h, WC.r, WC.d, alu));
const band = wm(new THREE.MeshPhysicalMaterial({ color: 0xebedf0, metalness: 0, roughness: 0.55, clearcoat: 0.2 }));
[1, -1].forEach((side) => { const b = slab(0.95, 1.55, 0.44, 0.12, band); b.position.set(0, side * (WC.h / 2 + 1.55 / 2 - 0.36), -0.06); watch.add(b); });
const wGlass = face(WC.w, WC.h, WC.r, wm(new THREE.MeshPhysicalMaterial({ color: 0x07080b, roughness: 0.14, metalness: 0.2, clearcoat: 1 }))); wGlass.position.z = WZ + 0.002; watch.add(wGlass);
const WS = canvasTex(512, 650);
const wScreen = face(1.18, 1.48, 0.28, wm(new THREE.MeshBasicMaterial({ map: WS.tex, toneMapped: false }))); wScreen.position.z = WZ + 0.004; watch.add(wScreen);
const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 28).rotateZ(Math.PI / 2), alu); crown.position.set(WC.w / 2 + BEVEL + 0.06, 0.3, 0); watch.add(crown);
const sideBtn = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.1), alu); sideBtn.position.set(WC.w / 2 + BEVEL + 0.02, -0.18, 0); watch.add(sideBtn);
function drawWatchScreen() {
  const { ctx, c } = WS; const W = c.width;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, c.height);
  ctx.textAlign = 'center'; // small text dropped: nothing below 12px on screen
  const cx = W / 2; const cy = 300; ctx.lineWidth = 34; ctx.lineCap = 'round';
  ctx.strokeStyle = '#e9edf4'; ctx.beginPath(); ctx.arc(cx, cy, 150, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = BLUE; ctx.beginPath(); ctx.arc(cx, cy, 150, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.74); ctx.stroke();
  font(ctx, 800, 76, 'Archivo'); ctx.fillStyle = INK; ctx.fillText('7,412', cx, cy + 22);
  font(ctx, 600, 64); ctx.fillStyle = SLATE; ctx.fillText('steps', cx, cy + 230);
  ctx.textAlign = 'left'; WS.tex.needsUpdate = true;
}

// ---------- Tags (brands and sensors) ----------
// One fixed type size for every tag (13px on screen); the pill width is fixed per set, sized to
// its longest name, and never the font.
const TAG_H = 0.375; const TAG_B = 1.95; const TAG_S = 1.5; // brand and sensor pill widths
function drawTag(ctx, w, name, icon, dot) {
  const h = 120; ctx.clearRect(0, 0, w, h);
  ctx.beginPath(); ctx.roundRect(3, 3, w - 6, h - 6, (h - 6) / 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = dot ? 'rgba(7,81,251,0.3)' : 'rgba(10,16,32,0.14)'; ctx.stroke();
  font(ctx, 600, 54); const iw = icon ? 56 : dot ? 20 : 0; const gap = iw ? 18 : 0;
  const total = iw + gap + ctx.measureText(name).width; const x0 = w / 2 - total / 2;
  if (icon) ctx.drawImage(icon, x0, (h - iw) / 2, iw, iw);
  if (dot) { ctx.fillStyle = BLUE; ctx.beginPath(); ctx.arc(x0 + 10, h / 2, 10, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = dot ? INK : SLATE; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(name, x0 + iw + gap, h / 2 + 2);
}
function tagSprite(name, slug, width, dot = false) {
  const cw = Math.round(120 * (width / TAG_H));
  const { ctx, tex } = canvasTex(cw, 120);
  drawTag(ctx, cw, name, null, dot);
  if (slug) {
    // Monochrome brand icons from Simple Icons; placeholders until official assets are approved.
    const img = new Image(); img.onload = () => { drawTag(ctx, cw, name, img, dot); tex.needsUpdate = true; };
    fetch(`https://cdn.jsdelivr.net/npm/simple-icons@13.21.0/icons/${slug}.svg`).then((r) => (r.ok ? r.text() : Promise.reject())).then((svg) => {
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace('<svg ', '<svg fill="#5a6377" '))}`;
    }).catch(() => {});
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, toneMapped: false }));
  sp.scale.set(width, TAG_H, 1); sp.userData.w = width; rig.add(sp); return sp;
}

// ---------- Lines and pulses ----------
function lineMaterial(color) { return new THREE.MeshBasicMaterial({ color, transparent: true }); }
function tube(curve, mat, radius = LINE_BRANCH) { const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, radius, 6, false), mat); m.userData.curve = curve; rig.add(m); return m; }
const drawLine = (m, f) => { const n = m.geometry.index.count; m.geometry.setDrawRange(0, Math.floor((n * f) / 6) * 6); m.visible = f > 0.01; };
// A cubic curve that leaves and arrives horizontally, so bundles of lines look tidy.
function hCurve(a, b) { const span = b.x - a.x; return new THREE.CubicBezierCurve3(a, new THREE.Vector3(a.x + span * 0.45, a.y, a.z), new THREE.Vector3(b.x - span * 0.45, b.y, b.z), b); }
// Two line weights everywhere: branches and the main lines (SYNCED, REAL TIME).
const LINE_BRANCH = 0.01; const LINE_MAIN = 0.016;
const dotGeo = new THREE.SphereGeometry(0.045, 16, 10);
const pulse = (time, i) => 1 + 0.35 * Math.sin(time * 5 + i * 1.7);

// ---------- Layout: one grid for both views ----------
// Four columns, symmetric under the title, with the same 1.1-unit gap between every pair of
// column edges, and every column centred on y = 0:
//   column     1 (-4.3)   2 (-1.3)          3 (1.3)        4 (4.3)
//   Integr.    phone      watch             line fan       brands
//   eMotion    phone      phone sensors     eMotion chip   engine chip
const COLS = [-4.3, -1.3, 1.3, 4.3];
const PHONE_X = COLS[0]; const PHONE_Y = 0;
const PHONE_EDGE = PHONE_X + PH.w / 2; // the phone's right edge, where lines leave it
const WATCH_X = COLS[1]; const COL_GAP = 0.5;
const CHIP_S = 0.44; // both chips at this size outside the phone
const ENGINE_IN_PHONE = () => new THREE.Vector3(phone.position.x, phone.position.y + ENG.y, PZ + 0.18);

// Integrations view.
const BRANDS = [['Apple Health', 'apple'], ['Garmin', 'garmin'], ['Fitbit', 'fitbit'], ['Oura'], ['Whoop'],
  ['Samsung Health', 'samsung'], ['Polar'], ['Suunto'], ['Strava', 'strava'], ['Huawei Health', 'huawei']];
const BRAND_LEFT = 3.35; const BRAND_X = BRAND_LEFT + TAG_B / 2;
const brandY = (i) => ((BRANDS.length - 1) / 2 - i) * COL_GAP;
const brandTags = BRANDS.map(([name, slug]) => tagSprite(name, slug, TAG_B));
const intLineMat = lineMaterial(0xa9bff2);
const CROWN_RIGHT = WATCH_X + WC.w / 2 + BEVEL + 0.14;
// Brand lines start just left of each tag and gather 0.3 units past the watch's crown.
const brandLines = BRANDS.map((_, i) => tube(hCurve(new THREE.Vector3(BRAND_LEFT - 0.1, brandY(i), 0.1), new THREE.Vector3(CROWN_RIGHT + 0.3, brandY(i) * 0.12, 0.1)), intLineMat));
// The main line: from the watch into the phone, ending at the engine itself.
const linkMat = lineMaterial(0x0751fb);
const linkCurve = hCurve(new THREE.Vector3(WATCH_X - WC.w / 2 - BEVEL - 0.1, 0, 0.1), new THREE.Vector3(PHONE_EDGE + 0.1, PHONE_Y + ENG.y, 0.1));
const link = tube(linkCurve, linkMat, LINE_MAIN);
const linkMid = linkCurve.getPoint(0.5);
const syncedLabel = labelSprite('SYNCED', BLUE, 3.0);
const intDotMat = new THREE.MeshBasicMaterial({ color: BLUE, transparent: true });
const brandNodes = new THREE.InstancedMesh(dotGeo, intDotMat, BRANDS.length); rig.add(brandNodes);
const RUN_LINK = 3;
const intRunners = new THREE.InstancedMesh(dotGeo, intDotMat, BRANDS.length + RUN_LINK); rig.add(intRunners);

// eMotion view.
const SENSORS = ['GPS', 'Accelerometer', 'Gyroscope', 'Barometer', 'Step counter'];
const SENSOR_X = COLS[1]; const EMO_X = COLS[2]; const ENGINE_X = COLS[3];
const sensorY = (i) => ((SENSORS.length - 1) / 2 - i) * COL_GAP;
const sensorTags = SENSORS.map((name) => tagSprite(name, null, TAG_S, true));
const emoLineMat = lineMaterial(0xa9bff2);
const sensorIn = SENSORS.map((_, i) => tube(hCurve(new THREE.Vector3(PHONE_EDGE + 0.1, PHONE_Y + sensorY(i) * 0.45, 0.1), new THREE.Vector3(SENSOR_X - TAG_S / 2 - 0.1, sensorY(i), 0.1)), emoLineMat));
const chipW = 5.2 * CHIP_S; const emoW = 3.4 * CHIP_S; // engine chip width, eMotion chip width
const sensorOut = SENSORS.map((_, i) => tube(hCurve(new THREE.Vector3(SENSOR_X + TAG_S / 2 + 0.1, sensorY(i), 0.1), new THREE.Vector3(EMO_X - emoW / 2 - 0.1, sensorY(i) * 0.25, 0.1)), emoLineMat));
const realMat = lineMaterial(0x0751fb);
const realCurve = hCurve(new THREE.Vector3(EMO_X + emoW / 2 + 0.1, 0, 0.1), new THREE.Vector3(ENGINE_X - chipW / 2 - 0.1, 0, 0.1));
const realLine = tube(realCurve, realMat, LINE_MAIN);
// REAL TIME sits on the line itself, as a small badge between the two chips; the pulses run
// along the line behind it.
const realLabel = (() => {
  const { ctx, tex } = canvasTex(480, 120);
  ctx.beginPath(); ctx.roundRect(3, 3, 474, 114, 57); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = BLUE; ctx.stroke();
  font(ctx, 600, 56, 'IBM Plex Mono'); const label = 'REAL TIME'; const tw = ctx.measureText(label).width; const x0 = 240 - (tw + 38) / 2;
  ctx.fillStyle = BLUE; ctx.beginPath(); ctx.arc(x0 + 12, 60, 12, 0, Math.PI * 2); ctx.fill();
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(label, x0 + 38, 63);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, toneMapped: false })); sp.scale.set(1.2, 0.3, 1); rig.add(sp); return sp;
})();
const emoDotMat = new THREE.MeshBasicMaterial({ color: BLUE, transparent: true });
const RUN_REAL = 4;
const emoRunners = new THREE.InstancedMesh(dotGeo, emoDotMat, SENSORS.length + RUN_REAL); rig.add(emoRunners);

// ---------- Title under the eMotion chip (HTML, so it stays sharp) ----------
const chipTitle = document.createElement('div'); chipTitle.className = 'int-chip-title'; chipTitle.setAttribute('aria-hidden', 'true');
chipTitle.textContent = 'Real-time technology'; stick.appendChild(chipTitle);
const oldCaption = FROM === 0 ? sec.querySelector('.eng-caption') : null; if (oldCaption) oldCaption.style.display = 'none'; // standalone page only; in the deck it is the engine's caption
const _cp = new THREE.Vector3();
function placeChipTitle(o) {
  _cp.set(EMO_X, -(3.4 / 2) * CHIP_S - 0.08, 0.12); rig.localToWorld(_cp).project(camera);
  const x = ((_cp.x + 1) / 2) * view.w; const y = ((1 - _cp.y) / 2) * view.h + 14;
  chipTitle.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translateX(-50%)`;
  chipTitle.style.opacity = String(o);
}

// A pair of toggle buttons (aria-pressed): one picture changes, there are no separate panels.
const sw = document.createElement('div'); sw.className = 'int-switch'; sw.setAttribute('role', 'group'); sw.setAttribute('aria-label', 'How data reaches the engine');
sw.innerHTML = '<button type="button" aria-pressed="true" data-mode="0">Integrations</button><button type="button" aria-pressed="false" data-mode="1"><i aria-hidden="true"></i>eMotion</button>';
stick.appendChild(sw);
let modeTarget = 0; let mode = 0; let modeAt = 0; // 0 Integrations, 1 eMotion; eased over 0.9 s
sw.addEventListener('click', (ev) => {
  const btn = ev.target.closest('button'); if (!btn) return;
  modeTarget = Number(btn.dataset.mode);
  sw.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  follow.kick();
});
const copyBox = sec.querySelector('.engine__copy');
function placeSwitch(o) {
  sw.style.opacity = String(o); sw.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
  // Tabs sit centred just below the title block.
  const cr = copyBox.getBoundingClientRect(); const f = stick.getBoundingClientRect();
  sw.style.transform = `translate(${Math.round(cr.left - f.left + cr.width / 2 - sw.offsetWidth / 2)}px, ${Math.round(cr.bottom - f.top + 6)}px)`;
}

// ---------- Layout ----------
let W = 1; let H = 1; let view = { w: 1, h: 1 }; let viewBase = { x: 0, y: 0, w: 1, h: 1 };
function resize() {
  const r = stage.getBoundingClientRect(); const f = stick.getBoundingClientRect();
  W = Math.max(1, r.width); H = Math.max(1, r.height); view = { w: f.width, h: f.height };
  renderer.setSize(f.width, f.height, false); camera.aspect = W / H;
  viewBase = { x: f.left - r.left, y: f.top - r.top + H * 0.07, w: f.width, h: f.height };
  camera.setViewOffset(W, H, viewBase.x, viewBase.y, viewBase.w, viewBase.h);
  camera.updateProjectionMatrix();
}

// ---------- Choreography ----------
const _m = new THREE.Matrix4(); const _q = new THREE.Quaternion(); const _s = new THREE.Vector3(); const _p = new THREE.Vector3();
let lastScreen = 0; let lastScreenKey = ''; let lastNow = 0;
function paint(t, now = performance.now()) {
  const time = now / 1000;
  const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0; lastNow = now;
  if (RM) mode = modeTarget; else { modeAt += Math.sign(modeTarget - modeAt) * Math.min(Math.abs(modeTarget - modeAt), dt / 0.9); mode = sm(modeAt); }

  const a = win(t, 0.05, 0.85); // the chip spins into the phone
  const ph = win(t, 0.25, 0.85); // the phone builds around it
  const swO = win(t, 0.75, 1.0); // the switch appears
  const emo = mode * clamp((t - 0.85) / 0.15); // eMotion view, once the phone is there
  const ints = 1 - emo; // Integrations view
  const c = win(t, 1.05, 1.8); // the phone moves aside, the watch joins
  const wa = win(t, 1.15, 1.7); const lk = win(t, 1.8, 2.0);
  const e = win(t, 3.05, 3.6); // pulses run
  // eMotion builds on the same scroll steps, so every scroll does something in both views:
  // 2 the phone's sensors appear, wired from the phone; 3 the eMotion chip reads them;
  // 4 the engine leaves the phone and the real-time line runs from eMotion into it.
  const s1 = win(t, 1.05, 1.8) * emo; const s2 = win(t, 2.05, 2.8) * emo; const s3 = win(t, 3.05, 3.8) * emo;
  const side = c; // the phone moves to the left column on the first scroll, in both views

  // Copy: step 1 is shared; from step 2 each view has its own text.
  const stepO = (k) => 1 - sm(clamp((Math.abs(t - k) - 0.28) / 0.22));
  texts.forEach((el) => {
    const k = Number(el.dataset.ci);
    let o = stepO(k);
    if (k >= 2) o *= ints;
    el.style.opacity = String(o);
    el.style.transform = RM ? 'none' : `translateY(${((t - k) * -18).toFixed(1)}px)`;
    el.style.filter = !RM && o < 0.98 ? `blur(${((1 - o) * 6).toFixed(2)}px)` : 'none';
  });
  emoTexts.forEach((el) => {
    const k = Number(el.dataset.ce); const o = stepO(k) * emo;
    el.style.opacity = String(o);
    el.style.transform = RM ? 'none' : `translateY(${((t - k) * -18).toFixed(1)}px)`;
    el.style.filter = !RM && o < 0.98 ? `blur(${((1 - o) * 6).toFixed(2)}px)` : 'none';
  });

  rig.rotation.y = 0; // face-on, so no side wall of the phone or watch reads as a second frame

  // Phone.
  phone.position.set(lerp(0, PHONE_X, side), lerp(0, PHONE_Y, side), 0);
  phone.scale.setScalar(lerp(0.92, 1, ph));
  fadePhone(ph);
  phone.rotation.set(RM ? 0 : -0.06 * Math.sin(ph * Math.PI), RM ? 0 : (ph - 1) * Math.PI / 2, 0);

  // Engine chip: into the phone with one full turn; in eMotion view it slides out to the right
  // column so the path reads phone, sensors, eMotion, engine.
  const inPhone = _p.set(phone.position.x, phone.position.y + ENG.y, PZ + 0.18);
  const ex = lerp(inPhone.x, ENGINE_X, s3); const ey = lerp(inPhone.y, 0, s3); const ez = lerp(inPhone.z, 0.15, s3);
  engine.group.position.set(lerp(0, ex, a), lerp(0, ey, a), lerp(0, ez, a));
  engine.group.rotation.set(Math.PI / 2, Math.PI * 2 * a, 0, 'YXZ');
  const beat = s3 > 0.5 ? 0.03 * Math.max(0, Math.sin(time * 9)) : 0.03 * e * ints * Math.sin(time * 4);
  engine.group.scale.setScalar(lerp(1, lerp(ENG.s, CHIP_S, s3), a) * (1 + beat));

  // ----- Integrations view -----
  watch.position.set(lerp(3.2, WATCH_X, c), 0, 0);
  fade(watchMats, watch, wa * ints);
  drawLine(link, lk); intLineMat.opacity = ints;
  showSprite(syncedLabel, 0); // no SYNCED text; the blue line says it
  linkMat.opacity = ints;
  brandTags.forEach((sp, i) => {
    const o = win(t, 2.05 + i * 0.045, 2.3 + i * 0.045);
    sp.position.set(BRAND_X + lerp(0.6, 0, o), brandY(i), 0.2); showSprite(sp, o * ints);
    const li = win(t, 2.25 + i * 0.045, 2.65 + i * 0.045); drawLine(brandLines[i], li);
    _m.compose(brandLines[i].userData.curve.v0, _q.identity(), _s.setScalar(li > 0.95 ? 0.8 * (RM ? 1 : pulse(time, i)) : 0)); brandNodes.setMatrixAt(i, _m);
  });
  brandNodes.instanceMatrix.needsUpdate = true; brandNodes.visible = t > 2.2 && ints > 0.01;
  intDotMat.opacity = ints;
  intRunners.visible = e > 0.01 && ints > 0.01 && !RM;
  if (intRunners.visible) {
    let n = 0;
    brandLines.forEach((ln, i) => { const u = (time * 0.55 + i * 0.29) % 1; ln.userData.curve.getPoint(sm(u), _p); _m.compose(_p, _q.identity(), _s.setScalar(e * pulse(time, i + 3) * (u > 0.96 ? 0 : 1))); intRunners.setMatrixAt(n++, _m); });
    for (let k = 0; k < RUN_LINK; k++) { const u = (time * 0.4 + k / RUN_LINK) % 1; linkCurve.getPoint(u, _p); _m.compose(_p, _q.identity(), _s.setScalar(e * pulse(time, k))); intRunners.setMatrixAt(n++, _m); }
    intRunners.instanceMatrix.needsUpdate = true;
  }

  // ----- eMotion view -----
  // Step 2: the sensors appear one after another, wired from the phone. Step 3: the eMotion chip
  // appears and reads them. Step 4: the real-time line runs from eMotion into the engine.
  emotion.group.position.set(EMO_X, lerp(-0.3, 0, s2), 0.12);
  emotion.group.rotation.set(Math.PI / 2, 0, 0, 'YXZ');
  emotion.group.scale.setScalar(CHIP_S * lerp(0.85, 1, s2));
  emotion.setOpacity(win(s2, 0.1, 0.6));
  emoLineMat.opacity = 1;
  sensorTags.forEach((sp, i) => {
    const o = win(s1, i * 0.1, 0.5 + i * 0.1);
    sp.position.set(SENSOR_X - lerp(0.4, 0, o), sensorY(i), 0.2); showSprite(sp, o);
    drawLine(sensorIn[i], win(s1, 0.15 + i * 0.1, 0.55 + i * 0.1));
    drawLine(sensorOut[i], win(s2, 0.3 + i * 0.08, 0.7 + i * 0.08));
  });
  const rl = win(s3, 0.5, 0.95); drawLine(realLine, rl); realMat.opacity = 1;
  showSprite(realLabel, 0); // no label: the line and its pulses carry it
  emoDotMat.opacity = emo;
  emoRunners.visible = s2 > 0.6 && !RM;
  if (emoRunners.visible) {
    let n = 0;
    sensorOut.forEach((ln, i) => { const u = (time * 0.8 + i * 0.23) % 1; ln.userData.curve.getPoint(u, _p); _m.compose(_p, _q.identity(), _s.setScalar(0.85 * pulse(time, i))); emoRunners.setMatrixAt(n++, _m); });
    // Real time: fast, steady pulses from eMotion into the engine, once the line is in.
    for (let k = 0; k < RUN_REAL; k++) { const u = (time * 1.4 + k / RUN_REAL) % 1; realCurve.getPoint(u, _p); _m.compose(_p, _q.identity(), _s.setScalar(rl > 0.95 ? 1.25 * pulse(time, k + 5) : 0)); emoRunners.setMatrixAt(n++, _m); }
    emoRunners.instanceMatrix.needsUpdate = true;
  }

  // Phone screen: redraws about 30 times a second while the live readout shows.
  if (emo > 0.01 && !RM) liveSteps += 0.4;
  // Otherwise only when what it shows changes (composing the frame is not free).
  const screenKey = (1 - emo).toFixed(2);
  if (emo > 0.01 ? now - lastScreen > 33 : screenKey !== lastScreenKey) { drawPhoneScreen(time, 1 - emo, emo); lastScreen = now; lastScreenKey = screenKey; }

  // Camera: the same eye-level framing as the standing chip, then out to take in all columns.
  const aspectK = Math.max(1, 1.45 / (W / H));
  // One camera for both views, so the phone never jumps when the view changes. At step 2 the
  // camera pans to centre the phone and watch under the title, then settles on the grid as the
  // brands arrive. look.y drops the scene into the middle of the space between tabs and caption.
  const dist = lerp(lerp(11, 14.5, a), 18, side) * aspectK;
  // eMotion fills its columns one step later, so its pan settles over steps 2 to 4.
  const pan = lerp(lerp(-3.0, 0, win(t, 2.0, 2.6)), lerp(-3.0, 0, win(t, 2.0, 3.6)), emo);
  const look = new THREE.Vector3(lerp(0, pan, side), lerp(lerp(0, 0.45, a), 0.6, side), 0);
  camera.position.set(look.x, look.y + dist * 0.1, dist * Math.sqrt(1 - 0.01));
  camera.lookAt(look);
  // Start from the engine's exact framing of the finished chip, then let it go.
  camera.setViewOffset(W, H, viewBase.x, viewBase.y + (window.sportinChipShift || 0) * (1 - a), viewBase.w, viewBase.h); camera.updateProjectionMatrix();
  rig.updateMatrixWorld(true);
  placeSwitch(swO);
  placeChipTitle(win(s2, 0.5, 1));

  renderer.render(scene, camera);
}

// ---------- Scroll and a live loop while it is on screen ----------
let visible = false;
// Before its first step (deck: while the engine scene runs) it hides and draws nothing. It shows
// a moment before the handover, drawing the same finished chip, so there is never a gap.
function paintAt(T, now) {
  const t = T - FROM; const on = t >= -0.02;
  canvas.style.visibility = on ? 'visible' : 'hidden';
  if (!on) { placeSwitch(0); chipTitle.style.opacity = '0'; return; }
  paint(Math.max(0, t), now);
}
const follow = followScroll(sec, { steps: STEPS_ALL, reduced: RM, onFrame: paintAt, keepAlive: () => visible && (modeAt !== modeTarget || (!RM && (follow.t - FROM >= 2 || (mode > 0 && follow.t > FROM)))) });
new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) follow.kick(); }).observe(sec);
window.addEventListener('resize', () => { resize(); paintAt(follow.t); });
resize();
drawWatchScreen();
document.fonts.ready.then(() => { engine.drawEngraving(); emotion.drawEngraving(); drawWatchScreen(); follow.sync(); });
follow.sync();
window.integrateAt = (v) => follow.jump(v + FROM);
window.integrateMode = (m) => sw.querySelector(`button[data-mode="${m}"]`).click();
