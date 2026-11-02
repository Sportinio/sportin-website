// 04 Solution: the engine as one holographic phone (three.js, from the deck's import map).
// The phone in the club's colours on a Jarvis-style floor; on its dark screen, the page as a cyan
// hologram, and the page's real elements as solid blocks standing out of it in relief. When the
// page arrives nothing is there: the floor lights, the beam rises, the phone rises into the beam,
// the hologram appears and the blocks rise out of it. Each scroll swaps the screen chip by chip for the next one: Competitions,
// then Rewards. Then the watches and apps fans already use orbit in and dock to the phone.
// Driven by the scroll (scroll-follow.js), t = 0..3, resting on whole steps:
//   0 Leaderboards;   1 Competitions;   2 Rewards;   3 the sources dock.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PHONE, buildPhone, plate } from '/proto/phone3d.js?v=2';
import { followScroll } from '/proto/scroll-follow.js?v=1';

const root = document.documentElement;
const sec = document.getElementById('engine');
const stick = sec.querySelector('.engine__stick');
const canvas = document.getElementById('eng3d');
const copy = sec.querySelector('.engine__copy');
const verbs = [...sec.querySelectorAll('.eng-verbs span[data-v]')];
const caps = [...sec.querySelectorAll('.xp-cap span[data-s]')];
const cta = sec.querySelector('.eng-cta');
const STEPS = Number(sec.dataset.steps || 3);
const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const clamp = (v) => Math.max(0, Math.min(1, v));
const sm = (u) => u * u * u * (u * (u * 6 - 15) + 10); // quintic: soft start and end
const win = (t, a, b) => sm(clamp((t - a) / (b - a)));
const lerp = (a, b, u) => a + (b - a) * u;
const CLUB = '#d7192d'; // the sample club (Northside FC): the engine wears its colour
const INK = '#0a1020'; const SLATE = '#5a6377'; const MUTE = '#8a93a6'; const BLUE = '#0751fb';
const LINE = 'rgba(10,16,32,0.08)'; const GREEN = '#0f9f6e';

// ---------- Renderer, camera, light ----------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch (e) {
  root.classList.add('eng3d-failed'); // the page shows a still phone instead
  throw e;
}
root.classList.add('eng3d-ready');
stick.prepend(canvas);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(renderer), 0.04).texture;
const camera = new THREE.PerspectiveCamera(26, 1, 1, 100);
const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(2.5, 14, 6); scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 0.5); fill.position.set(-6, 4, 8); scene.add(fill);

// ---------- Helpers ----------
function canvasTex(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return { c, ctx: c.getContext('2d'), tex, key: '' };
}
function font(ctx, weight, size, fam = 'Instrument Sans', stretch = 'normal') { ctx.font = `${weight} ${size}px "${fam}", sans-serif`; if ('fontStretch' in ctx) ctx.fontStretch = stretch; }
function card(ctx, x, y, w, h, r = 22, fillS = '#fff', line = LINE, lw = 2) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fillS; ctx.fill(); if (line) { ctx.strokeStyle = line; ctx.lineWidth = lw; ctx.stroke(); } }
function pill(ctx, x, y, text, fg, bg, size = 24) {
  font(ctx, 600, size); const w = ctx.measureText(text).width + 36; const h = size * 1.9;
  card(ctx, x, y, w, h, h / 2, bg, null); ctx.fillStyle = fg; ctx.textBaseline = 'middle'; ctx.fillText(text, x + 18, y + h / 2 + 1); ctx.textBaseline = 'alphabetic';
  return w;
}
function dot(ctx, x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }

// ---------- The phone ----------
const MM = 3.3 / PHONE.H; // world units per millimetre: the phone stands 3.3 units tall
const rig = new THREE.Group(); scene.add(rig);
const phone = new THREE.Group(); rig.add(phone);
const body = buildPhone([null]); body.scale.setScalar(MM); phone.add(body); // an open screen: the hologram sits in it
body.userData.titanium.color.set(0x7d1322); body.userData.titanium.roughness = 0.34; // the club's colour, in metal
// Its materials, so the phone can fade in as it boots (the open screen's depth-only material stays as it is).
const bodyMats = new Set(); body.traverse((o) => { if (o.material && o.material.colorWrite !== false) bodyMats.add(o.material); });
function fadeBody(o) { bodyMats.forEach((m) => { m.opacity = o; const tr = o < 0.999; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } }); body.visible = o > 0.004; }
const SWu = PHONE.SW * MM; const SHu = PHONE.SH * MM; const SRu = PHONE.SR * MM;
const GLASS_Z = (PHONE.D / 2 + 0.04) * MM; // the open screen's depth; the hologram sits just in front of it
const PW = PHONE.W * MM; const PHh = PHONE.H * MM;

// A rounded rectangle, centred, for extruding.
function rrShape(w, h, r) {
  const sh = new THREE.Shape(); const x = -w / 2; const y = -h / 2;
  sh.moveTo(x + r, y); sh.lineTo(x + w - r, y); sh.quadraticCurveTo(x + w, y, x + w, y + r);
  sh.lineTo(x + w, y + h - r); sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  sh.lineTo(x + r, y + h); sh.quadraticCurveTo(x, y + h, x, y + h - r);
  sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y);
  return sh;
}

// ---------- The screen ----------
const TH = 0.022;
// The order the screens are shown in: the leaderboard first.
const ORDER = [1, 0, 2];
const GROUND_Y = -2.5;
const TW = 760; const THH = Math.round(TW * (PHONE.SH / PHONE.SW)); const TEX_W = 1180;
const NAMES = ['Competitions', 'Leaderboards', 'Rewards'];
// One canvas per screen, drawn in TW × THH units on a sharper canvas, so a real screenshot stays crisp.
const sheets = [0, 1, 2].map((k) => {
  const tex = canvasTex(TEX_W, Math.round(TEX_W * (THH / TW))); tex.ctx.setTransform(TEX_W / TW, 0, 0, TEX_W / TW, 0, 0);
  return { k, o: ORDER.indexOf(k), tex };
});
const byOrder = (o) => sheets.find((s) => s.o === o);
const REST_Z = GLASS_Z + 0.01 + TH / 2; // the screen, just in front of the outline's plane

