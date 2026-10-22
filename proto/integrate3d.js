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
import { createChip } from '/proto/chip3d.js?v=2';
import { followScroll } from '/proto/scroll-follow.js?v=1';

const sec = document.getElementById('integrate');
const stage = sec.querySelector('.engine__stage');
const stick = sec.querySelector('.engine__stick');
const canvas = sec.querySelector('canvas'); stick.prepend(canvas);
const texts = [...sec.querySelectorAll('.eng-txt[data-c]')];
const emoText = sec.querySelector('.eng-txt[data-mode="emotion"]');
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

// ---------- The phone (after the frame Adrian supplied) ----------
// One thin chrome rim, then black glass edge to edge with the white screen inside it, a notch
// with speaker and camera, three buttons left and one right. The black glass covers the whole
// front of the body, so only the rounded metal edge shows: one frame, not two.
const PH = { w: 2.3, h: 4.75, d: 0.22, r: 0.42, sw: 1.96, sh: 4.41 };
const PZ = PH.d / 2 + BEVEL; // front face
const phone = new THREE.Group(); rig.add(phone);
const phoneMats = []; const pm = group(phoneMats);
const steelMat = pm(new THREE.MeshPhysicalMaterial({ color: 0xc8ccd2, metalness: 1, roughness: 0.18, clearcoat: 0.6 }));
phone.add(slab(PH.w, PH.h, PH.r, PH.d, steelMat));
const black = () => pm(new THREE.MeshPhysicalMaterial({ color: 0x07080b, roughness: 0.14, metalness: 0.2, clearcoat: 1 }));
const pGlass = face(PH.w, PH.h, PH.r, black()); pGlass.position.z = PZ + 0.002; phone.add(pGlass);
const PS = canvasTex(640, Math.round(640 * (PH.sh / PH.sw)));
const pScreen = face(PH.sw, PH.sh, 0.3, pm(new THREE.MeshBasicMaterial({ map: PS.tex, toneMapped: false }))); pScreen.position.z = PZ + 0.004; phone.add(pScreen);
const notch = face(0.78, 0.2, 0.1, black()); notch.position.set(0, PH.sh / 2 - 0.09, PZ + 0.006); phone.add(notch);
const speaker = face(0.22, 0.03, 0.015, pm(new THREE.MeshBasicMaterial({ color: 0x2a2d33 }))); speaker.position.set(-0.02, PH.sh / 2 - 0.08, PZ + 0.008); phone.add(speaker);
const cam = new THREE.Mesh(new THREE.CircleGeometry(0.028, 20), pm(new THREE.MeshBasicMaterial({ color: 0x1b2a4a }))); cam.position.set(0.17, PH.sh / 2 - 0.08, PZ + 0.008); phone.add(cam);
[[-1, 1.55, 0.16], [-1, 1.1, 0.34], [-1, 0.62, 0.34], [1, 1.0, 0.55]].forEach(([side, y, len]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, len, 0.09), steelMat); b.position.set(side * (PH.w / 2 + BEVEL + 0.012), y, 0); phone.add(b); });

