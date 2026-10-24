// The SportIn phone as a real 3D object (Three.js, from the deck's import map). It is built in code,
// not loaded from a model file: a champagne titanium body with rounded edges and real thickness, side
// buttons, black glass, a screen and the Dynamic Island. Sizes are in millimetres, close to an
// iPhone 15 Pro. Used live by the Delivery page (delivery-3d.js) and, rendered once to an image,
// as the frame of every other phone on the site (tools/render-phone-frame.html).
import * as THREE from 'three';

export const PHONE = { W: 70.6, H: 146.6, D: 8.25, R: 10.6, SW: 65.2, SH: 141.4, SR: 8.4, BEVEL: 1.25 };
// The island: 20.8 × 6.1 mm, 1.85 mm below the top of the screen.
const ISLAND = { w: 20.8, h: 6.1, top: 1.85 };
const { W, H, D, R, SW, SH, SR, BEVEL } = PHONE;

function roundedPath(p, w, h, r) {
  const x = -w / 2, y = -h / 2;
  p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r);
  p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r);
  p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y);
  return p;
}
const roundedRect = (w, h, r) => roundedPath(new THREE.Shape(), w, h, r);

// A flat rounded rectangle whose UVs run 0..1 across it, so an image fills it edge to edge.
export function plate(w, h, r, segs = 24) {
  const g = new THREE.ShapeGeometry(roundedRect(w, h, r), segs);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, (p.getY(i) + h / 2) / h);
  return g;
}

// A slab with rounded corners and rounded edges, centred on z = 0, total size w × h × d.
function slab(w, h, d, r, bevel, segs = 10) {
  const g = new THREE.ExtrudeGeometry(roundedRect(w - 2 * bevel, h - 2 * bevel, r - bevel), {
    depth: d - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: segs, curveSegments: 32,
  });
  g.translate(0, 0, -(d - 2 * bevel) / 2);
  return g;
}

// The phone. faces: the screen material for each face, front then back (a face with no material
// gets an open screen, so whatever is behind the phone shows through it).
export function buildPhone(faces = [null]) {
  const phone = new THREE.Group();
  const titanium = new THREE.MeshPhysicalMaterial({ color: 0xbfae94, metalness: 1, roughness: 0.3, clearcoat: 0.3, clearcoatRoughness: 0.25 });
  phone.add(new THREE.Mesh(slab(W, H, D, R, BEVEL), titanium));

  const ring = roundedRect(W - 1.5, H - 1.5, R - 0.75); ring.holes.push(roundedPath(new THREE.Path(), SW, SH, SR));
  const glassGeo = new THREE.ShapeGeometry(ring, 32);
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x050506, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 });
  const sheenMat = new THREE.MeshPhysicalMaterial({ color: 0x000000, transparent: true, opacity: 0.04, roughness: 0.05, clearcoat: 1, metalness: 0, depthWrite: false });
  const islandMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const holeMat = new THREE.MeshBasicMaterial({ colorWrite: false }); // an open screen: cut the body away behind it
  faces.forEach((mat, side) => {
    const face = new THREE.Group(); face.rotation.y = side * Math.PI;
    const glass = new THREE.Mesh(glassGeo, glassMat); glass.position.z = D / 2 + 0.02;
    const screen = new THREE.Mesh(plate(SW, SH, SR, 32), mat || holeMat); screen.position.z = D / 2 + 0.04;
    const island = new THREE.Mesh(plate(ISLAND.w, ISLAND.h, ISLAND.h / 2), islandMat);
    island.position.set(0, SH / 2 - ISLAND.top - ISLAND.h / 2, D / 2 + 0.08);
    if (!mat) screen.renderOrder = -1; // the hole first, so the body behind it is not drawn
    face.add(glass, screen, island);
    if (mat) { const sheen = new THREE.Mesh(plate(SW, SH, SR, 32), sheenMat); sheen.position.z = D / 2 + 0.06; face.add(sheen); }
    phone.add(face);
  });

  // Side buttons: the action button and volume on the left, the side button on the right.
  const button = (y, len, side) => {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(1.35, len - 2.7, 6, 16), titanium);
    m.scale.set(0.42, 1, 1); m.position.set(side * (W / 2 - 0.05), y, 0); phone.add(m);
  };
  button(H / 2 - 32, 7, -1); button(H / 2 - 46, 11, -1); button(H / 2 - 60, 11, -1); button(H / 2 - 50, 17, 1);
  phone.userData.islandMat = islandMat; phone.userData.titanium = titanium;
  return phone;
}
