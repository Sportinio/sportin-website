// A SportIn chip, built like a real package: a thin white ceramic substrate, a raised brushed
// platinum lid with the laser engraving, a quiet row of small components around the lid, and
// contact pads along the edges. Shared by the engine scene (the Gamification engine chip) and the
// integrations scene (the same chip plus the Motion chip inside the phone).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const BLUE = '#0751fb';
const logos = {}; const waiting = [];
function wordmark(white) {
  const k = white ? 'white' : 'black';
  if (!logos[k]) { logos[k] = new Image(); logos[k].onload = () => waiting.splice(0).forEach((fn) => fn()); logos[k].src = `/assets/site/logo/sportin-wordmark-${k}.svg`; }
  return logos[k];
}

// Brushed metal: fine streaks in the roughness. One texture for every chip.
let brush = null;
function brushTexture() {
  if (brush) return brush;
  const bc = document.createElement('canvas'); bc.width = bc.height = 512; const bx = bc.getContext('2d');
  bx.fillStyle = 'rgb(120,120,120)'; bx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) { const v = 90 + Math.random() * 80; bx.fillStyle = `rgba(${v},${v},${v},0.35)`; bx.fillRect(Math.random() * 512, Math.random() * 512, 40 + Math.random() * 220, 1); }
  brush = new THREE.CanvasTexture(bc); brush.wrapS = brush.wrapT = THREE.RepeatWrapping; brush.repeat.set(2, 2);
  return brush;
}

function setFont(ctx, weight, size, fam) { ctx.font = `${weight} ${size}px "${fam}", sans-serif`; }