const ENG = { y: 0.75, s: 0.3 }; // the engine chip's place on the phone, in phone coordinates
const toScreenY = (y) => ((PH.sh / 2 - y) / PH.sh) * PS.c.height;
let liveSteps = 4218;
// The phone screen: the client's brand on top, the engine's slot, and in eMotion view the live
// readout from the phone's own sensors.
function drawPhoneScreen(time, inPhone, emo) {
  const { ctx, c } = PS; const W = c.width; const Hh = c.height;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, Hh);
  font(ctx, 500, 26, 'IBM Plex Mono'); ctx.fillStyle = SLATE; ctx.textAlign = 'center'; ctx.fillText('Your brand', W / 2 + 14, 118);
  const tw = ctx.measureText('Your brand').width; ctx.fillStyle = BLUE; ctx.beginPath(); ctx.arc(W / 2 + 14 - tw / 2 - 18, 109, 7, 0, Math.PI * 2); ctx.fill();
  if (inPhone > 0.01) { ctx.globalAlpha = inPhone; font(ctx, 500, 22, 'IBM Plex Mono'); ctx.fillStyle = MUTE; ctx.fillText('SportIn engine', W / 2, toScreenY(ENG.y - 0.62)); ctx.globalAlpha = 1; }
  if (emo > 0.01) {
    ctx.globalAlpha = emo;
    const y0 = toScreenY(-0.45);
    font(ctx, 600, 22, 'IBM Plex Mono'); const label = 'LIVE · eMotion'; const lw = ctx.measureText(label).width + 48;
    ctx.fillStyle = 'rgba(7,81,251,0.1)'; ctx.beginPath(); ctx.roundRect(W / 2 - lw / 2, y0 - 26, lw, 40, 20); ctx.fill();
    ctx.fillStyle = BLUE; ctx.globalAlpha = emo * (0.55 + 0.45 * Math.sin(time * 5)); ctx.beginPath(); ctx.arc(W / 2 - lw / 2 + 18, y0 - 6, 6, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = emo; ctx.textAlign = 'left'; ctx.fillText(label, W / 2 - lw / 2 + 32, y0 + 2);
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

// ---------- The chips ----------
const engine = createChip(renderer, {}); rig.add(engine.group);
const emotion = createChip(renderer, { title: 'eMotion', sub: 'REAL-TIME', code: 'SI-M1', tone: 'blue' }); rig.add(emotion.group);

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
  font(ctx, 500, 24, 'IBM Plex Mono'); ctx.fillStyle = SLATE; ctx.textAlign = 'center'; ctx.fillText('Your brand', W / 2, 74);
  const cx = W / 2; const cy = 330; ctx.lineWidth = 34; ctx.lineCap = 'round';
  ctx.strokeStyle = '#e9edf4'; ctx.beginPath(); ctx.arc(cx, cy, 150, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = BLUE; ctx.beginPath(); ctx.arc(cx, cy, 150, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.74); ctx.stroke();
  font(ctx, 800, 76, 'Archivo'); ctx.fillStyle = INK; ctx.fillText('7,412', cx, cy + 22);
  font(ctx, 500, 26); ctx.fillStyle = SLATE; ctx.fillText('steps', cx, cy + 62);
  font(ctx, 600, 28, 'IBM Plex Mono'); ctx.fillStyle = INK; ctx.fillText('128 bpm', cx, 590);
  ctx.textAlign = 'left'; WS.tex.needsUpdate = true;
}

// ---------- Tags (brands and sensors) ----------
const TAG = { w: 1.25, h: 0.375 };
function drawTag(ctx, name, icon, dot) {
  ctx.clearRect(0, 0, 400, 120);
  ctx.beginPath(); ctx.roundRect(4, 4, 392, 112, 56); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = dot ? 'rgba(7,81,251,0.28)' : 'rgba(10,16,32,0.12)'; ctx.stroke();
  const iw = icon ? 46 : dot ? 18 : 0; const gap = iw ? 16 : 0;
  let size = 42; font(ctx, 600, size); while (ctx.measureText(name).width > 320 - iw - gap && size > 24) { size -= 2; font(ctx, 600, size); }
  const total = iw + gap + ctx.measureText(name).width; const x0 = 200 - total / 2;
  if (icon) ctx.drawImage(icon, x0, 37, iw, iw);
  if (dot) { ctx.fillStyle = BLUE; ctx.beginPath(); ctx.arc(x0 + 9, 61, 9, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = dot ? INK : SLATE; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(name, x0 + iw + gap, 62);
}
function tagSprite(name, slug, dot = false) {
  const { ctx, tex } = canvasTex(400, 120);
  drawTag(ctx, name, null, dot);
  if (slug) {
    // Monochrome brand icons from Simple Icons; placeholders until official assets are approved.
    const img = new Image(); img.onload = () => { drawTag(ctx, name, img, dot); tex.needsUpdate = true; };
    fetch(`https://cdn.jsdelivr.net/npm/simple-icons@13.21.0/icons/${slug}.svg`).then((r) => (r.ok ? r.text() : Promise.reject())).then((svg) => {
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace('<svg ', '<svg fill="#5a6377" '))}`;
    }).catch(() => {});
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, toneMapped: false }));
  sp.scale.set(TAG.w, TAG.h, 1); rig.add(sp); return sp;
}

// ---------- Lines and pulses ----------
function lineMaterial(color) { return new THREE.MeshBasicMaterial({ color, transparent: true }); }
function tube(curve, mat, radius = 0.008) { const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, radius, 6, false), mat); m.userData.curve = curve; rig.add(m); return m; }
const drawLine = (m, f) => { const n = m.geometry.index.count; m.geometry.setDrawRange(0, Math.floor((n * f) / 6) * 6); m.visible = f > 0.01; };
// A cubic curve that leaves and arrives horizontally, so bundles of lines look tidy.
function hCurve(a, b) { const span = b.x - a.x; return new THREE.CubicBezierCurve3(a, new THREE.Vector3(a.x + span * 0.45, a.y, a.z), new THREE.Vector3(b.x - span * 0.45, b.y, b.z), b); }
const dotGeo = new THREE.SphereGeometry(0.045, 16, 10);
const pulse = (time, i) => 1 + 0.35 * Math.sin(time * 5 + i * 1.7);

// ---------- Layout: three columns ----------
// Integrations: phone | watch | brands. eMotion: phone | sensors | eMotion chip | engine chip.
const PHONE_X = -3.05; const PHONE_Y = 0.5;
const PHONE_EDGE = PHONE_X + PH.w / 2 + BEVEL; // the phone's right edge, where lines leave it
const WATCH_X = 0.35; const COL_X = 3.6; const COL_GAP = 0.6;

// Integrations view.
const BRANDS = [['Apple Health', 'apple'], ['Garmin', 'garmin'], ['Fitbit', 'fitbit'], ['Oura'], ['Whoop'],
  ['Samsung Health', 'samsung'], ['Polar'], ['Suunto'], ['Strava', 'strava'], ['Huawei Health', 'huawei']];
const brandY = (i) => ((BRANDS.length - 1) / 2 - i) * COL_GAP;
const brandTags = BRANDS.map(([name, slug]) => tagSprite(name, slug));
const intLineMat = lineMaterial(0xb9cbf3);
const brandLines = BRANDS.map((_, i) => tube(hCurve(new THREE.Vector3(COL_X - TAG.w / 2 - 0.08, brandY(i), 0.1), new THREE.Vector3(WATCH_X + WC.w / 2 + BEVEL + 0.22, brandY(i) * 0.18, 0.1)), intLineMat));
const linkCurve = hCurve(new THREE.Vector3(WATCH_X - WC.w / 2 - BEVEL - 0.15, 0.05, 0.1), new THREE.Vector3(PHONE_EDGE + 0.15, PHONE_Y - 0.15, 0.1));
const link = tube(linkCurve, intLineMat, 0.01);
const linkMid = linkCurve.getPoint(0.5);
const syncedLabel = labelSprite('SYNCED', '#6b7fae', 1.1);
const intDotMat = new THREE.MeshBasicMaterial({ color: BLUE, transparent: true });
const brandNodes = new THREE.InstancedMesh(dotGeo, intDotMat, BRANDS.length); rig.add(brandNodes);
const RUN_LINK = 3;
const intRunners = new THREE.InstancedMesh(dotGeo, intDotMat, BRANDS.length + RUN_LINK); rig.add(intRunners);

// eMotion view.
const SENSORS = ['GPS', 'Accelerometer', 'Gyroscope', 'Barometer', 'Step counter'];
const SENSOR_X = -0.75; const EMO_X = 1.7; const ENGINE_X = 5.75; const CHIP_S = 0.46;
const sensorY = (i) => ((SENSORS.length - 1) / 2 - i) * COL_GAP;
const sensorTags = SENSORS.map((name) => tagSprite(name, null, true));
const emoLineMat = lineMaterial(0x9db8ff);
const sensorIn = SENSORS.map((_, i) => tube(hCurve(new THREE.Vector3(PHONE_EDGE + 0.06, PHONE_Y + sensorY(i) * 0.45, 0.1), new THREE.Vector3(SENSOR_X - TAG.w / 2 - 0.06, sensorY(i), 0.1)), emoLineMat));
const chipW = 5.2 * CHIP_S;
const sensorOut = SENSORS.map((_, i) => tube(hCurve(new THREE.Vector3(SENSOR_X + TAG.w / 2 + 0.06, sensorY(i), 0.1), new THREE.Vector3(EMO_X - chipW / 2 - 0.08, sensorY(i) * 0.25, 0.1)), emoLineMat));
const realMat = lineMaterial(0x0751fb);
const realCurve = hCurve(new THREE.Vector3(EMO_X + chipW / 2 + 0.08, 0, 0.1), new THREE.Vector3(ENGINE_X - chipW / 2 - 0.08, 0, 0.1));
const realLine = tube(realCurve, realMat, 0.016);
const realLabel = labelSprite('● REAL TIME', BLUE, 2.1);
const emoLabel = labelSprite('eMotion by SportIn', BLUE, 1.9);
const engLabel = labelSprite('SportIn engine', '#6b7488', 1.7);
const emoDotMat = new THREE.MeshBasicMaterial({ color: BLUE, transparent: true });
const RUN_REAL = 4;
const emoRunners = new THREE.InstancedMesh(dotGeo, emoDotMat, SENSORS.length + RUN_REAL); rig.add(emoRunners);

// ---------- The switch: Integrations | eMotion, to the left of the phone ----------
const sw = document.createElement('div'); sw.className = 'int-switch'; sw.setAttribute('role', 'tablist'); sw.setAttribute('aria-label', 'How data reaches the engine');
sw.innerHTML = '<button type="button" role="tab" aria-selected="true" data-mode="0">Integrations</button><button type="button" role="tab" aria-selected="false" data-mode="1"><i aria-hidden="true"></i>eMotion</button>';
stick.appendChild(sw);
let modeTarget = 0; let mode = 0; let modeAt = 0; // 0 Integrations, 1 eMotion; eased over 0.9 s
sw.addEventListener('click', (ev) => {
  const btn = ev.target.closest('button'); if (!btn) return;
  modeTarget = Number(btn.dataset.mode);
  sw.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
  follow.kick();
});
const _proj = new THREE.Vector3();
function placeSwitch(o) {
  sw.style.opacity = String(o); sw.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
  // Sit just left of the phone's left edge, vertically centred on the phone.
  _proj.set(phone.position.x - PH.w / 2 - BEVEL, phone.position.y, 0); rig.localToWorld(_proj).project(camera);
  const f = view; const x = ((_proj.x + 1) / 2) * f.w; const y = ((1 - _proj.y) / 2) * f.h;
  sw.style.transform = `translate(${Math.round(x - sw.offsetWidth - 28)}px, ${Math.round(y - sw.offsetHeight / 2)}px)`;
}

// ---------- Layout ----------
let W = 1; let H = 1; let view = { w: 1, h: 1 };
function resize() {
  const r = stage.getBoundingClientRect(); const f = stick.getBoundingClientRect();
  W = Math.max(1, r.width); H = Math.max(1, r.height); view = { w: f.width, h: f.height };
  renderer.setSize(f.width, f.height, false); camera.aspect = W / H;
  camera.setViewOffset(W, H, f.left - r.left, f.top - r.top + H * 0.07, f.width, f.height);
  camera.updateProjectionMatrix();
}

// ---------- Choreography ----------
const _m = new THREE.Matrix4(); const _q = new THREE.Quaternion(); const _s = new THREE.Vector3(); const _p = new THREE.Vector3();
let lastScreen = 0; let lastNow = 0;
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
  const side = Math.max(c, emo); // the phone sits on the left in both views

  // Copy: the scroll steps for Integrations, one block for eMotion.
  texts.forEach((el, k) => {
    const d = Math.abs(t - k); let o = 1 - sm(clamp((d - 0.28) / 0.22));
    if (k >= 1) o *= ints;
    el.style.opacity = String(o);
    el.style.transform = RM ? 'none' : `translateY(${((t - k) * -18).toFixed(1)}px)`;
    el.style.filter = !RM && o < 0.98 ? `blur(${((1 - o) * 6).toFixed(2)}px)` : 'none';
  });
  if (emoText) { const o = emo * win(t, 0.72, 1.0); emoText.style.opacity = String(o); emoText.style.filter = !RM && o < 0.98 ? `blur(${((1 - o) * 6).toFixed(2)}px)` : 'none'; }

  rig.rotation.y = -0.08 * a + 0.1 * side;

  // Phone.
  phone.position.set(lerp(0, PHONE_X, side), lerp(0, PHONE_Y, side), 0);
  phone.scale.setScalar(lerp(0.92, 1, ph));
  fade(phoneMats, phone, ph);

  // Engine chip: into the phone with one full turn; in eMotion view it slides out to the right
  // column so the path reads phone, sensors, eMotion, engine.
  const inPhone = _p.set(phone.position.x, phone.position.y + ENG.y, PZ + 0.18);
  const ex = lerp(inPhone.x, ENGINE_X, emo); const ey = lerp(inPhone.y, 0, emo); const ez = lerp(inPhone.z, 0.15, emo);
  engine.group.position.set(lerp(0, ex, a), lerp(0, ey, a), lerp(0, ez, a));
  engine.group.rotation.set(Math.PI / 2, Math.PI * 2 * a, 0, 'YXZ');
  const beat = emo > 0.5 ? 0.03 * Math.max(0, Math.sin(time * 9)) : 0.03 * e * Math.sin(time * 4);
  engine.group.scale.setScalar(lerp(1, lerp(ENG.s, CHIP_S, emo), a) * (1 + beat));

  // ----- Integrations view -----
  watch.position.set(lerp(3.2, WATCH_X, c), 0, 0);
  fade(watchMats, watch, wa * ints);
  drawLine(link, lk); intLineMat.opacity = ints;
  showSprite(syncedLabel, lk * ints); syncedLabel.position.set(linkMid.x, linkMid.y + 0.42, 0.2);
  brandTags.forEach((sp, i) => {
    const o = win(t, 2.05 + i * 0.045, 2.3 + i * 0.045);
    sp.position.set(COL_X + lerp(0.6, 0, o), brandY(i), 0.2); showSprite(sp, o * ints);
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
  // The phone's sensors appear one after another, each wired from the phone to the eMotion chip;
  // then the real-time line runs from eMotion to the engine.
  emotion.group.position.set(EMO_X, lerp(-0.3, 0, emo), 0.12);
  emotion.group.rotation.set(Math.PI / 2, 0, 0, 'YXZ');
  emotion.group.scale.setScalar(CHIP_S * lerp(0.85, 1, emo));
  emotion.setOpacity(win(emo, 0.25, 0.7));
  showSprite(emoLabel, win(emo, 0.4, 0.8)); emoLabel.position.set(EMO_X, -(3.4 / 2) * CHIP_S - 0.32, 0.2);
  showSprite(engLabel, win(emo, 0.6, 1)); engLabel.position.set(ENGINE_X, -(3.4 / 2) * CHIP_S - 0.32, 0.2);
  emoLineMat.opacity = 1;
  sensorTags.forEach((sp, i) => {
    const o = win(emo, 0.1 + i * 0.07, 0.4 + i * 0.07);
    sp.position.set(SENSOR_X - lerp(0.4, 0, o), sensorY(i), 0.2); showSprite(sp, o);
    drawLine(sensorIn[i], win(emo, 0.2 + i * 0.07, 0.5 + i * 0.07));
    drawLine(sensorOut[i], win(emo, 0.35 + i * 0.07, 0.65 + i * 0.07));
  });
  const rl = win(emo, 0.65, 0.95); drawLine(realLine, rl); realMat.opacity = 1;
  showSprite(realLabel, rl * (RM ? 1 : 0.7 + 0.3 * Math.sin(time * 5))); realLabel.position.set((EMO_X + ENGINE_X) / 2, 0.4, 0.2);
  emoDotMat.opacity = emo;
  emoRunners.visible = emo > 0.6 && !RM;
  if (emoRunners.visible) {
    let n = 0;
    sensorOut.forEach((ln, i) => { const u = (time * 0.8 + i * 0.23) % 1; ln.userData.curve.getPoint(u, _p); _m.compose(_p, _q.identity(), _s.setScalar(0.85 * pulse(time, i))); emoRunners.setMatrixAt(n++, _m); });
    // Real time: fast, steady pulses from eMotion into the engine.
    for (let k = 0; k < RUN_REAL; k++) { const u = (time * 1.4 + k / RUN_REAL) % 1; realCurve.getPoint(u, _p); _m.compose(_p, _q.identity(), _s.setScalar(1.25 * pulse(time, k + 5))); emoRunners.setMatrixAt(n++, _m); }
    emoRunners.instanceMatrix.needsUpdate = true;
  }

  // Phone screen: redraws about 30 times a second while the live readout shows.
  if (emo > 0.01 && !RM) liveSteps += 0.4;
  if (now - lastScreen > 33 || emo <= 0.01) { drawPhoneScreen(time, 1 - emo, emo); lastScreen = now; }

  // Camera: the same eye-level framing as the standing chip, then out to take in all columns.
  const aspectK = Math.max(1, 1.45 / (W / H));
  const dist = lerp(lerp(11, 12.5, a), lerp(18, 19.5, emo), side) * aspectK;
  const look = new THREE.Vector3(lerp(0, lerp(0.3, 1.2, emo), side), lerp(0, 0.1, a) * (1 - side), 0);
  camera.position.set(look.x, look.y + dist * 0.1, dist * Math.sqrt(1 - 0.01));
  camera.lookAt(look);
  rig.updateMatrixWorld(true);
  placeSwitch(swO);

  sec.style.setProperty('--cap', String(win(t, 3.6, 4) * ints));
  renderer.render(scene, camera);
}

// ---------- Scroll and a live loop while it is on screen ----------
let visible = false;
const follow = followScroll(sec, { steps: 4, reduced: RM, onFrame: paint, keepAlive: () => visible && (modeAt !== modeTarget || (!RM && (follow.t >= 2 || mode > 0))) });
new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) follow.kick(); }).observe(sec);
window.addEventListener('resize', () => { resize(); paint(follow.t); });
resize();
drawWatchScreen();
document.fonts.ready.then(() => { engine.drawEngraving(); emotion.drawEngraving(); drawWatchScreen(); follow.sync(); });
follow.sync();
window.integrateAt = (v) => follow.jump(v);
window.integrateMode = (m) => sw.querySelector(`button[data-mode="${m}"]`).click();
