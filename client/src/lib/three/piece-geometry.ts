/**
 * Procedural chess piece geometries built with Three.js primitives.
 * LatheGeometry handles the rotationally-symmetric pieces (pawn, rook, bishop, king, queen).
 * ExtrudeGeometry handles the knight silhouette.
 *
 * All pieces are normalized to a unit height of 1.0 — multiply by a scale factor
 * when instantiating to match scene proportions.
 */
import * as THREE from "three";

type LathePoints = Array<[number, number]>;

function lathe(points: LathePoints, segments = 32): THREE.BufferGeometry {
  const vec = points.map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(vec, segments);
  g.computeVertexNormals();
  return g;
}

// ----- Pawn (height ~ 1.0) -----
export function pawnGeometry(): THREE.BufferGeometry {
  return lathe([
    [0, 0],
    [0.22, 0],
    [0.22, 0.05],
    [0.18, 0.1],
    [0.14, 0.18],
    [0.1, 0.4],
    [0.13, 0.55],
    [0.1, 0.6],
    [0.18, 0.7],
    [0.18, 0.78],
    [0.16, 0.82],
    [0, 0.95],
  ]);
}

// ----- Rook (height ~ 1.1) -----
export function rookGeometry(): THREE.BufferGeometry {
  // Body
  const body = lathe([
    [0, 0],
    [0.28, 0],
    [0.28, 0.06],
    [0.2, 0.12],
    [0.18, 0.7],
    [0.22, 0.8],
    [0.24, 0.85],
    [0, 0.85],
  ]);
  // Crenellated top — approximate with a slightly larger cylinder, then merge
  const top = new THREE.CylinderGeometry(0.26, 0.24, 0.18, 12);
  top.translate(0, 0.94, 0);
  return mergeBufferGeometries([body, top]);
}

// ----- Bishop (height ~ 1.2) -----
export function bishopGeometry(): THREE.BufferGeometry {
  const body = lathe([
    [0, 0],
    [0.26, 0],
    [0.26, 0.05],
    [0.2, 0.1],
    [0.15, 0.3],
    [0.13, 0.55],
    [0.18, 0.65],
    [0.13, 0.7],
    [0.18, 0.78],
    [0.12, 0.85],
    [0.13, 0.95],
    [0.08, 1.05],
    [0, 1.12],
  ]);
  return body;
}

// ----- King (height ~ 1.45) -----
export function kingGeometry(): THREE.BufferGeometry {
  const body = lathe([
    [0, 0],
    [0.3, 0],
    [0.3, 0.06],
    [0.22, 0.12],
    [0.16, 0.32],
    [0.13, 0.55],
    [0.18, 0.65],
    [0.13, 0.72],
    [0.2, 0.82],
    [0.22, 0.95],
    [0.18, 1.05],
    [0.18, 1.1],
    [0, 1.1],
  ]);
  // Cross on top: two thin boxes
  const crossV = new THREE.BoxGeometry(0.05, 0.28, 0.05);
  crossV.translate(0, 1.24, 0);
  const crossH = new THREE.BoxGeometry(0.16, 0.05, 0.05);
  crossH.translate(0, 1.22, 0);
  return mergeBufferGeometries([body, crossV, crossH]);
}

// ----- Queen (height ~ 1.35) -----
export function queenGeometry(): THREE.BufferGeometry {
  const body = lathe([
    [0, 0],
    [0.3, 0],
    [0.3, 0.06],
    [0.22, 0.12],
    [0.16, 0.32],
    [0.13, 0.55],
    [0.18, 0.65],
    [0.13, 0.72],
    [0.22, 0.85],
    [0.24, 1.0],
    [0.2, 1.08],
    [0.22, 1.15],
    [0, 1.18],
  ]);
  // Crown spikes — 8 little cones around the top
  const spikes: THREE.BufferGeometry[] = [body];
  const spikeCount = 8;
  for (let i = 0; i < spikeCount; i++) {
    const a = (i / spikeCount) * Math.PI * 2;
    const c = new THREE.ConeGeometry(0.035, 0.12, 6);
    c.translate(Math.cos(a) * 0.18, 1.24, Math.sin(a) * 0.18);
    spikes.push(c);
  }
  return mergeBufferGeometries(spikes);
}

// ----- Knight (height ~ 1.1) -----
export function knightGeometry(): THREE.BufferGeometry {
  // Base column
  const base = lathe([
    [0, 0],
    [0.28, 0],
    [0.28, 0.06],
    [0.2, 0.12],
    [0.16, 0.4],
    [0.16, 0.42],
    [0, 0.42],
  ]);

  // Horse-head silhouette via Shape + ExtrudeGeometry
  const s = new THREE.Shape();
  s.moveTo(-0.05, 0);
  s.lineTo(0.18, 0);
  s.lineTo(0.22, 0.15);
  s.lineTo(0.32, 0.32);
  s.lineTo(0.3, 0.5);
  s.lineTo(0.2, 0.6);
  s.lineTo(0.1, 0.62);
  s.lineTo(0.05, 0.68);
  s.lineTo(0.08, 0.72);
  s.lineTo(0.02, 0.68);
  s.lineTo(-0.18, 0.55);
  s.lineTo(-0.18, 0.4);
  s.lineTo(-0.1, 0.35);
  s.lineTo(-0.1, 0.2);
  s.lineTo(-0.18, 0.1);
  s.lineTo(-0.18, 0);
  s.lineTo(-0.05, 0);

  const head = new THREE.ExtrudeGeometry(s, {
    depth: 0.18,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
    curveSegments: 6,
  });
  head.translate(0, 0.42, -0.09);
  head.computeVertexNormals();
  return mergeBufferGeometries([base, head]);
}

// ----- Lightweight merge (no extra import) -----
function mergeBufferGeometries(geoms: THREE.BufferGeometry[]): THREE.BufferGeometry {
  // Three.js's BufferGeometryUtils merges only when attribute layouts match exactly.
  // For procedural pieces this is acceptable; we manually flatten position+normal.
  const positions: number[] = [];
  const normals: number[] = [];
  for (const g of geoms) {
    const ng = g.toNonIndexed ? g.toNonIndexed() : g;
    const pos = ng.getAttribute("position");
    const norm = ng.getAttribute("normal");
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    }
    if (norm) {
      for (let i = 0; i < norm.count; i++) {
        normals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
      }
    }
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  if (normals.length === positions.length) {
    merged.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  } else {
    merged.computeVertexNormals();
  }
  return merged;
}

export type PieceKind = "pawn" | "rook" | "bishop" | "knight" | "king" | "queen";

const cache: Partial<Record<PieceKind, THREE.BufferGeometry>> = {};

export function getPieceGeometry(kind: PieceKind): THREE.BufferGeometry {
  if (cache[kind]) return cache[kind]!;
  let g: THREE.BufferGeometry;
  switch (kind) {
    case "pawn": g = pawnGeometry(); break;
    case "rook": g = rookGeometry(); break;
    case "bishop": g = bishopGeometry(); break;
    case "knight": g = knightGeometry(); break;
    case "king": g = kingGeometry(); break;
    case "queen": g = queenGeometry(); break;
  }
  cache[kind] = g;
  return g;
}