// title: engraved line under the logo; sub: optional small line under it; code: corner mark.
// tone 'blue' gives a blue anodised lid with white engraving (the Motion chip); default is platinum.
export function createChip(renderer, { PW = 5.2, PD = 3.4, title = 'GAMIFICATION ENGINE', sub = '', code = 'SI-E1', tone = 'platinum' } = {}) {
  const blue = tone === 'blue'; const logo = wordmark(blue);
  const group = new THREE.Group();
  const ST = 0.14; const LT = 0.16; const CT = ST + LT;
  const mats = [];
  const cm = (m) => { m.transparent = true; mats.push(m); return m; };
  const substrate = new THREE.Mesh(new RoundedBoxGeometry(PW, ST, PD, 4, 0.05), cm(new THREE.MeshPhysicalMaterial({ color: blue ? 0xe6edff : 0xf1f3f6, roughness: 0.42, metalness: 0.04, clearcoat: 0.35, clearcoatRoughness: 0.35 })));
  substrate.position.y = -CT / 2 + ST / 2; group.add(substrate);
  const LW = PW * 0.62; const LD = PD * 0.64;
  const lidMat = cm(new THREE.MeshPhysicalMaterial(blue
    ? { color: 0x1d5cff, metalness: 0.55, roughness: 0.34, roughnessMap: brushTexture(), clearcoat: 0.5, clearcoatRoughness: 0.25 }
    : { color: 0xdfe3e8, metalness: 1, roughness: 0.42, roughnessMap: brushTexture(), clearcoat: 0.15 }));
  if ('anisotropy' in lidMat) lidMat.anisotropy = 0.6;
  const lid = new THREE.Mesh(new RoundedBoxGeometry(LW, LT, LD, 5, 0.06), lidMat);
  lid.position.y = -CT / 2 + ST + LT / 2; group.add(lid);

  // Laser engraving on the lid.
  const EW = 1024; const EH = Math.round(1024 * (LD / LW));
  const engr = document.createElement('canvas'); engr.width = EW; engr.height = EH; const ectx = engr.getContext('2d');
  const engrTex = new THREE.CanvasTexture(engr); engrTex.colorSpace = THREE.SRGBColorSpace; engrTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const engrFace = new THREE.Mesh(new THREE.PlaneGeometry(LW - 0.16, LD - 0.16).rotateX(-Math.PI / 2), cm(new THREE.MeshStandardMaterial({ map: engrTex, metalness: 0.5, roughness: 0.45, depthWrite: false })));
  engrFace.position.y = CT / 2 + 0.002; group.add(engrFace);
  function drawEngraving() {
    ectx.clearRect(0, 0, EW, EH);
    const cx = EW / 2;
    if (logo.complete && logo.naturalWidth) { const w = 520; const h = w * (logo.naturalHeight / logo.naturalWidth); ectx.globalAlpha = 0.82; ectx.drawImage(logo, cx - w / 2, EH * (sub ? 0.44 : 0.5) - h, w, h); ectx.globalAlpha = 1; }
    setFont(ectx, 600, 44, 'IBM Plex Mono'); ectx.fillStyle = blue ? '#ffffff' : BLUE; ectx.textAlign = 'center'; ectx.fillText(title, cx, EH * (sub ? 0.6 : 0.66));
    if (sub) { setFont(ectx, 600, 30, 'IBM Plex Mono'); ectx.fillStyle = blue ? 'rgba(255,255,255,0.8)' : 'rgba(30,34,42,0.55)'; ectx.fillText(sub, cx, EH * 0.72); }
    setFont(ectx, 500, 20, 'IBM Plex Mono'); ectx.textAlign = 'left'; ectx.fillStyle = blue ? 'rgba(255,255,255,0.55)' : 'rgba(30,34,42,0.4)'; ectx.fillText(code, 46, EH - 46);
    ectx.textAlign = 'right'; ectx.fillText('2026', EW - 46, EH - 46);
    engrTex.needsUpdate = true;
  }
  if (logo.complete && logo.naturalWidth) drawEngraving(); else waiting.push(drawEngraving);

  // Small components in light grey, every other slot, each with metal end caps.
  const topY = -CT / 2 + ST;
  const comps = []; const gapZ = (PD - LD) / 4; const gapX = (PW - LW) / 4;
  for (let x = -LW / 2 + 0.2; x <= LW / 2 - 0.2; x += 0.68) { comps.push([x, LD / 2 + gapZ, 0]); comps.push([x, -LD / 2 - gapZ, 0]); }
  for (let z = -LD / 2 + 0.25; z <= LD / 2 - 0.25; z += 0.68) { comps.push([LW / 2 + gapX, z, 1]); comps.push([-LW / 2 - gapX, z, 1]); }
  const body = new THREE.InstancedMesh(new THREE.BoxGeometry(0.15, 0.07, 0.08), cm(new THREE.MeshPhysicalMaterial({ color: 0x9aa3b2, roughness: 0.45, metalness: 0.15 })), comps.length);
  const caps = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, 0.074, 0.084), cm(new THREE.MeshPhysicalMaterial({ color: 0xcfd5dd, metalness: 1, roughness: 0.25 })), comps.length * 2);
  { const m = new THREE.Matrix4(); const q = new THREE.Quaternion(); const one = new THREE.Vector3(1, 1, 1); const Y = new THREE.Vector3(0, 1, 0); let ci = 0;
    comps.forEach(([x, z, rot], i) => {
      q.setFromAxisAngle(Y, rot ? Math.PI / 2 : 0);
      m.compose(new THREE.Vector3(x, topY + 0.035, z), q, one); body.setMatrixAt(i, m);
      [-1, 1].forEach((sgn) => { const off = new THREE.Vector3(sgn * 0.075, 0, 0).applyQuaternion(q); m.compose(new THREE.Vector3(x + off.x, topY + 0.037, z + off.z), q, one); caps.setMatrixAt(ci++, m); });
    }); }
  group.add(body, caps);
  // Contact pads along the edges of the substrate.
  const NX = 24; const NZ = 15;
  const pads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.008, 0.14), cm(new THREE.MeshPhysicalMaterial({ color: 0xd2d7de, metalness: 1, roughness: 0.3 })), 2 * NX + 2 * NZ);
  { const m = new THREE.Matrix4(); const q = new THREE.Quaternion(); const one = new THREE.Vector3(1, 1, 1); const Y = new THREE.Vector3(0, 1, 0); let i = 0;
    for (let k = 0; k < NX; k++) { const x = -PW / 2 + 0.35 + k * ((PW - 0.7) / (NX - 1)); [PD / 2 - 0.12, -PD / 2 + 0.12].forEach((z) => { q.setFromAxisAngle(Y, 0); m.compose(new THREE.Vector3(x, topY + 0.004, z), q, one); pads.setMatrixAt(i++, m); }); }
    for (let k = 0; k < NZ; k++) { const z = -PD / 2 + 0.35 + k * ((PD - 0.7) / (NZ - 1)); [PW / 2 - 0.12, -PW / 2 + 0.12].forEach((x) => { q.setFromAxisAngle(Y, Math.PI / 2); m.compose(new THREE.Vector3(x, topY + 0.004, z), q, one); pads.setMatrixAt(i++, m); }); } }
  group.add(pads);

  return {
    group, CT, mats, drawEngraving,
    setOpacity(o) { mats.forEach((m) => { m.opacity = o; }); group.visible = o > 0.004; },
  };
}
