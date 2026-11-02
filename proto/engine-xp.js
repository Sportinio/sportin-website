// 04 Solution: the engine as an exploded phone (three.js, from the deck's import map).
// One phone in the club's colours splits into its three layers, then presses back into one phone,
// and the watches and apps fans already use orbit in and dock to it. Driven by the scroll
// (scroll-follow.js), t = 0..5, resting on whole steps:
//   0 the phone, whole, showing the leaderboard;
//   1 the phone slides back and leaves that screen in front, with its callout;
//   2 that screen glides away and the Competitions screen comes out of the phone;  3 Rewards;
//   4 every screen returns into the phone;   5 the watch and the apps orbit in and dock to it.
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
const STEPS = Number(sec.dataset.steps || 5);
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
const body = buildPhone([null]); body.scale.setScalar(MM); phone.add(body); // an open screen: the sheets sit in it
body.userData.titanium.color.set(0x7d1322); body.userData.titanium.roughness = 0.34; // the club's colour, in metal
const SWu = PHONE.SW * MM; const SHu = PHONE.SH * MM; const SRu = PHONE.SR * MM;
const GLASS_Z = (PHONE.D / 2 + 0.04) * MM; // the open screen's depth
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

// ---------- The three sheets ----------
// Each is a thin white sheet with the layer's screen drawn on a canvas. k = 0 is Competitions,
// the front sheet (what the phone shows when whole), then Leaderboards, then Rewards.
const TH = 0.022;
// The order the screens are shown in: the leaderboard is what the phone opens on.
const ORDER = [1, 0, 2];
// Where a screen rests once it has left the phone: just where the phone's screen was, facing you.
const FRONT = new THREE.Vector3(0.1, 0, 0.25);
const LEAVE = new THREE.Vector3(0, 0.9, 0.3); // a screen glides up and a little forward as it goes
const TW = 760; const THH = Math.round(TW * (PHONE.SH / PHONE.SW)); const TEX_W = 1180;
const NAMES = ['Competitions', 'Leaderboards', 'Rewards'];
const sheets = [0, 1, 2].map((k) => {
  const g = new THREE.Group(); rig.add(g);
  const backMat = new THREE.MeshPhysicalMaterial({ color: 0x151a28, roughness: 0.45, metalness: 0.1, clearcoat: 0.5, clearcoatRoughness: 0.3, transparent: true }); // dark, like the app's screens
  // The backing is extruded from the screen's own rounded rectangle, so its corners carry the
  // screen's radius (a rounded box would clamp the radius to half the sheet's thickness).
  const backGeo = new THREE.ExtrudeGeometry(rrShape(SWu, SHu, SRu), { depth: TH, bevelEnabled: false, curveSegments: 24 }); backGeo.translate(0, 0, -TH / 2);
  const back = new THREE.Mesh(backGeo, backMat); g.add(back);
  // Drawn in TW × THH units on a sharper canvas, so a real screenshot stays crisp up close.
  const tex = canvasTex(TEX_W, Math.round(TEX_W * (THH / TW))); tex.ctx.setTransform(TEX_W / TW, 0, 0, TEX_W / TW, 0, 0);
  const scrMat = new THREE.MeshBasicMaterial({ map: tex.tex, toneMapped: false, transparent: true });
  const scr = new THREE.Mesh(plate(SWu - 0.004, SHu - 0.004, SRu - 0.002, 32), scrMat); scr.position.z = TH / 2 + 0.002; g.add(scr);
  const o = ORDER.indexOf(k); const rest = GLASS_Z + 0.003 + (2 - o) * (TH + 0.0015) + TH / 2; // stacked in the screen, the first shown on top
  return { k, o, g, back, backMat, scrMat, tex, rest };
});
const setSheet = (s, o) => { s.backMat.opacity = o; s.scrMat.opacity = o; s.g.visible = o > 0.004; };

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
  drawPill(ctx, s.linked);
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
  ctx.clearRect(0, 0, TW, THH); ctx.drawImage(img, (TW - w) / 2, (THH - h) / 2, w, h);
}
sheets.forEach((s, k) => {
  const img = new Image();
  img.onload = () => { s.shot = img; paintAll(true); };
  img.src = SHOTS[k];
});
function drawPill(ctx, linked) { // once the sources dock: the engine confirms the data flowing in
  if (linked < 0.01) return;
  ctx.globalAlpha = linked; const w = 300; card(ctx, TW / 2 - w / 2, THH - 110, w, 60, 30, '#e8eeff', null);
  dot(ctx, TW / 2 - w / 2 + 34, THH - 80, 9, BLUE); font(ctx, 600, 26); ctx.fillStyle = BLUE; ctx.fillText('11 sources synced', TW / 2 - w / 2 + 58, THH - 71); ctx.globalAlpha = 1;
}
let compKey = '';
function paintScreens(s) {
  const k = JSON.stringify(s, (_, v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v));
  if (k === compKey) return; compKey = k;
  if (sheets[0].shot) { drawShot(0, sheets[0].shot); drawPill(sheets[0].tex.ctx, s.linked); } else drawCompetitions(s);
  sheets[0].tex.tex.needsUpdate = true;
}
function paintAll(force) {
  if (sheets[1].shot) drawShot(1, sheets[1].shot); else drawBoard();
  if (sheets[2].shot) drawShot(2, sheets[2].shot); else drawRewards();
  sheets[1].tex.tex.needsUpdate = true; sheets[2].tex.tex.needsUpdate = true; compKey = '';
  if (force) paintScreens({ linked: lastLinked });
}
let lastLinked = 0;
paintAll();

