// @ts-nocheck -- imported game was written for non-strict TypeScript; kept as-is.
import * as THREE from 'three';
import { scene } from './scene';

const NP = 90;
const pp = new Float32Array(NP * 3);
const pv = new Float32Array(NP * 3);
const pl = new Float32Array(NP);
const pg = new THREE.BufferGeometry();
let pi = 0;
for (let i = 0; i < NP; i++) pp[i * 3 + 1] = -50;
pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));

const dust = new THREE.Points(pg, new THREE.PointsMaterial({
  color: 0xe0c9a0, size: 0.22, transparent: true, opacity: 0.75, depthWrite: false,
}));
dust.frustumCulled = false;
scene.add(dust);

/** Solta uma nuvem de poeira em (x, y, z). */
export function puff(x: number, y: number, z: number, n: number, sp: number, up: number) {
  for (let k = 0; k < n; k++) {
    const i = (pi = (pi + 1) % NP);
    const r = () => Math.random() - 0.5;
    pp.set([x + r() * sp, y + Math.random() * 0.1, z + r() * sp], i * 3);
    pv.set([r() * sp * 0.6, up * (0.4 + Math.random()), r() * sp * 0.6], i * 3);
    pl[i] = 0.5 + Math.random() * 0.4;
  }
}

export function dustUpdate(dt: number) {
  for (let i = 0; i < NP; i++) {
    if (pl[i] > 0) {
      pl[i] -= dt;
      pp[i * 3] += pv[i * 3] * dt;
      pp[i * 3 + 1] += pv[i * 3 + 1] * dt;
      pp[i * 3 + 2] += pv[i * 3 + 2] * dt;
      pv[i * 3 + 1] -= 1.6 * dt;
    } else {
      pp[i * 3 + 1] = -50;
    }
  }
  pg.attributes.position.needsUpdate = true;
}
