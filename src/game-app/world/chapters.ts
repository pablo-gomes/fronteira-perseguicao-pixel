// @ts-nocheck -- imported game was written for non-strict TypeScript; kept as-is.
import * as THREE from 'three';
import { G } from '../game/state';
import { hemi, dl, sun, sunCorona, scene } from '../render/scene';
import { skyTex } from '../render/textures';
import { asphaltM, paveM } from '../render/materials';
import { genLevel } from './level';
import { arcCP, arcEnd } from './segments';

export interface Chapter {
  n: string;   // título exibido ao iniciar
  pl: string;  // lugar
  len: number; // distância em metros
  top: string; mid: string; hor: string; // cores do céu
  road: number; pave: number;            // cores do asfalto e da calçada
  pc: [number, number];                  // faixa de cores das paredes
  sg: [number, number];                  // faixa de placas
  sp: [number, number];                  // espaçamento entre obstáculos (início, fim)
  w: [number, number];                   // pesos de pulo e agachar
  amb: number; sun: number; sc: number;  // luzes
  fg: number;                            // alcance da névoa
  rural?: boolean;
  coast?: boolean;
}

export const CH: Chapter[] = [
  { n: 'Primeiro Rastro', pl: 'Ciudad del Este', len: 1200, top: '#2c4a8a', mid: '#7a96c4', hor: '#f2bb72', road: 0xffffff, pave: 0xffffff, pc: [0, 6], sg: [0, 6], sp: [34, 20], w: [0.3, 0.25], amb: 0.65, sun: 0.95, sc: 0xffe48e, fg: 115 },
  { n: 'Ruas de Comércio', pl: 'Centro de Villarrica', len: 1400, top: '#46568c', mid: '#bba492', hor: '#f2ab6e', road: 0xf2e4d4, pave: 0xffffff, pc: [6, 12], sg: [6, 9], sp: [30, 18], w: [0.2, 0.2], amb: 0.65, sun: 0.92, sc: 0xffd275, fg: 105 },
  { n: 'Estrada Verde', pl: 'Rota rural, Alto Paraná', len: 1600, rural: true, top: '#3878b8', mid: '#96c4d8', hor: '#eee6b0', road: 0xdc9e5e, pave: 0xd0a674, pc: [12, 14], sg: [0, 1], sp: [32, 19], w: [0.3, 0.35], amb: 0.74, sun: 1.0, sc: 0xfff4ba, fg: 135 },
  { n: 'Travessia do Interior', pl: 'Costanera de Encarnación', len: 1800, coast: true, top: '#2b68b0', mid: '#8ec4e0', hor: '#f6d2a4', road: 0xffffff, pave: 0xf4ecd6, pc: [8, 12], sg: [9, 12], sp: [30, 18], w: [0.3, 0.3], amb: 0.70, sun: 0.98, sc: 0xffe8b4, fg: 135 },
  { n: 'Zona Metropolitana', pl: 'Assunção', len: 2200, top: '#161c42', mid: '#6e407c', hor: '#e27a58', road: 0xe2d4ea, pave: 0xe2d4e2, pc: [6, 12], sg: [9, 12], sp: [28, 17], w: [0.25, 0.25], amb: 0.55, sun: 0.60, sc: 0xffbca4, fg: 95 },
];

/** Carrega um capítulo: cores, luzes, fim da fase e obstáculos. */
export function loadChapter(ci: number) {
  G.CI = ci;
  G.TH = CH[ci];
  G.LEN = G.TH.len;
  G.CPZ = -Math.round(G.LEN / 2);
  const TH = G.TH;

  scene.background = skyTex(TH.top, TH.mid, TH.hor);
  const fog = scene.fog as THREE.Fog;
  fog.color.set(TH.hor);
  fog.far = TH.fg;
  asphaltM.color.set(TH.road);
  paveM.color.set(TH.pave);
  hemi.intensity = TH.amb;
  dl.intensity = TH.sun;
  (sun.material as THREE.MeshBasicMaterial).color.set(TH.sc);
  if (sunCorona && sunCorona.material) {
    (sunCorona.material as THREE.MeshBasicMaterial).color.set(TH.sc);
  }
  arcCP.position.z = G.CPZ;
  arcEnd.position.z = -G.LEN;
  genLevel();
}