// The screen shader. Two pictures: the one on show and the next; `progress` swaps them chip by chip,
// each chip flashing as it lands. `build` runs once at the boot: from a cyan hologram of the picture
// (its own picture in light, scanlines, a chip grid, a lit edge, a sweep) to the real screen, chip by chip.
const HOLO = new THREE.Color(0x4fd7ff);
const screenMat = new THREE.ShaderMaterial({
  uniforms: { map: { value: byOrder(0).tex.tex }, map2: { value: byOrder(1).tex.tex }, mask: { value: null }, mask2: { value: null }, liftA: { value: 0 }, liftB: { value: 0 }, progress: { value: 0 }, build: { value: 0 }, holo: { value: 0 }, time: { value: 0 }, tint: { value: HOLO }, tiles: { value: new THREE.Vector2(40, 87) } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D map; uniform sampler2D map2; uniform sampler2D mask; uniform sampler2D mask2; uniform float liftA; uniform float liftB;
    uniform float progress; uniform float build; uniform float holo; uniform float time; uniform vec3 tint; uniform vec2 tiles;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main() {
      vec2 cell = floor(vUv * tiles);
      float gate = (1.0 - vUv.y) * 0.7 + hash(cell) * 0.3; // when this chip goes: a wave from the top down, a little scattered
      float ks = smoothstep(gate, gate + 0.3, progress * 1.3); // this picture to the next, each chip cross-fading
      float kb = smoothstep(gate, gate + 0.3, build * 1.3); // hologram to the real screen
      vec3 real = mix(texture2D(map, vUv).rgb, texture2D(map2, vUv).rgb, ks);
      float lum = dot(real, vec3(0.299, 0.587, 0.114));
      float scan = 0.82 + 0.18 * sin(vUv.y * 700.0 - time * 4.0);
      vec2 f = fract(vUv * vec2(26.0, 56.0)); float grid = step(0.94, max(f.x, f.y)) * 0.18;
      vec2 d = min(vUv, 1.0 - vUv); float edge = 1.0 - smoothstep(0.0, 0.022, min(d.x, d.y));
      float sweep = smoothstep(0.06, 0.0, abs(vUv.y - fract(time * 0.18))) * 0.5;
      vec3 hc = tint * (0.22 + lum * 0.9) * scan + tint * (grid + edge * 1.2 + sweep);
      float ha = (0.38 + lum * 0.25 + edge * 0.5) * holo;
      float flashB = smoothstep(0.0, 0.5, kb) * (1.0 - smoothstep(0.5, 1.0, kb)); // a chip lights as it lands
      float flashS = smoothstep(0.0, 0.5, ks) * (1.0 - smoothstep(0.5, 1.0, ks)); // and as it swaps
      vec3 col = mix(hc, real, kb) + tint * (flashB * 0.3 + flashS * 0.3);
      float cut = mix(texture2D(mask, vUv).r * liftA, texture2D(mask2, vUv).r * liftB, ks); // where a block stands, the page is empty
      gl_FragColor = vec4(col, mix(ha, 1.0, kb) * (1.0 - cut));
      #include <colorspace_fragment>
    }`,
  transparent: true,
});
// An empty mask for a screen without blocks.
const NO_MASK = (() => { const c = document.createElement('canvas'); c.width = c.height = 2; const t = new THREE.CanvasTexture(c); return t; })();
screenMat.uniforms.mask.value = NO_MASK; screenMat.uniforms.mask2.value = NO_MASK;
const screenGeo = plate(SWu - 0.004, SHu - 0.004, SRu - 0.002, 32);
// The screen: a dark backing (solid once built) and the shader on top, inside the outline.
const front = new THREE.Group(); front.position.z = REST_Z; phone.add(front);
const frontBackMat = new THREE.MeshPhysicalMaterial({ color: 0x090c16, roughness: 0.3, metalness: 0.1, clearcoat: 0.6, clearcoatRoughness: 0.2, transparent: true }); // the dark screen the hologram shows on
const backGeo = new THREE.ExtrudeGeometry(rrShape(SWu, SHu, SRu), { depth: TH, bevelEnabled: false, curveSegments: 24 }); backGeo.translate(0, 0, -TH / 2);
const frontBack = new THREE.Mesh(backGeo, frontBackMat); front.add(frontBack);
const frontScr = new THREE.Mesh(screenGeo, screenMat); frontScr.position.z = TH / 2 + 0.002; front.add(frontScr);

// ---------- The screen in relief ----------
// The real screenshot, cut into its elements, each floated above the screen at its own height (mm)
// with a soft shadow and a faint rim of light: a hologram of the screen with real depth, every pixel
// the real one. Coordinates are pixels of the screenshot file. Circles are { cx, cy, r }.
const LAYERS = {
  0: [ // Competitions: the two header buttons, the pill, the date bar, every match row whole, the tab bar
    { cx: 74, cy: 165, r: 33, z: 5, t: 'shape' }, { cx: 848, cy: 165, r: 33, z: 5, t: 'shape' },
    { x: 260, y: 420, w: 400, h: 70, r: 35, z: 5, t: 'shape' },
    { x: 42, y: 522, w: 836, h: 80, r: 20, z: 5, t: 'shape' },
    { x: 42, y: 622, w: 836, h: 165, r: 28, z: 6, t: 'shape' },
    { x: 42, y: 806, w: 836, h: 165, r: 28, z: 6, t: 'shape' },
    { x: 42, y: 990, w: 836, h: 165, r: 28, z: 6, t: 'shape' },
    { x: 42, y: 1174, w: 836, h: 165, r: 28, z: 6, t: 'shape' },
    { x: 42, y: 1358, w: 836, h: 165, r: 28, z: 6, t: 'shape' },
    { x: 42, y: 1542, w: 836, h: 148, r: 28, z: 6, t: 'shape' },
    { x: 40, y: 1790, w: 840, h: 125, r: 62, z: 11, t: 'shape' },
  ],
  1: [ // Leaderboards: header pills; the tier cards; filter chips; board buttons; the podium cards with their
       // avatars (plus); the rows; the floating profile image and the switch button; the tab bar
    { x: 232, y: 132, w: 270, h: 88, r: 44, z: 5, t: 'shape' }, { x: 524, y: 132, w: 362, h: 88, r: 44, z: 5, t: 'shape' },
    { x: 35, y: 436, w: 207, h: 228, r: 24, z: 7, t: 'shape' }, { x: 265, y: 436, w: 207, h: 228, r: 24, z: 7, t: 'shape' }, { x: 495, y: 436, w: 207, h: 228, r: 24, z: 7, t: 'shape' }, { x: 725, y: 436, w: 196, h: 228, r: 24, z: 7, t: 'shape' },
    { x: 172, y: 696, w: 174, h: 80, r: 40, z: 6, t: 'shape' }, { x: 365, y: 696, w: 278, h: 80, r: 40, z: 6, t: 'shape' }, { x: 660, y: 696, w: 232, h: 80, r: 40, z: 6, t: 'shape' },
    { x: 46, y: 834, w: 60, h: 60, r: 18, z: 5, t: 'shape' }, { x: 124, y: 834, w: 60, h: 60, r: 18, z: 5, t: 'shape' }, { x: 660, y: 834, w: 60, h: 60, r: 18, z: 5, t: 'shape' }, { x: 738, y: 834, w: 60, h: 60, r: 18, z: 5, t: 'shape' }, { x: 815, y: 834, w: 60, h: 60, r: 18, z: 5, t: 'shape' },
    { x: 46, y: 1100, w: 266, h: 330, r: 28, z: 7, t: 'shape', plus: [{ cx: 178, cy: 1103, r: 66 }] },
    { x: 327, y: 1050, w: 266, h: 380, r: 28, z: 8, t: 'shape', plus: [{ cx: 460, cy: 1050, r: 68 }] },
    { x: 610, y: 1145, w: 266, h: 285, r: 28, z: 7, t: 'shape', plus: [{ cx: 742, cy: 1150, r: 66 }] },
    { x: 46, y: 1535, w: 830, h: 160, r: 28, z: 6, t: 'shape' }, { x: 46, y: 1700, w: 830, h: 160, r: 28, z: 6, t: 'shape' }, { x: 46, y: 1865, w: 830, h: 135, r: 28, z: 6, t: 'shape' },
    { cx: 820, cy: 1540, r: 58, z: 10, t: 'pic', dx: 30, dy: 26 }, { cx: 820, cy: 1680, r: 58, z: 10, t: 'shape', dx: 30, dy: 26 }, // overlays in the app: they hover beside the rows
    { x: 40, y: 1790, w: 840, h: 125, r: 62, z: 11, t: 'shape' },
  ],
  2: [ // Rewards: the header pill; the partner cards; filter chips; every reward row whole; the tab bar
    { x: 700, y: 132, w: 180, h: 88, r: 44, z: 5, t: 'shape' },
    { x: 35, y: 436, w: 207, h: 228, r: 24, z: 7, t: 'shape' }, { x: 265, y: 436, w: 207, h: 228, r: 24, z: 7, t: 'shape' }, { x: 495, y: 436, w: 207, h: 228, r: 24, z: 7, t: 'shape' }, { x: 725, y: 436, w: 196, h: 228, r: 24, t: 'shape', z: 7 },
    { x: 172, y: 696, w: 114, h: 80, r: 40, z: 6, t: 'shape' }, { x: 307, y: 696, w: 194, h: 80, r: 40, z: 6, t: 'shape' },
    { x: 46, y: 930, w: 830, h: 185, r: 36, z: 6, t: 'shape' }, { x: 46, y: 1135, w: 830, h: 190, r: 36, z: 6, t: 'shape' }, { x: 46, y: 1345, w: 830, h: 190, r: 36, z: 6, t: 'shape' }, { x: 46, y: 1555, w: 830, h: 190, r: 36, z: 6, t: 'shape' },
    { x: 40, y: 1790, w: 840, h: 125, r: 62, z: 11, t: 'shape' },
  ],
};
const DEPTH = MM * 1.6; // world units per millimetre of relief
const reliefs = {}; // by sheet k: { group, items, lift, sockets }
// Every piece's rectangle, radius, height and kind, from its spec (a circle is { cx, cy, r }).
const rectOf = (L) => {
  const R = { x: L.cx != null ? L.cx - L.r : L.x, y: L.cy != null ? L.cy - L.r : L.y, w: L.cx != null ? L.r * 2 : L.w, h: L.cy != null ? L.r * 2 : L.h,
    r: L.cx != null ? L.r : Math.min(L.r || 0, L.w / 2, L.h / 2), z: L.z, t: L.t || 'shape', img: L.img, plus: L.plus || [], dx: L.dx || 0, dy: L.dy || 0 };
  // The piece's canvas covers the shape and whatever it carries; the shape itself keeps its own place.
  R.sx = R.x; R.sy = R.y; R.sw = R.w; R.sh = R.h;
  R.plus.forEach((c) => { const x0 = Math.min(R.x, c.cx - c.r); const y0 = Math.min(R.y, c.cy - c.r); R.w = Math.max(R.x + R.w, c.cx + c.r) - x0; R.h = Math.max(R.y + R.h, c.cy + c.r) - y0; R.x = x0; R.y = y0; });
  return R;
};
// The outline of a piece on a canvas, at an offset: its rounded rectangle and the circles it carries.
function outline(ctx, R, ox, oy, grow = 0) {
  ctx.beginPath(); ctx.roundRect(R.sx + ox - grow, R.sy + oy - grow, R.sw + grow * 2, R.sh + grow * 2, R.r);
  R.plus.forEach((c) => { ctx.moveTo(c.cx + ox + c.r + grow, c.cy + oy); ctx.arc(c.cx + ox, c.cy + oy, c.r + grow, 0, Math.PI * 2); });
}
const icons = {}; // real icons from the app, by file, loaded once
const SLAB_T = 1.4 * MM; // a pill's or button's thickness
// The screenshot's own pixels, for sampling what lies around a piece.
function rawOf(sh) {
  if (sh.raw) return sh.raw;
  const c = document.createElement('canvas'); c.width = sh.shot.naturalWidth; c.height = sh.shot.naturalHeight; c.getContext('2d').drawImage(sh.shot, 0, 0);
  sh.raw = c.getContext('2d'); return sh.raw;
}
const sample = (raw, x, y) => { const d = raw.getImageData(Math.max(0, Math.round(x)), Math.max(0, Math.round(y)), 1, 1).data; return [d[0], d[1], d[2]]; };
function buildRelief(sh) {
  const spec = LAYERS[sh.k]; if (!spec || reliefs[sh.k]) return;
  const img = sh.shot; const W = img.naturalWidth; const Hh = img.naturalHeight; const raw = rawOf(sh);
  const sx = (SWu - 0.004) / W; const sy = (SHu - 0.004) / Hh; // world units per screenshot pixel
  const group = new THREE.Group(); front.add(group); const items = []; const sockets = [];
  const rects = spec.map(rectOf);
  rects.forEach((R) => {
    const { x, y, w, h, r } = R;
    // What the screen keeps behind the piece: its surroundings, sampled just outside it.
    const bg = R.t === 'pic' ? sample(raw, x + w / 2, Math.max(0, y - 6)) : sample(raw, x - 8 >= 0 ? x - 8 : x + w + 8, y + h / 2); // a picture: from just above it, outside any card it overhangs
    const lines = []; const lx0 = R.x - 10 >= 0 ? R.x - 10 : R.x + R.w + 10; // just outside the piece, left or right
    const above = R.t === 'pic' ? sample(raw, Math.min(W - 1, R.x + R.w / 2), Math.max(0, R.y - 8)) : null; // a picture: from just above it
    for (let yy = R.y - 1; yy <= R.y + R.h + 1; yy++) lines.push([yy, above || sample(raw, Math.min(W - 1, lx0), Math.max(0, Math.min(Hh - 1, yy)))]);
    sockets.push({ R, lines });
    const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d');
    const PADS = 28; const sc = document.createElement('canvas'); sc.width = w + PADS * 2; sc.height = h + PADS * 2; const sctx = sc.getContext('2d');
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const stex = new THREE.CanvasTexture(sc); stex.colorSpace = THREE.SRGBColorSpace;
    // The shadow of whatever the piece's canvas holds: its own shape, blurred.
    const shadowOf = () => { sctx.clearRect(0, 0, sc.width, sc.height); sctx.filter = 'blur(14px)'; sctx.drawImage(c, PADS, PADS); sctx.filter = 'none'; sctx.globalCompositeOperation = 'source-in'; sctx.fillStyle = 'rgba(0,0,0,0.35)'; sctx.fillRect(0, 0, sc.width, sc.height); sctx.globalCompositeOperation = 'source-over'; stex.needsUpdate = true; };
    if (R.t === 'icon') {
      const draw = (ic) => { ctx.clearRect(0, 0, w, h); ctx.drawImage(ic, 0, 0, w, h); tex.needsUpdate = true; shadowOf(); };
      if (icons[R.img]) { if (icons[R.img].complete) draw(icons[R.img]); else icons[R.img].addEventListener('load', () => draw(icons[R.img])); }
      else { const ic = new Image(); icons[R.img] = ic; ic.addEventListener('load', () => draw(ic)); ic.src = R.img; }
    } else if (R.t === 'text') {
      // Bare text: the piece's pixels with their background keyed out.
      ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
      const id = ctx.getImageData(0, 0, w, h); const d = id.data;
      for (let i = 0; i < d.length; i += 4) {
        const diff = Math.max(Math.abs(d[i] - bg[0]), Math.abs(d[i + 1] - bg[1]), Math.abs(d[i + 2] - bg[2]));
        d[i + 3] = Math.round(255 * Math.max(0, Math.min(1, (diff - 16) / 48)));
      }
      ctx.putImageData(id, 0, 0); tex.needsUpdate = true; shadowOf();
    } else {
      // A picture or a whole shape, clipped to its outline; a shape gets a faint rim of light.
      ctx.save(); outline(ctx, R, -x, -y); ctx.clip(); ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
      // Where a higher piece sits on this shape, the shape keeps an empty socket in its own surface colour.
      if (R.t === 'shape') rects.forEach((B) => {
        if (B === R || B.z <= R.z || B.x + B.w < x || B.x > x + w || B.y + B.h < y || B.y > y + h) return;
        const c2 = sample(raw, Math.max(x + 4, Math.min(x + w - 4, B.x - 12 >= x ? B.x - 12 : B.x + B.w + 12)), Math.max(y + 4, Math.min(y + h - 4, B.y + B.h / 2)));
        ctx.fillStyle = `rgb(${c2[0]},${c2[1]},${c2[2]})`; outline(ctx, B, -x, -y, 1); ctx.fill();
      });
      ctx.restore();
      if (R.t === 'shape') { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(180,235,255,0.55)'); g.addColorStop(0.25, 'rgba(79,215,255,0.12)'); g.addColorStop(1, 'rgba(79,215,255,0.1)'); ctx.strokeStyle = g; ctx.lineWidth = 3; outline(ctx, R, -x, -y, -1.5); ctx.stroke(); }
      tex.needsUpdate = true; shadowOf();
    }
    const g = new THREE.Group(); group.add(g);
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x232b3c, roughness: 0.45, metalness: 0.3, emissive: 0x4fd7ff, emissiveIntensity: 0.08, transparent: true }); // a faint lit edge: height reads by light
    const slab = new THREE.Mesh(new THREE.ExtrudeGeometry(rrShape(R.sw * sx, R.sh * sy, r * sx), { depth: SLAB_T, bevelEnabled: false, curveSegments: 16 }), slabMat); slab.visible = R.t === 'shape'; g.add(slab);
    slab.position.set((R.sx + R.sw / 2 - (x + w / 2)) * sx, ((y + h / 2) - (R.sy + R.sh / 2)) * sy, 0);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w * sx, h * sy), mat); mesh.position.z = (R.t === 'shape' ? SLAB_T : 0) + 0.0008; g.add(mesh);
    const cx = (x + w / 2 - W / 2 + R.dx) * sx; const cy = (Hh / 2 - (y + h / 2) - R.dy) * sy; g.position.set(cx, cy, 0); // dx, dy: where it rests, if not where it came from
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry((w + PADS * 2) * sx, (h + PADS * 2) * sy), new THREE.MeshBasicMaterial({ map: stex, transparent: true, depthWrite: false, toneMapped: false }));
    shadow.position.set(cx + 2 * sx, cy - 8 * sy, 0); group.add(shadow);
    items.push({ g, mesh, slab, shadow, z: R.z });
  });
  items.sort((a, b) => a.z - b.z).forEach((it, i) => { it.mesh.renderOrder = 10 + i * 3 + 2; it.slab.renderOrder = 10 + i * 3 + 1; it.shadow.renderOrder = 10 + i * 3; });
  reliefs[sh.k] = { group, items, lift: 0, sockets };
  paintAll(); // the screen now shows its sockets
}
// Lifts a screen's pieces: 0 flat and hidden, 1 fully in relief.
// Each piece leaves on its own cue during the split, deeper pieces first, with a little overshoot.
const over = (u) => 1 + 2.2 * (u - 1) * (u - 1) * (u - 1) + 1.2 * (u - 1) * (u - 1); // ease out back, ends at 1
function setRelief(k, lift, alpha, enter = 1) {
  const r = reliefs[k]; if (!r) return;
  r.lift = lift; r.group.visible = alpha > 0.01; if (!r.group.visible) return;
  r.items.forEach((it) => {
    const zn = Math.min(1, it.z / 14); const u = clamp((enter - 0.08 - zn * 0.45) / 0.5); const e = u >= 1 ? 1 : over(u);
    const lf = lift * e; it.lf = lf;
    it.g.position.z = TH / 2 + 0.004 + it.z * DEPTH * lf; it.mesh.material.opacity = alpha; it.slab.material.opacity = alpha;
    it.shadow.position.z = TH / 2 + 0.003 + it.z * DEPTH * lf * 0.45; it.shadow.material.opacity = alpha * Math.min(1, lf * 2);
  });
}

// The floor: a ring dial with ticks and a faint grid, fading out, spinning slowly. Additive, so it glows.
const ground = (() => {
  const { ctx, tex } = canvasTex(1024, 1024); const c = 512;
  ctx.strokeStyle = 'rgba(79,215,255,0.55)'; ctx.lineWidth = 2;
  [110, 190, 290, 400, 478].forEach((r, i) => { ctx.lineWidth = i === 4 ? 3 : 1.5; ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.stroke(); });
  for (let i = 0; i < 72; i++) { const a = (i / 72) * Math.PI * 2; const long = i % 6 === 0; ctx.lineWidth = long ? 2 : 1; ctx.beginPath(); ctx.moveTo(c + Math.cos(a) * (long ? 440 : 458), c + Math.sin(a) * (long ? 440 : 458)); ctx.lineTo(c + Math.cos(a) * 478, c + Math.sin(a) * 478); ctx.stroke(); }
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(79,215,255,0.2)'; ctx.beginPath(); ctx.moveTo(c + Math.cos(a) * 110, c + Math.sin(a) * 110); ctx.lineTo(c + Math.cos(a) * 400, c + Math.sin(a) * 400); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(79,215,255,0.12)'; ctx.lineWidth = 1;
  for (let v = 0; v <= 1024; v += 48) { ctx.beginPath(); ctx.moveTo(v, 0); ctx.lineTo(v, 1024); ctx.moveTo(0, v); ctx.lineTo(1024, v); ctx.stroke(); }
  const glow = ctx.createRadialGradient(c, c, 0, c, c, 300); glow.addColorStop(0, 'rgba(79,215,255,0.35)'); glow.addColorStop(1, 'rgba(79,215,255,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 1024, 1024);
  const fade = ctx.createRadialGradient(c, c, 200, c, c, 500); fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'destination-in'; ctx.fillStyle = fade; ctx.fillRect(0, 0, 1024, 1024); ctx.globalCompositeOperation = 'source-over';
  tex.needsUpdate = true;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = GROUND_Y; rig.add(m); return m;
})();
// The projector beam, from the floor up to the phone.
const beam = (() => {
  const { ctx, tex } = canvasTex(64, 256); const g = ctx.createLinearGradient(0, 256, 0, 0);
  g.addColorStop(0, 'rgba(79,215,255,0.55)'); g.addColorStop(1, 'rgba(79,215,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 256); tex.needsUpdate = true;
  const sh = new THREE.Shape(); const top = -SHu / 2 - 0.02; sh.moveTo(-0.25, GROUND_Y); sh.lineTo(0.25, GROUND_Y); sh.lineTo(SWu / 2, top); sh.lineTo(-SWu / 2, top); sh.closePath();
  const geo = new THREE.ShapeGeometry(sh); const pos = geo.attributes.position; const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5, (pos.getY(i) - GROUND_Y) / (top - GROUND_Y));
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0.35 }));
  m.position.set(0, 0, REST_Z - 0.05); rig.add(m); return m;
})();

// Header shared by the three screens: the club on the left, the layer on the right.
function head(ctx, layer) {
  dot(ctx, 72, 92, 9, CLUB); font(ctx, 700, 32); ctx.fillStyle = INK; ctx.fillText('Northside FC', 94, 103);
  font(ctx, 500, 24, 'IBM Plex Mono'); ctx.fillStyle = MUTE; ctx.textAlign = 'right'; ctx.fillText(layer, TW - 60, 101); ctx.textAlign = 'left';
}
function titleRow(ctx, text, sub, y) {
  font(ctx, 800, 58, 'Archivo', 'semi-expanded'); ctx.fillStyle = INK; ctx.fillText(text, 60, y);
  font(ctx, 500, 26); ctx.fillStyle = SLATE; ctx.fillText(sub, 60, y + 44);
}
function ring(ctx, cx, cy, r, w, f, color) {
  ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.strokeStyle = '#eceff5'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  if (f > 0.002) { ctx.strokeStyle = color; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke(); }
  ctx.lineCap = 'butt';
}

function drawCompetitions(s) {
  const { ctx } = sheets[0].tex; ctx.clearRect(0, 0, TW, THH);
  card(ctx, 0, 0, TW, THH, 36, '#fff', null);
  head(ctx, 'L1 · Competition');
  titleRow(ctx, 'Competitions', 'Stand vs stand · Day 4 of 7', 200);
  // Stand vs stand: the club's own fans in two teams, one week.
  card(ctx, 60, 290, TW - 120, 400);
  font(ctx, 500, 24, 'IBM Plex Mono'); ctx.fillStyle = MUTE; ctx.fillText('TEAM COMPETITION', 96, 346);
  const col = (x, letter, name, pts, lead) => {
    card(ctx, x, 380, 96, 96, 24, lead ? CLUB : '#eef1f6', null);
    font(ctx, 800, 48, 'Archivo', 'semi-expanded'); ctx.fillStyle = lead ? '#fff' : INK; ctx.textAlign = 'center'; ctx.fillText(letter, x + 48, 445);
    ctx.textAlign = 'left'; font(ctx, 600, 26); ctx.fillStyle = INK; ctx.fillText(name, x, 520);
    font(ctx, 800, 72, 'Archivo', 'semi-expanded'); ctx.fillStyle = lead ? CLUB : INK; ctx.fillText(pts, x, 600);
  };
  col(96, 'N', 'North Stand', '5.4', true); col(TW / 2 + 40, 'S', 'South Stand', '4.9', false);
  font(ctx, 500, 24, 'IBM Plex Mono'); ctx.fillStyle = MUTE; ctx.fillText('km per fan', 96, 640); ctx.fillText('km per fan', TW / 2 + 40, 640);
  card(ctx, 96, 656, TW - 192, 10, 5, '#eef1f6', null); card(ctx, 96, 656, (TW - 192) * (4 / 7), 10, 5, CLUB, null);
  // The season: the long game, week by week.
  card(ctx, 60, 730, TW - 120, 420);
  font(ctx, 500, 24, 'IBM Plex Mono'); ctx.fillStyle = MUTE; ctx.fillText('SEASON 2026/27', 96, 786);
  font(ctx, 800, 56, 'Archivo', 'semi-expanded'); ctx.fillStyle = INK; ctx.fillText('Week 24', 96, 850);
  const ww = ctx.measureText('Week 24').width; font(ctx, 500, 28); ctx.fillStyle = MUTE; ctx.fillText(' of 38', 96 + ww, 850);
  const GX = 96; const GY = 890; const CW = 26; const CH = 72; const GAPX = (TW - 192 - 19 * CW) / 18;
  for (let w = 0; w < 38; w++) {
    const x = GX + (w % 19) * (CW + GAPX); const yy = GY + Math.floor(w / 19) * (CH + 16);
    card(ctx, x, yy, CW, CH, 7, w < 24 ? CLUB : '#eef1f6', null);
  }
  font(ctx, 500, 26); ctx.fillStyle = SLATE; ctx.fillText('Teams and individuals, every week counts.', 96, 1110);
  // The short game: a goal before kick-off.
  card(ctx, 60, 1190, TW - 120, 380);
  font(ctx, 500, 24, 'IBM Plex Mono'); ctx.fillStyle = MUTE; ctx.fillText('INDIVIDUAL CHALLENGE', 96, 1246);
  ring(ctx, 200, 1400, 96, 20, 6820 / 8000, CLUB);
  font(ctx, 800, 44, 'Archivo', 'semi-expanded'); ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText('6,820', 200, 1414); ctx.textAlign = 'left';
  font(ctx, 700, 32); ctx.fillStyle = INK; ctx.fillText('Walk to the stadium', 340, 1350);
  font(ctx, 500, 26); ctx.fillStyle = SLATE; ctx.fillText('6,820 of 8,000 steps', 340, 1396);
  font(ctx, 500, 26, 'IBM Plex Mono'); ctx.fillStyle = CLUB; ctx.fillText('Kick-off in 02:14:09', 340, 1448);
}

const ROWS = [['AM', 'Ana M.', '14,210', 'Diamond'], ['RP', 'Radu P.', '13,880', 'Diamond'], ['IC', 'Ioana C.', '12,940', 'Platinum'], ['MD', 'Mihai D.', '12,105', 'Platinum'],
  ['EV', 'Elena V.', '11,760', 'Gold'], ['TS', 'Tudor S.', '11,320', 'Gold'], ['CB', 'Cristina B.', '10,980', 'Gold'], ['AP', 'Andrei P.', '10,410', 'Silver']];
const TIERS = [['Bronze', '#b87333'], ['Silver', '#8a93a6'], ['Gold', '#d9a400'], ['Platinum', '#5fa8d3'], ['Diamond', '#0751fb'], ['Master', '#0a1020']];
function drawBoard() {
  const { ctx } = sheets[1].tex; ctx.clearRect(0, 0, TW, THH);
  card(ctx, 0, 0, TW, THH, 36, '#fff', null);
  head(ctx, 'L2 · Leaderboard');
  titleRow(ctx, 'Leaderboard', 'Walking · Individuals · this week', 200);
  let x = 60; TIERS.forEach(([n, c], i) => { x += pill(ctx, x, 280, n, i === 4 ? '#fff' : c, i === 4 ? c : '#f1f3f7', 22) + 10; });
  card(ctx, 60, 360, TW - 120, 60 + ROWS.length * 120 + 20, 22);
  font(ctx, 500, 22, 'IBM Plex Mono'); ctx.fillStyle = MUTE; ctx.fillText('#', 96, 404); ctx.fillText('FAN', 160, 404); ctx.textAlign = 'right'; ctx.fillText('STEPS', TW - 96, 404); ctx.textAlign = 'left';
  ROWS.forEach(([ini, name, steps, tier], i) => {
    const y = 430 + i * 120; const c = TIERS.find((t) => t[0] === tier)[1];
    if (i < ROWS.length - 1) { ctx.fillStyle = LINE; ctx.fillRect(96, y + 110, TW - 192, 2); }
    font(ctx, 700, 30); ctx.fillStyle = i < 3 ? INK : MUTE; ctx.fillText(String(i + 1), 96, y + 66);
    dot(ctx, 190, y + 56, 30, i === 0 ? CLUB : '#eef1f6'); font(ctx, 700, 24); ctx.fillStyle = i === 0 ? '#fff' : SLATE; ctx.textAlign = 'center'; ctx.fillText(ini, 190, y + 65); ctx.textAlign = 'left';
    font(ctx, 600, 30); ctx.fillStyle = INK; ctx.fillText(name, 240, y + 52);
    dot(ctx, 248, y + 86, 7, c); font(ctx, 500, 22, 'IBM Plex Mono'); ctx.fillStyle = MUTE; ctx.fillText(tier, 264, y + 93);
    font(ctx, 800, 34, 'Archivo', 'semi-expanded'); ctx.fillStyle = INK; ctx.textAlign = 'right'; ctx.fillText(steps, TW - 96, y + 68); ctx.textAlign = 'left';
  });
  card(ctx, 60, 1420, TW - 120, 120, 22, '#fff5f6', 'rgba(215,25,45,0.25)');
  font(ctx, 700, 30); ctx.fillStyle = INK; ctx.fillText('You · #412', 96, 1470);
  font(ctx, 500, 26); ctx.fillStyle = SLATE; ctx.fillText('8,120 steps · up 38 places today', 96, 1512);
}

const REWARDS = [['B', 'Free coffee', '8,000 steps · Bean Bar, local business', true], ['P', '20% off running shoes', '10,000 steps · Peak Sports, club sponsor', false], ['N', '15% off match tickets', '12,000 steps · Northside FC', false]];
function drawRewards() {
  const { ctx } = sheets[2].tex; ctx.clearRect(0, 0, TW, THH);
  card(ctx, 0, 0, TW, THH, 36, '#fff', null);
  head(ctx, 'L3 · Reward');
  titleRow(ctx, 'Rewards', 'From the club, its sponsors and local businesses', 200);
  card(ctx, 60, 290, TW - 120, 250);
  ring(ctx, 170, 415, 76, 18, 8120 / 12000, CLUB);
  font(ctx, 800, 56, 'Archivo', 'semi-expanded'); ctx.fillStyle = INK; ctx.fillText('8,120', 290, 408);
  font(ctx, 500, 26); ctx.fillStyle = SLATE; ctx.fillText('steps today', 290, 450); ctx.fillText('next reward at 10,000', 290, 488);
  REWARDS.forEach(([letter, name, meta, open], i) => {
    const y = 590 + i * 260;
    card(ctx, 60, y, TW - 120, 220, 22, open ? '#effaf5' : '#fff', open ? 'rgba(15,159,110,0.3)' : LINE);
    card(ctx, 96, y + 44, 84, 84, 20, open ? GREEN : '#eef1f6', null);
    font(ctx, 800, 40, 'Archivo', 'semi-expanded'); ctx.fillStyle = open ? '#fff' : INK; ctx.textAlign = 'center'; ctx.fillText(letter, 138, y + 100); ctx.textAlign = 'left';
    font(ctx, 700, 32); ctx.fillStyle = INK; ctx.fillText(name, 210, y + 82);
    font(ctx, 500, 24); ctx.fillStyle = SLATE; ctx.fillText(meta, 210, y + 122);
    pill(ctx, 210, y + 148, open ? 'Unlocked' : 'Locked', open ? '#fff' : SLATE, open ? GREEN : '#eef1f6', 22);
  });
  font(ctx, 500, 26); ctx.fillStyle = SLATE; ctx.fillText('Rewards fans run for.', 60, 1440);
}
// Real screens: one screenshot per sheet (proto/media/engine/). Each is drawn to cover the sheet,
// so the sheet's rounded plate clips it to the screen's own corner radius. Until a file loads, or if
// it is missing, the sheet shows its drawn screen.
const SHOTS = ['competitions', 'leaderboards', 'rewards'].map((n) => `/proto/media/engine/${n}.png`);
function drawShot(k, img) {
  const { ctx } = sheets[k].tex;
  const kk = Math.max(TW / img.naturalWidth, THH / img.naturalHeight); const w = img.naturalWidth * kk; const h = img.naturalHeight * kk; // cover
  const ox = (TW - w) / 2; const oy = (THH - h) / 2;
  ctx.clearRect(0, 0, TW, THH); ctx.drawImage(img, ox, oy, w, h);
  // Where a piece has come forward, the screen keeps only its surroundings.
  const r = reliefs[k]; if (!r) return;
  r.sockets.forEach((S) => {
    ctx.save(); ctx.translate(ox, oy); ctx.scale(kk, kk); outline(ctx, S.R, 0, 0, 0.6); ctx.clip();
    // Line by line, the colour of the screen just beside the piece at that height.
    S.lines.forEach(([yy, c]) => { ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; ctx.fillRect(S.R.x - 1, yy, S.R.w + 2, 1.5); });
    ctx.restore();
  });
}
sheets.forEach((s, k) => {
  const img = new Image();
  img.onload = () => { s.shot = img; paintAll(); buildRelief(s); follow.sync(); };
  img.src = SHOTS[k];
});
function paintAll() {
  sheets.forEach((s) => { if (s.shot) drawShot(s.k, s.shot); else [drawCompetitions, drawBoard, drawRewards][s.k]({ linked: 0 }); s.tex.tex.needsUpdate = true; });
}
paintAll();

// ---------- The sources: a watch and the apps fans already use ----------
// Monochrome brand marks from Simple Icons where one exists (placeholders until official assets are
// approved); the others carry their initial.
const SOURCES = [['Apple Health', 'apple'], ['Garmin'], ['Fitbit', 'fitbit'], ['Oura'], ['Whoop'],
  ['Samsung Health'], ['Polar'], ['Suunto'], ['Strava', 'strava'], ['Huawei Health', 'huawei']];
const sources = []; // { obj, mats, slot }
// Brands with no symbol in the icon set get a drawn glyph: a delta for Garmin, a heart for Samsung Health,
// a ring for Oura, a bold letter for Polar, Suunto and Whoop.
function glyph(ctx, name, cx, cy, r) {
  ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
  if (name === 'Garmin') { ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.95, cy + r * 0.7); ctx.lineTo(cx - r * 0.95, cy + r * 0.7); ctx.closePath(); ctx.fill(); }
  else if (name === 'Samsung Health') { ctx.beginPath(); ctx.moveTo(cx, cy + r * 0.85); ctx.bezierCurveTo(cx - r * 1.5, cy - r * 0.2, cx - r * 0.6, cy - r * 1.2, cx, cy - r * 0.4); ctx.bezierCurveTo(cx + r * 0.6, cy - r * 1.2, cx + r * 1.5, cy - r * 0.2, cx, cy + r * 0.85); ctx.fill(); }
  else if (name === 'Oura') { ctx.lineWidth = r * 0.42; ctx.beginPath(); ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2); ctx.stroke(); }
  else { font(ctx, 800, r * 2.1, 'Archivo', 'semi-expanded'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(name[0], cx, cy + r * 0.08); ctx.textBaseline = 'alphabetic'; }
}
function drawBadge(ctx, name, icon, withName = true) {
  const W = 256; const Hh = 300; ctx.clearRect(0, 0, W, Hh);
  ctx.beginPath(); ctx.arc(128, 100, 90, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,16,32,0.12)'; ctx.stroke();
  if (icon) ctx.drawImage(icon, 128 - 50, 100 - 50, 100, 100); else glyph(ctx, name, 128, 100, 44);
  if (withName) { font(ctx, 600, 34); ctx.fillStyle = '#c3cad8'; ctx.textAlign = 'center'; ctx.fillText(name, 128, 258); ctx.textAlign = 'left'; }
}
SOURCES.forEach(([name, slug]) => {
  const { ctx, tex } = canvasTex(256, 300);
  let icon = null; let withName = true; const redraw = (names) => { withName = names; drawBadge(ctx, name, icon, withName); tex.needsUpdate = true; };
  drawBadge(ctx, name, null);
  if (slug) {
    const img = new Image(); img.onload = () => { icon = img; drawBadge(ctx, name, img, withName); tex.needsUpdate = true; };
    fetch(`https://cdn.jsdelivr.net/npm/simple-icons@13.21.0/icons/${slug}.svg`).then((r) => (r.ok ? r.text() : Promise.reject())).then((svg) => {
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace('<svg ', '<svg fill="#0a1020" '))}`;
    }).catch(() => {});
  }
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false });
  const sp = new THREE.Sprite(mat); rig.add(sp);
  sources.push({ obj: sp, mats: [mat], base: [0.8, 0.8 * (300 / 256), 1], redraw });
});
// The watch: a small aluminium case, black glass, a steps ring on its screen.
function buildWatch() {
  const g = new THREE.Group(); const mats = [];
  const m = (mt) => { mt.transparent = true; mats.push(mt); return mt; };
  const alu = m(new THREE.MeshPhysicalMaterial({ color: 0xe4e7eb, metalness: 0.85, roughness: 0.28, clearcoat: 0.2 }));
  const CW = 0.62; const CH = 0.74; const CD = 0.16;
  g.add(new THREE.Mesh(new RoundedBoxGeometry(CW, CH, CD, 4, 0.17), alu));
  const band = m(new THREE.MeshPhysicalMaterial({ color: 0xebedf0, roughness: 0.55, clearcoat: 0.2 }));
  [1, -1].forEach((side) => { const b = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.6, 0.06, 3, 0.03), band); b.position.set(0, side * (CH / 2 + 0.24), -0.03); g.add(b); });
  const glass = new THREE.Mesh(plate(CW - 0.06, CH - 0.06, 0.15), m(new THREE.MeshPhysicalMaterial({ color: 0x07080b, roughness: 0.14, metalness: 0.2, clearcoat: 1 }))); glass.position.z = CD / 2 + 0.002; g.add(glass);
  const ws = canvasTex(256, 300); const { ctx } = ws;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 256, 300); ring(ctx, 128, 130, 70, 18, 0.74, BLUE);
  font(ctx, 800, 44, 'Archivo', 'semi-expanded'); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('7,412', 128, 146); font(ctx, 600, 26); ctx.fillStyle = '#9aa3b5'; ctx.fillText('steps', 128, 250); ctx.textAlign = 'left';
  ws.tex.needsUpdate = true;
  const scr = new THREE.Mesh(plate(CW - 0.12, CH - 0.12, 0.12), m(new THREE.MeshBasicMaterial({ map: ws.tex, toneMapped: false }))); scr.position.z = CD / 2 + 0.004; g.add(scr);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.07, 24).rotateZ(Math.PI / 2), alu); crown.position.set(CW / 2 + 0.03, 0.12, 0); g.add(crown);
  rig.add(g);
  return { obj: g, mats, base: [0.85, 0.85, 0.85] };
}
sources.unshift(buildWatch());
const N = sources.length;
sources.forEach((s, i) => { s.slot = i; s.seed = (i * 0.618) % 1; });
const setSource = (s, o) => { s.mats.forEach((m) => { m.opacity = o; }); s.obj.visible = o > 0.004; };

// Docking lines: one thin line from each docked source to the phone's edge, and a dot where it lands.
const lineMat = new THREE.LineBasicMaterial({ color: 0x0751fb, transparent: true, opacity: 0.55 });
const dotGeo = new THREE.SphereGeometry(0.035, 12, 8);
const dotMat = new THREE.MeshBasicMaterial({ color: 0x0751fb, transparent: true });
const links = sources.map(() => {
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const line = new THREE.Line(geo, lineMat); line.visible = false; rig.add(line);
  const d = new THREE.Mesh(dotGeo, dotMat); d.visible = false; rig.add(d);
  return { line, d };
});
// The orbit: a ring around the phone, tilted so the far side passes behind it.
const RX = 2.85; const RY = 2.6; const TILT = 0.5;
let ringK = 1; let ringKy = 1; let srcK = 1; // a narrower ring and smaller sources on a narrow screen (set in resize)
const ringPoint = (a, r, out) => out.set(Math.cos(a) * RX * ringK * r, Math.sin(a) * RY * ringKy * r * Math.cos(TILT), -Math.sin(a) * RY * ringKy * r * Math.sin(TILT));
// Where a line from a point outside the phone meets its outline, in the phone's plane.
function edgePoint(p, out) {
  const kx = (PW / 2 + 0.02) / Math.max(1e-4, Math.abs(p.x)); const ky = (PHh / 2 + 0.02) / Math.max(1e-4, Math.abs(p.y));
  const k = Math.min(kx, ky, 1); return out.set(p.x * k, p.y * k, GLASS_Z + 0.05);
}
const _p = new THREE.Vector3(); const _e = new THREE.Vector3(); const _box = new THREE.Box3(); const _q0 = new THREE.Quaternion();
let bootAt = null; let bootForce = null; // when the boot began; a fixed boot value, for stills
// Drag to turn the phone freely (any pointer; a sideways drag on touch, the page still scrolls
// vertically). It keeps turning a little after release, and drifts back to rest after a few seconds
// of being left alone. The blocks ride on it and stand out further the more it is turned.
const rot = { x: 0.04, y: -0.16 }; let lastT = 0;
const drag = { on: false, px: 0, py: 0, vx: 0, vy: 0, idle: 0 };
const K = 0.0075; // radians per pixel
stick.addEventListener('pointerdown', (e) => {
  if (RM || e.target.closest('.eng-a, a, button') || !onScreen()) return; // not from the words, and not with reduced motion
  drag.on = true; drag.px = e.clientX; drag.py = e.clientY; drag.vx = drag.vy = 0; drag.idle = performance.now();
  stick.setPointerCapture(e.pointerId); stick.classList.add('is-grabbing'); if (!RM) follow.kick();
});
stick.addEventListener('pointermove', (e) => {
  if (!drag.on) return;
  const dx = e.clientX - drag.px; const dy = e.clientY - drag.py; drag.px = e.clientX; drag.py = e.clientY;
  // Capped at about 50° sideways and 25° up or down from rest, so the screen never turns edge-on and the hologram stays whole.
  rot.y = Math.max(-0.16 - 0.88, Math.min(-0.16 + 0.88, rot.y + dx * K)); rot.x = Math.max(0.04 - 0.45, Math.min(0.04 + 0.45, rot.x + dy * K)); drag.idle = performance.now(); if (Math.abs(dx) + Math.abs(dy) > 2) dragged = true;
  const cap = 0.05; drag.vx = Math.max(-cap, Math.min(cap, dx * K)); drag.vy = Math.max(-cap, Math.min(cap, dy * K)); // a flick glides a little, never a half turn
  if (!RM) follow.kick();
});
const release = () => { if (!drag.on) return; drag.on = false; stick.classList.remove('is-grabbing'); drag.idle = performance.now(); if (!RM) follow.kick(); };
stick.addEventListener('pointerup', release); stick.addEventListener('pointercancel', release);
const onScreen = () => { const r = sec.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight; };

// ---------- Labels (HTML, placed every frame beside each sheet) ----------
const labels = document.createElement('div'); labels.className = 'xp-labels'; labels.setAttribute('aria-hidden', 'true'); stick.appendChild(labels);
const SVG = 'http://www.w3.org/2000/svg';
const leaders = document.createElementNS(SVG, 'svg'); leaders.setAttribute('class', 'xp-leaders'); labels.appendChild(leaders);
const hintEl = document.createElement('div'); hintEl.className = 'xp-hint'; hintEl.textContent = 'Drag to turn'; labels.appendChild(hintEl); let dragged = false;
// The callouts, per screen: where on the screenshot each points (fractions of its width and height),
// its name and, for the smaller ones, one sentence. Placed to the right of the phone every frame.
const CALLOUTS = {
  0: [{ ax: 0.985, ay: 0.17, name: 'Fixtures', text: 'Team against team, a match a week, a table to climb.' },
      { ax: 0.985, ay: 0.281, name: 'Matchday', text: 'Six matches on one day. Every step a fan takes counts for their team.' },
      { ax: 0.93, ay: 0.536, name: 'Live score', text: 'The score moves while fans move: kilometres become goals.' }],
  1: [{ ax: 0.985, ay: 0.275, name: 'Levels', text: 'Everyone competes in their own level, from Bronze to Platinum.' },
      { ax: 0.935, ay: 0.62, name: 'Daily ranking', text: 'Ranked by steps as they move, with a fresh board every morning.' }],
  2: [{ ax: 0.985, ay: 0.275, name: 'Partners', text: 'The club\u2019s sponsors and local shops, each with rewards of its own.' },
      { ax: 0.985, ay: 0.51, name: 'Priced in steps', text: 'Five thousand steps for a cheesecake, ten thousand for a latte.' },
      { ax: 0.985, ay: 0.72, name: 'Funded by partners', text: 'Partners pay for the prizes and meet fans at the moment they earn them.' }],
};
const callouts = []; // { k, c, el, l, dot }
Object.entries(CALLOUTS).forEach(([k, list]) => list.forEach((c) => {
  const el = document.createElement('div'); el.className = 'xp-label' + (c.text ? ' xp-label--small' : ''); el.innerHTML = `<strong>${c.name}</strong>` + (c.text ? `<span>${c.text}</span>` : ''); labels.appendChild(el);
  const l = document.createElementNS(SVG, 'line'); const dot = document.createElementNS(SVG, 'circle'); dot.setAttribute('r', '3'); leaders.append(l, dot);
  callouts.push({ k: Number(k), c, el, l, dot });
}));

// ---------- Framing ----------
let W = 1; let H = 1; let stacked = false; let wasStacked = null; let shiftX = 0; let shiftY = 0;
function resize() {
  const f = stick.getBoundingClientRect(); W = Math.max(1, f.width); H = Math.max(1, f.height);
  renderer.setSize(W, H, false); camera.aspect = W / H; leaders.setAttribute('viewBox', `0 0 ${W} ${H}`);
  // The scene is centred in the space to the right of the words; on a phone, below them.
  const c = copy.getBoundingClientRect(); stacked = W < 700;
  ringK = stacked ? 0.72 : 1; ringKy = stacked ? 1.08 : 1; srcK = stacked ? 0.5 : 1;
  if (stacked !== wasStacked) { wasStacked = stacked; sources.forEach((src) => src.redraw && src.redraw(!stacked)); } // names only where there is room
  shiftX = stacked ? 0 : (c.right - f.left) / 2;
  shiftY = stacked ? (c.bottom - f.top) / 2 - 60 : 0; // on a phone, a little higher than centred below the words, so the base and the hint clear the fold
  camera.setViewOffset(W, H, -shiftX, -shiftY, W, H); camera.updateProjectionMatrix();
}
const TAN = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
const fitH = (h) => h / (2 * TAN); const fitW = (w) => w / (2 * TAN * camera.aspect);
const _v = new THREE.Vector3();
function project(p) { _v.copy(p).project(camera); return [((_v.x + 1) / 2) * W, ((1 - _v.y) / 2) * H]; }

// ---------- One frame ----------
function paint(t, now) {
  const time = (now || 0) / 1000;
  const dock = win(t, 2, 2.3); // the sources appear
  // The split: once the section is on screen, over 1.8 s. Already done when the page arrives further in.
  const rr = sec.getBoundingClientRect(); const vh = window.innerHeight;
  if (rr.bottom < 0 || rr.top > vh) bootAt = null; // off screen: the split plays again on the next arrival
  if (bootAt == null && (RM || t > 0.3)) bootAt = -1e9;
  if (bootAt == null && rr.top < vh * 0.35) bootAt = now || performance.now(); // the split starts as the phone settles into view
  // Leaving at either end: the pieces go back into the phone over the first half screen of travel.
  const leave = RM ? 0 : win(Math.max(rr.top, vh - rr.bottom) / (vh * 0.5), 0, 1);
  const boot = bootForce != null ? bootForce : bootAt == null ? 0 : clamp(((now || performance.now()) - bootAt) / 1800);
  const bFloor = win(boot, 0, 0.4); const bFrame = 1; const bHolo = 1; const bBuild = 1; // the phone is whole from the start; the pieces split out over the boot

  // One phone, facing you with a little turn, breathing gently; turned by hand when dragged, gliding
  // on after release and drifting back to rest after a while; still once the sources dock.
  const live = (1 - dock) * (RM ? 0 : 1);
  const dt = Math.min(0.05, lastT ? time - lastT : 0.016); lastT = time;
  const turn = RM ? 0 : Math.max(win(boot, 0, 0.17) * (1 - win(boot, 0.17, 1)), leave * 0.6); // the split opens with the phone turned, so the lift shows in parallax; it turns a little as the section leaves
  const tx = 0.04 + 0.1 * turn + Math.sin(time * 0.6) * 0.03 * live; const ty = -0.16 - 0.34 * turn + Math.sin(time * 0.45) * 0.09 * live;
  if (!drag.on) {
    const f = dt * 60; rot.y = Math.max(-0.16 - 0.88, Math.min(-0.16 + 0.88, rot.y + drag.vx * f)); rot.x = Math.max(0.04 - 0.45, Math.min(0.04 + 0.45, rot.x + drag.vy * f));
    const decay = Math.exp(-dt * 6); drag.vx *= decay; drag.vy *= decay; // a short glide after release
    const idle = ((now || performance.now()) - drag.idle) / 1000;
    const ease = RM ? 1 : (idle > 2 ? 1 - Math.exp(-dt * 1.5) : 0); // back to rest after two seconds alone
    const dy = ((rot.y - ty + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    rot.y -= dy * ease; rot.x += (tx - rot.x) * ease;
  }
  const tilt = Math.min(1, Math.hypot(rot.x - 0.04, Math.abs(((rot.y + 0.16 + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI)) / 0.6);
  phone.position.set(0, Math.sin(time * 0.8) * 0.04 * live, 0);
  phone.rotation.set(rot.x, rot.y, 0);
  rig.position.x = stacked ? 0 : -0.55 * (1 - dock); // nearer the words, with room on the right for the callouts
  phone.updateMatrixWorld(true);
  front.visible = true;

  // The screen: the picture of this step, swapped chip by chip for the next one on the way to the next step.
  const cur = Math.min(2, Math.floor(t)); const next = Math.min(2, cur + 1);
  // Within a step: the pieces go in, the wave runs down the screen, the next pieces come out.
  const su = cur < 2 ? t - cur : 0;
  const sink = win(su, 0.06, 0.3); const prog = win(su, 0.3, 0.72); const rise = win(su, 0.72, 0.96);
  const u = screenMat.uniforms;
  if (u.map.value !== byOrder(cur).tex.tex) u.map.value = byOrder(cur).tex.tex;
  if (u.map2.value !== byOrder(next).tex.tex) u.map2.value = byOrder(next).tex.tex;
  u.progress.value = prog; u.build.value = bBuild; u.holo.value = bHolo; u.time.value = time; // a hologram while it boots, then the real screen
  frontBackMat.opacity = bHolo; frontBack.visible = bHolo > 0.02;
  // The pieces rise once the screen is built, sink before a swap and rise again after it.
  const up = (1 - dock * 0.5) * (1 + 0.25 * Math.min(1, tilt / 0.85)); // a little further out as the phone tilts, up to about thirty degrees
  const enter = RM ? 1 : boot * (1 - leave); // the split's progress, undone as the section leaves
  sheets.forEach((sh2) => {
    const on = ORDER[cur] === sh2.k ? 1 - sink : ORDER[next] === sh2.k && cur < 2 ? rise : 0;
    const shown = ORDER[cur] === sh2.k ? 1 - win(prog, 0.4, 0.55) : ORDER[next] === sh2.k && cur < 2 ? win(prog, 0.45, 0.6) : 0; // swapped with the screen itself
    setRelief(sh2.k, up * on, shown, enter);
  });

  ground.rotation.z = time * 0.04; ground.material.opacity = bFloor * (1 - dock * 0.5);
  beam.material.opacity = 0.35 * bFloor * (1 - dock); beam.scale.y = bFloor; beam.position.y = GROUND_Y * (1 - bFloor);
  // The callout names the picture on show; it steps aside while the chips swap.
  const shown = prog < 0.5 ? cur : next;
  const focus = boot > 0.9 && dock < 0.01 && !drag.on && tilt < 0.6 && (prog < 0.12 || prog > 0.88) ? ORDER[shown] : -1; // and while the phone is turned // and once the sources arrive
  const fb = focus >= 0 ? 1 : 0;

  // The sources orbit in, settle on the ring and dock.
  const stagger = 0.02; // every source and its line are home by the last step
  sources.forEach((s, i) => {
    const u = win(t, 2 + i * stagger, 2.55 + i * stagger);
    // The watch takes the front of the ring on the right; the apps share the rest of it evenly.
    // The watch at the right (on phones: at the bottom, in front); the apps share the rest of the ring evenly.
    const w0 = stacked ? -Math.PI / 2 : 0; const gap = stacked ? 0.7 : 0.62;
    const slot = i === 0 ? w0 : w0 + gap + ((i - 1) / (N - 2)) * (Math.PI * 2 - 2 * gap);
    const a = lerp(slot + 1.6 + s.seed * 1.2, slot, u); const r = lerp(1.9 + s.seed * 0.5, 1, u);
    ringPoint(a, r, s.obj.position); s.obj.position.y += (1 - u) * (0.6 - s.seed * 1.2);
    s.obj.scale.set(s.base[0] * srcK, s.base[1] * srcK, s.base[2] * srcK); s.obj.lookAt(camera.position);
    setSource(s, Math.min(dock, u * 2));
    const L = links[i]; const d = win(t, 2.55 + i * stagger, 2.8 + i * stagger);
    if (d > 0.01) {
      edgePoint(s.obj.position, _e); _p.copy(s.obj.position).lerp(_e, d);
      const pos = L.line.geometry.attributes.position; pos.setXYZ(0, s.obj.position.x, s.obj.position.y, s.obj.position.z); pos.setXYZ(1, _p.x, _p.y, _p.z); pos.needsUpdate = true;
      L.line.visible = true; L.d.visible = d > 0.98; L.d.position.copy(_e);
    } else { L.line.visible = false; L.d.visible = false; }
  });

  // Camera: on the phone and its floor, out for the ring. The distance fits the scene's height and,
  // on a narrow screen, its width.
  const needH = lerp(5.1, 9.0, dock); const needW = lerp(3.0, 2 * RX * ringK + 2.4 * srcK, dock);
  const dist = Math.max(fitH(needH), fitW(needW));
  camera.position.set(0, 0.2 + dist * 0.1, dist); camera.lookAt(0, lerp(0.12, -0.4, dock), 0); // the phone sits clear of the nav bar
  scene.updateMatrixWorld(); camera.updateMatrixWorld();

  // Words on the left: the verb of the step in ink.
  const step = Math.round(t);
  verbs.forEach((v, k) => v.classList.toggle('is-on', k === step));
  caps.forEach((c, k) => c.classList.toggle('is-on', k === step));
  if (cta) cta.classList.toggle('is-on', step >= 3);

  // The callouts of the screen in front, to the right of the phone, each with a leader line to its
  // place on the screen; kept at least 64px apart, top to bottom.
  let right = -Infinity;
  if (focus >= 0) { _box.setFromObject(frontScr); for (let i = 0; i < 8; i++) { _p.set(i & 1 ? _box.max.x : _box.min.x, i & 2 ? _box.max.y : _box.min.y, i & 4 ? _box.max.z : _box.min.z); right = Math.max(right, project(_p)[0]); } }
  const lx = Math.round(right + 48); let lastY = -Infinity;
  callouts.forEach((C) => {
    const els = [C.el, C.l, C.dot];
    if (C.k !== focus) { els.forEach((el) => el.classList.remove('is-on', 'is-focus')); return; }
    _p.set((C.c.ax - 0.5) * SWu, (0.5 - C.c.ay) * SHu, TH / 2); front.localToWorld(_p); const [ax, ay] = project(_p);
    const y = Math.round(Math.max(ay - 10, lastY + 64)); lastY = y + (C.c.text ? 36 : 0);
    C.el.style.transform = `translate(${lx}px, ${y}px)`;
    C.l.setAttribute('x1', ax); C.l.setAttribute('y1', ay); C.l.setAttribute('x2', lx - 10); C.l.setAttribute('y2', y + 9);
    C.dot.setAttribute('cx', ax); C.dot.setAttribute('cy', ay);
    els.forEach((el) => el.classList.add('is-on', 'is-focus'));
  });

  // The hint: under the phone once it is built, until the first drag or the docking.
  if (!RM && !dragged && boot > 0.95 && dock < 0.01) {
    _p.set(0, -PHh / 2 - 0.3, 0); phone.localToWorld(_p); const [hx, hy] = project(_p);
    hintEl.style.transform = `translate(${Math.round(hx)}px, ${Math.round(hy)}px) translate(-50%, 0)`; hintEl.classList.add('is-on');
  } else hintEl.classList.remove('is-on');

  renderer.render(scene, camera);
}

const follow = followScroll(sec, { steps: STEPS, reduced: RM, onFrame: paint, keepAlive: () => !RM && onScreen(), cruise: 0.34, acc: 0.9 }); // a slow, even pace: about 3.5 s per step
window.addEventListener('resize', () => { resize(); paint(follow.t); });
resize();
document.fonts.ready.then(() => { resize(); paintAll(); follow.sync(); });
follow.sync();
window.engineAt = (v) => follow.jump(v);
window.engineBoot = (v) => { bootForce = v; paint(follow.t, performance.now()); }; // stills of the boot
window.engineState = () => ({ t: Math.round(follow.t * 100) / 100, lifts: Object.fromEntries(Object.entries(reliefs).map(([k, r]) => [k, Math.round(Math.max(...r.items.map((it) => it.lf || 0)) * 100) / 100])) }); // for checks
