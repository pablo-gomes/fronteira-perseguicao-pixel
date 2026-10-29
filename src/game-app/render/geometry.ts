import * as THREE from 'three';
import { shadM, whiteM } from './materials';

export const BOX  = new THREE.BoxGeometry(1, 1, 1);
/** Cilindro baixo-poli (pixel-art): 8 lados por padrão */
export const CYL6  = new THREE.CylinderGeometry(0.5, 0.5, 1, 6);
export const CYL8  = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
export const CYL12 = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
/** Cone 6-lados */
export const CONE6 = new THREE.ConeGeometry(0.5, 1, 6);
export const CONE8 = new THREE.ConeGeometry(0.5, 1, 8);
/** Esfera pixelada */
export const SPH6  = new THREE.SphereGeometry(0.5, 6, 4);
export const SPH8  = new THREE.SphereGeometry(0.5, 8, 6);
/** Octahedron (losango 3D) */
export const OCT   = new THREE.OctahedronGeometry(0.5, 0);
/** Prisma triangular (telhado, rampa) — extrusão de triângulo */
const _triShape = new THREE.Shape([
  new THREE.Vector2(-0.5, 0),
  new THREE.Vector2( 0.5, 0),
  new THREE.Vector2( 0,   1),
]);
export const PRISM = new THREE.ExtrudeGeometry(_triShape, {
  depth: 1, bevelEnabled: false,
});
PRISM.translate(0, 0, -0.5);

// ─── helpers de construção ─────────────────────────────────

function _setup(o: THREE.Mesh, m: THREE.Material, cast: boolean) {
  if (m === shadM || m === whiteM) return;
  o.receiveShadow = true;
  if (cast) o.castShadow = true;
}

/** Bloco escalado (o "pixel" padrão). */
export function box(
  w: number, h: number, d: number,
  m: THREE.Material,
  x: number, y: number, z: number,
  p?: THREE.Object3D,
  cast: boolean = false,
): THREE.Mesh {
  const o = new THREE.Mesh(BOX, m);
  o.scale.set(w, h, d);
  o.position.set(x, y, z);
  _setup(o, m, cast);
  if (p) p.add(o);
  return o;
}

/** Cilindro (n = número de lados: 6, 8, 12 ou customizado). */
export function cyl(
  r: number, h: number,
  m: THREE.Material,
  x: number, y: number, z: number,
  p?: THREE.Object3D,
  n: number = 8,
  cast: boolean = false,
): THREE.Mesh {
  const geo = n === 6 ? CYL6 : n === 12 ? CYL12 : n === 8 ? CYL8 : new THREE.CylinderGeometry(0.5, 0.5, 1, n);
  const o = new THREE.Mesh(geo, m);
  o.scale.set(r * 2, h, r * 2);
  o.position.set(x, y, z);
  _setup(o, m, cast);
  if (p) p.add(o);
  return o;
}

/** Cone. */
export function cone(
  r: number, h: number,
  m: THREE.Material,
  x: number, y: number, z: number,
  p?: THREE.Object3D,
  n: number = 8,
  cast: boolean = false,
): THREE.Mesh {
  const geo = n === 6 ? CONE6 : n === 8 ? CONE8 : new THREE.ConeGeometry(0.5, 1, n);
  const o = new THREE.Mesh(geo, m);
  o.scale.set(r * 2, h, r * 2);
  o.position.set(x, y, z);
  _setup(o, m, cast);
  if (p) p.add(o);
  return o;
}

/** Esfera pixelada. */
export function sph(
  r: number,
  m: THREE.Material,
  x: number, y: number, z: number,
  p?: THREE.Object3D,
  n: 6 | 8 = 8,
  cast: boolean = false,
): THREE.Mesh {
  const geo = n === 6 ? SPH6 : SPH8;
  const o = new THREE.Mesh(geo, m);
  o.scale.setScalar(r * 2);
  o.position.set(x, y, z);
  _setup(o, m, cast);
  if (p) p.add(o);
  return o;
}

/** Octahedron (losango, estrela, marcador). */
export function oct(
  r: number,
  m: THREE.Material,
  x: number, y: number, z: number,
  p?: THREE.Object3D,
  cast: boolean = false,
): THREE.Mesh {
  const o = new THREE.Mesh(OCT, m);
  o.scale.setScalar(r * 2);
  o.position.set(x, y, z);
  _setup(o, m, cast);
  if (p) p.add(o);
  return o;
}

/** Prisma triangular (telhados, rampas). */
export function prism(
  w: number, h: number, d: number,
  m: THREE.Material,
  x: number, y: number, z: number,
  p?: THREE.Object3D,
  cast: boolean = false,
): THREE.Mesh {
  const o = new THREE.Mesh(PRISM, m);
  o.scale.set(w, h, d);
  o.position.set(x, y, z);
  _setup(o, m, cast);
  if (p) p.add(o);
  return o;
}

/** Disco plano (rodas, tampas). */
export function disc(
  r: number, h: number,
  m: THREE.Material,
  x: number, y: number, z: number,
  p?: THREE.Object3D,
): THREE.Mesh {
  const o = new THREE.Mesh(CYL12, m);
  o.scale.set(r * 2, h, r * 2);
  o.position.set(x, y, z);
  _setup(o, m, false);
  if (p) p.add(o);
  return o;
}

/** Cilindro cônico / tronco de cone com raios de topo e base ajustáveis. */
export function taperCyl(
  rt: number, rb: number, h: number,
  m: THREE.Material,
  x: number, y: number, z: number,
  p?: THREE.Object3D,
  n: number = 8,
  cast: boolean = false,
): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(rt, rb, h, n);
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  _setup(o, m, cast);
  if (p) p.add(o);
  return o;
}

/** Cluster poliédrico orgânico facetado para copas de árvores e arbustos. */
export const DODECA = new THREE.DodecahedronGeometry(0.5, 0);
export function cluster(
  r: number,
  m: THREE.Material,
  x: number, y: number, z: number,
  p?: THREE.Object3D,
  cast: boolean = false,
): THREE.Mesh {
  const o = new THREE.Mesh(DODECA, m);
  o.scale.setScalar(r * 2);
  o.position.set(x, y, z);
  _setup(o, m, cast);
  if (p) p.add(o);
  return o;
}

/** Cunha / rampa inclinada para capôs de veículos, para-brisas e telhados. */
const _wedgeShape = new THREE.Shape([
  new THREE.Vector2(-0.5, -0.5),
  new THREE.Vector2( 0.5, -0.5),
  new THREE.Vector2( 0.5,  0.5),
]);
export const WEDGE = new THREE.ExtrudeGeometry(_wedgeShape, { depth: 1, bevelEnabled: false });
WEDGE.translate(0, 0, -0.5);

export function wedge(
  w: number, h: number, d: number,
  m: THREE.Material,
  x: number, y: number, z: number,
  p?: THREE.Object3D,
  cast: boolean = false,
): THREE.Mesh {
  const o = new THREE.Mesh(WEDGE, m);
  o.scale.set(w, h, d);
  o.position.set(x, y, z);
  _setup(o, m, cast);
  if (p) p.add(o);
  return o;
}