// ---------- The sources: a watch and the apps fans already use ----------
// Monochrome brand marks from Simple Icons where one exists (placeholders until official assets are
// approved); the others carry their initial.
const SOURCES = [['Apple Health', 'apple'], ['Garmin', 'garmin'], ['Fitbit', 'fitbit'], ['Oura'], ['Whoop'],
  ['Samsung Health', 'samsung'], ['Polar'], ['Suunto'], ['Strava', 'strava'], ['Huawei Health', 'huawei']];
const sources = []; // { obj, mats, slot }
function drawBadge(ctx, name, icon) {
  const W = 256; const Hh = 300; ctx.clearRect(0, 0, W, Hh);
  ctx.beginPath(); ctx.arc(128, 104, 92, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,16,32,0.12)'; ctx.stroke();
  if (icon) ctx.drawImage(icon, 128 - 44, 104 - 44, 88, 88);
  else { font(ctx, 800, 72, 'Archivo', 'semi-expanded'); ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(name[0], 128, 108); ctx.textBaseline = 'alphabetic'; }
  font(ctx, 600, 28); ctx.fillStyle = SLATE; ctx.textAlign = 'center'; ctx.fillText(name, 128, 248); ctx.textAlign = 'left';
}
SOURCES.forEach(([name, slug]) => {
  const { ctx, tex } = canvasTex(256, 300);
  drawBadge(ctx, name, null);
  if (slug) {
    const img = new Image(); img.onload = () => { drawBadge(ctx, name, img); tex.needsUpdate = true; };
    fetch(`https://cdn.jsdelivr.net/npm/simple-icons@13.21.0/icons/${slug}.svg`).then((r) => (r.ok ? r.text() : Promise.reject())).then((svg) => {
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace('<svg ', '<svg fill="#0a1020" '))}`;
    }).catch(() => {});
  }
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false });
  const sp = new THREE.Sprite(mat); rig.add(sp);
  sources.push({ obj: sp, mats: [mat], base: [0.8, 0.8 * (300 / 256), 1] });
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
let ringK = 1; let srcK = 1; // smaller ring and sources on a narrow screen (set in resize)
const ringPoint = (a, r, out) => out.set(Math.cos(a) * RX * ringK * r, Math.sin(a) * RY * ringK * r * Math.cos(TILT), -Math.sin(a) * RY * ringK * r * Math.sin(TILT));
// Where a line from a point outside the phone meets its outline, in the phone's plane.
function edgePoint(p, out) {
  const kx = (PW / 2 + 0.02) / Math.max(1e-4, Math.abs(p.x)); const ky = (PHh / 2 + 0.02) / Math.max(1e-4, Math.abs(p.y));
  const k = Math.min(kx, ky, 1); return out.set(p.x * k, p.y * k, GLASS_Z + 0.05);
}
const _p = new THREE.Vector3(); const _e = new THREE.Vector3(); const _box = new THREE.Box3(); const _q0 = new THREE.Quaternion();

// ---------- Labels (HTML, placed every frame beside each sheet) ----------
const labels = document.createElement('div'); labels.className = 'xp-labels'; labels.setAttribute('aria-hidden', 'true'); stick.appendChild(labels);
const SVG = 'http://www.w3.org/2000/svg';
const leaders = document.createElementNS(SVG, 'svg'); leaders.setAttribute('class', 'xp-leaders'); labels.appendChild(leaders);
const leaderEls = [0, 1, 2].map(() => { const l = document.createElementNS(SVG, 'line'); const c = document.createElementNS(SVG, 'circle'); c.setAttribute('r', '3'); leaders.append(l, c); return { l, c }; });
const LABEL_COPY = [['Competitions', 'Leagues, team battles and challenges, in the club’s name.'], ['Leaderboards', 'Every fan on the board: by fan, supporters’ club or country.'], ['Rewards', 'Prizes from the club, its sponsors and local businesses.']];
const labelEls = LABEL_COPY.map(([t, p], k) => {
  const el = document.createElement('div'); el.className = 'xp-label'; el.dataset.k = String(k);
  el.innerHTML = `<b>LAYER ${ORDER.indexOf(k) + 1}</b><strong>${t}</strong><span>${p}</span>`; labels.appendChild(el); return el;
});

// ---------- Framing ----------
let W = 1; let H = 1; let stacked = false; let shiftX = 0; let shiftY = 0;
function resize() {
  const f = stick.getBoundingClientRect(); W = Math.max(1, f.width); H = Math.max(1, f.height);
  renderer.setSize(W, H, false); camera.aspect = W / H; leaders.setAttribute('viewBox', `0 0 ${W} ${H}`);
  // The scene is centred in the space to the right of the words; on a phone, below them.
  const c = copy.getBoundingClientRect(); stacked = W < 700;
  ringK = stacked ? 0.62 : 1; srcK = stacked ? 0.72 : 1;
  shiftX = stacked ? 0 : (c.right - f.left) / 2;
  shiftY = stacked ? (c.bottom - f.top) / 2 : 0;
  camera.setViewOffset(W, H, -shiftX, -shiftY, W, H); camera.updateProjectionMatrix();
}
const TAN = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
const fitH = (h) => h / (2 * TAN); const fitW = (w) => w / (2 * TAN * camera.aspect);
const _v = new THREE.Vector3();
function project(p) { _v.copy(p).project(camera); return [((_v.x + 1) / 2) * W, ((1 - _v.y) / 2) * H]; }

// ---------- One frame ----------
function paint(t) {
  const x = win(t, 0, 1); // the sheets lift out
  const back = win(t, 3, 3.75); // and press back in
  const open = x * (1 - back); // how far apart the sheets are, 0..1
  const dock = win(t, 4, 4.3); // the sources appear

  // The phone slides back and a little up and left, leaving the screen it showed in front; later it
  // comes forward again and every screen returns into it.
  phone.position.set(lerp(0, -1.2, open), lerp(0, 0.45, open), lerp(0, -4.2, open));
  phone.rotation.set(lerp(0.04, 0.06, open), lerp(-0.16, -0.3, open), 0);
  rig.position.x = stacked ? 0 : lerp(0, -0.45, open); // room on the right for the callout
  phone.updateMatrixWorld(true);
  // Each screen in turn: the one shown first simply stays where it was as the phone leaves it; each
  // next one glides out of the phone while the one before glides away. All return as the phone comes back.
  let focus = -1;
  sheets.forEach((s) => {
    const step = s.o + 1; // the step this screen is in front
    const e = (s.o === 0 ? win(t, 0, 1) : win(t, step - 0.7, step)) * (1 - back); // out of the phone
    const l = step < 3 ? win(t, step, step + 0.55) * (1 - back) : 0; // gone, before the next arrives
    _p.set(0, 0, s.rest); phone.localToWorld(_p); // its place inside the phone, in the world
    _e.copy(FRONT).addScaledVector(LEAVE, l);
    s.g.position.copy(_p).lerp(_e, e);
    s.g.quaternion.copy(phone.quaternion).slerp(_q0, e);
    setSheet(s, 1 - l);
    if (e > 0.9 && l < 0.1) focus = s.k;
  });
  const fb = focus >= 0 ? 1 : 0;

  // The sources orbit in, settle on the ring and dock.
  const stagger = 0.045;
  sources.forEach((s, i) => {
    const u = win(t, 4 + i * stagger, 4.75 + i * stagger);
    // The watch takes the front of the ring on the right; the apps share the rest of it evenly.
    const slot = i === 0 ? 0 : 0.62 + ((i - 1) / (N - 2)) * (Math.PI * 2 - 1.24);
    const a = lerp(slot + 1.6 + s.seed * 1.2, slot, u); const r = lerp(1.9 + s.seed * 0.5, 1, u);
    ringPoint(a, r, s.obj.position); s.obj.position.y += (1 - u) * (0.6 - s.seed * 1.2);
    s.obj.scale.set(s.base[0] * srcK, s.base[1] * srcK, s.base[2] * srcK); s.obj.lookAt(camera.position);
    setSource(s, Math.min(dock, u * 2));
    const L = links[i]; const d = win(t, 4.7 + i * stagger, 4.95 + i * stagger);
    if (d > 0.01) {
      edgePoint(s.obj.position, _e); _p.copy(s.obj.position).lerp(_e, d);
      const pos = L.line.geometry.attributes.position; pos.setXYZ(0, s.obj.position.x, s.obj.position.y, s.obj.position.z); pos.setXYZ(1, _p.x, _p.y, _p.z); pos.needsUpdate = true;
      L.line.visible = true; L.d.visible = d > 0.98; L.d.position.copy(_e);
    } else { L.line.visible = false; L.d.visible = false; }
  });

  // Camera: close on the whole phone, out for the exploded stack, out again for the ring. The
  // distance fits the scene's height and, on a narrow screen, its width.
  const needH = lerp(lerp(6.7, 7.4, open), 9.0, dock); const needW = lerp(lerp(2.6, 3.6, open), 2 * RX * ringK + 1.6 * srcK, dock);
  const dist = Math.max(fitH(needH), fitW(needW));
  camera.position.set(0, 0.2 + dist * 0.06, dist); camera.lookAt(0, lerp(0, 0.25, open), 0);
  scene.updateMatrixWorld(); camera.updateMatrixWorld();

  lastLinked = win(t, 4.8, 5); paintScreens({ linked: lastLinked });

  // Words on the left: the verb of the step in ink; all three once the engine is whole again.
  const step = Math.round(t);
  verbs.forEach((v, k) => v.classList.toggle('is-on', step === 0 ? false : step <= 3 ? k === step - 1 : step === 4 ? k < 3 : k === 3));
  caps.forEach((c, k) => c.classList.toggle('is-on', k === step));
  if (cta) cta.classList.toggle('is-on', step >= 4);

  // The callout: one label beside the screen in front, with a leader line to its top corner.
  sheets.forEach((s, k) => {
    const L = leaderEls[k]; const els = [labelEls[k], L.l, L.c];
    if (focus !== k) { els.forEach((el) => el.classList.remove('is-on', 'is-focus')); return; }
    _box.setFromObject(s.back); let right = -Infinity; let top = Infinity; let bottom = -Infinity;
    for (let i = 0; i < 8; i++) {
      _p.set(i & 1 ? _box.max.x : _box.min.x, i & 2 ? _box.max.y : _box.min.y, i & 4 ? _box.max.z : _box.min.z);
      const [px, py] = project(_p); right = Math.max(right, px); top = Math.min(top, py); bottom = Math.max(bottom, py);
    }
    const lx = Math.round(right + 48); const y = Math.round(top + (bottom - top) * 0.22);
    labelEls[k].style.transform = `translate(${lx}px, ${y}px)`;
    _p.set(SWu / 2 - 0.12, SHu / 2 - 0.3, TH / 2); s.g.localToWorld(_p); const [ax, ay] = project(_p);
    L.l.setAttribute('x1', ax); L.l.setAttribute('y1', ay); L.l.setAttribute('x2', lx - 10); L.l.setAttribute('y2', y + 9);
    L.c.setAttribute('cx', ax); L.c.setAttribute('cy', ay);
    els.forEach((el) => el.classList.add('is-on', 'is-focus'));
  });

  renderer.render(scene, camera);
}

const follow = followScroll(sec, { steps: STEPS, reduced: RM, onFrame: paint });
window.addEventListener('resize', () => { resize(); paint(follow.t); });
resize();
document.fonts.ready.then(() => { resize(); paintAll(true); follow.sync(); });
follow.sync();
window.engineAt = (v) => follow.jump(v);
