// @ts-nocheck -- imported game was written for non-strict TypeScript; kept as-is.
import * as THREE from 'three';
import { G } from '../game/state';
import { LANE } from '../game/constants';
import { BOX, box, cyl, cone, sph, prism, taperCyl, wedge } from '../render/geometry';
import { scene } from '../render/scene';
import {
  crateM, woodM, poleM, hazM, awnM, flagM, shadM, greenM, clueM, GOODS,
  holeM, coneM, coneWhiteM, tireM, rimM, motoRedM, motoYellowM, motoBlueM, helmetM,
  policeBlackM, policeWhiteM, policeBlueM, fireRedM, fireSilverM, fireWhiteM,
  ambWhiteM, ambRedM, ambStripeM, sirenRedM, sirenBlueM, sirenOffM, headlightM, taillightM,
  whiteM, M,
} from '../render/materials';

export type ObstacleKind = 'jump' | 'crouch' | 'dodge' | 'hole' | 'moto' | 'police' | 'fire' | 'ambulance';

export interface Obstacle {
  z: number;
  initialZ: number;
  kind: ObstacleKind;
  lanes: number[];
  m: THREE.Group;
  done: boolean;
  hit: boolean;
  speedZ?: number;
  currentX?: number;
  targetLane?: number;
  laneTimer?: number;
  lights?: THREE.Mesh[];
  lightState?: boolean;
  lightTimer?: number;
  sirenCooldown?: number;
}

export interface Clue {
  m: THREE.Mesh;
  x: number;
  z: number;
  got: boolean;
}

export const obs: Obstacle[]  = [];
export const clues: Clue[]    = [];
export const lvl = new THREE.Group();
scene.add(lvl);

let seed = 11;
const sr = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/* ═══════════════════════════════════════════════════════════════
   RODA AUTOMOTIVA REFINADA (PNEU DE BORRACHA + ARO + DISCO)
   ═══════════════════════════════════════════════════════════════ */
function mkWheel(r: number, thick: number, g: THREE.Object3D, x: number, y: number, z: number) {
  const wGroup = new THREE.Group();
  wGroup.position.set(x, y, z);

  // Pneu de borracha com chanfro nos ombros
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, thick, 12),
    tireM,
  );
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = tire.receiveShadow = true;
  wGroup.add(tire);

  // Roda de liga leve recuada com textura de raios e furação
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.65, r * 0.65, thick + 0.02, 10),
    rimM,
  );
  rim.rotation.z = Math.PI / 2;
  rim.castShadow = true;
  wGroup.add(rim);

  // Disco de freio ventilado no centro
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.45, r * 0.45, thick - 0.02, 8),
    M(0x707884),
  );
  disc.rotation.z = Math.PI / 2;
  wGroup.add(disc);

  // Cubo central com logotipo
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.20, r * 0.20, thick + 0.04, 6),
    M(0xdcdad2),
  );
  cap.rotation.z = Math.PI / 2;
  wGroup.add(cap);

  g.add(wGroup);
}

/* ═══════════════════════════════════════════════════════════════
   BURACO NO ASFALTO COM CRATERA MULTICAMADA E CONES PESADOS
   ═══════════════════════════════════════════════════════════════ */
function mkHole(lane: number) {
  const g = new THREE.Group();
  const x = lane * LANE;

  // Cratera funda e recortada
  box(2.8, 0.06, 2.4, holeM, x, 0.02, 0, g);
  // Pedaços de asfalto quebrado e cascalho nas margens
  const chunkOffsets = [
    [-1.2, -0.8, 0.38, 0.08, 0.26],
    [ 1.15, 0.75, 0.34, 0.07, 0.24],
    [-1.05, 0.95, 0.36, 0.09, 0.22],
    [ 1.0, -0.9, 0.32, 0.08, 0.28],
    [ 0.0, -1.15, 0.40, 0.06, 0.20],
  ];
  chunkOffsets.forEach(([cx, cz, cw, ch, cd]) => {
    const chunk = new THREE.Mesh(BOX, holeM);
    chunk.scale.set(cw, ch, cd);
    chunk.position.set(x + cx, 0.04, cz);
    chunk.rotation.y = (Math.random() - 0.5) * 0.8;
    g.add(chunk);
  });

  // Cones de trânsito táticos com base quadrada de borracha e colar refletivo
  [-1.25, 1.25].forEach((cx) => {
    const coneGroup = new THREE.Group();
    coneGroup.position.set(x + cx, 0, 0.9);

    // Base quadrada pesada de borracha preta
    box(0.42, 0.05, 0.42, M(0x1a1a1f), 0, 0.025, 0, coneGroup);
    // Corpo cônico laranja vibrante
    taperCyl(0.04, 0.17, 0.65, coneM, 0, 0.35, 0, coneGroup, 8);
    // Colar refletivo branco de alta visibilidade
    taperCyl(0.08, 0.13, 0.16, coneWhiteM, 0, 0.38, 0, coneGroup, 8);
    // Anel superior de empunhadura
    cyl(0.05, 0.06, coneM, 0, 0.68, 0, coneGroup, 6);

    // Sombra suave circular
    box(0.45, 0.01, 0.45, shadM, 0, 0.015, 0, coneGroup);

    g.add(coneGroup);
  });

  return g;
}

/* ═══════════════════════════════════════════════════════════════
   MOTOCICLETA ESPORTIVA E PILOTO RETRÔ-MODERNO
   ═══════════════════════════════════════════════════════════════ */
function mkMoto(_lane: number, v: number) {
  const g = new THREE.Group();
  // Altura aumentada para ficar quase do tamanho do jogador (~1.81m com piloto)
  g.scale.set(1.10, 1.25, 1.10);

  const colors = [motoRedM, motoYellowM, motoBlueM];
  const bodyM  = colors[v % colors.length];
  // O grupo 'g' é posicionado na faixa por m.position.set(l * LANE, ...); a geometria interna deve estar centralizada em 0
  const lx     = 0;

  // Sombra alongada no solo
  box(0.85, 0.01, 2.2, shadM, lx, 0.02, 0, g);

  // Rodas esportivas com perfil realista
  mkWheel(0.30, 0.16, g, lx, 0.30,  0.72);
  mkWheel(0.30, 0.16, g, lx, 0.30, -0.72);

  // Garfo dianteiro telescópico (suspensão invertida dourada/prata)
  cyl(0.035, 0.62, rimM, lx - 0.08, 0.54, 0.62, g, 6);
  cyl(0.035, 0.62, rimM, lx + 0.08, 0.54, 0.62, g, 6);

  // Para-lama dianteiro aerodinâmico
  box(0.24, 0.08, 0.38, bodyM, lx, 0.58, 0.68, g);

  // Carenagem frontal com faróis gêmeos e bolha para-brisa
  box(0.40, 0.32, 0.50, bodyM, lx, 0.74, 0.52, g);
  // Bolha de acrílico fumê
  const screen = new THREE.Mesh(BOX, M(0x2a3e50));
  screen.scale.set(0.32, 0.22, 0.24);
  screen.rotation.x = -0.45;
  screen.position.set(lx, 0.94, 0.46);
  g.add(screen);

  // Faróis agressivos de LED
  cyl(0.07, 0.04, headlightM, lx - 0.12, 0.72, 0.76, g, 6).rotation.x = Math.PI / 2;
  cyl(0.07, 0.04, headlightM, lx + 0.12, 0.72, 0.76, g, 6).rotation.x = Math.PI / 2;

  // Chassi perimetral e bloco do motor
  box(0.42, 0.34, 0.60, M(0x282c34), lx, 0.46, 0.0, g);
  // Tanque de combustível esportivo com vincos
  box(0.40, 0.28, 0.52, bodyM, lx, 0.78, 0.14, g);

  // Assento em dois níveis e rabeta afilada
  box(0.34, 0.12, 0.48, M(0x18181e), lx, 0.72, -0.22, g); // Banco piloto
  box(0.26, 0.16, 0.38, bodyM, lx, 0.76, -0.56, g);      // Rabeta monoposto
  // Lanterna traseira LED de freio e suporte de placa
  box(0.18, 0.06, 0.04, taillightM, lx, 0.76, -0.76, g);
  box(0.14, 0.10, 0.02, whiteM, lx, 0.64, -0.76, g);     // Placa

  // Escapamento esportivo dimensionado com ponteira de metal
  cyl(0.05, 0.85, M(0x98a0a8), lx + 0.24, 0.34, -0.28, g, 6).rotation.x = -0.15;
  taperCyl(0.07, 0.05, 0.22, M(0x404550), lx + 0.24, 0.38, -0.72, g, 6).rotation.x = -0.15;

  // Guidão com manoplas e espelhos retrovisores
  box(0.74, 0.04, 0.04, rimM, lx, 0.90, 0.48, g);
  cyl(0.04, 0.10, M(0x16181c), lx - 0.36, 0.90, 0.48, g, 6).rotation.z = Math.PI / 2;
  cyl(0.04, 0.10, M(0x16181c), lx + 0.36, 0.90, 0.48, g, 6).rotation.z = Math.PI / 2;
  // Retrovisores
  box(0.10, 0.06, 0.02, M(0x1a1a20), lx - 0.32, 1.02, 0.46, g);
  box(0.10, 0.06, 0.02, M(0x1a1a20), lx + 0.32, 1.02, 0.46, g);

  // ── Piloto com postura atlética inclinada para frente ───────
  const rider = new THREE.Group();
  rider.position.set(lx, 0.92, -0.06);

  // Jaqueta esportiva de couro com reforços
  const jacket = new THREE.Mesh(BOX, policeBlackM);
  jacket.scale.set(0.38, 0.44, 0.32);
  jacket.rotation.x = 0.32;
  jacket.position.set(0, 0.18, 0.05);
  rider.add(jacket);

  // Ombros protegidos
  sph(0.12, policeBlackM, -0.22, 0.32, 0.08, rider);
  sph(0.12, policeBlackM,  0.22, 0.32, 0.08, rider);

  // Braços estendidos até o guidão
  cyl(0.07, 0.36, policeBlackM, -0.26, 0.20, 0.26, rider, 6).rotation.x = 0.85;
  cyl(0.07, 0.36, policeBlackM,  0.26, 0.20, 0.26, rider, 6).rotation.x = 0.85;

  // Luvas nas manoplas
  box(0.09, 0.08, 0.10, M(0x121418), -0.34, 0.04, 0.48, rider);
  box(0.09, 0.08, 0.10, M(0x121418),  0.34, 0.04, 0.48, rider);

  // Capacete aerodinâmico esportivo com aerofólio
  const helm = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 8),
    helmetM,
  );
  helm.scale.set(1.0, 0.95, 1.15);
  helm.position.set(0, 0.52, 0.20);
  helm.rotation.x = 0.25;
  rider.add(helm);

  // Viseira espelhada fumê
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.08, 0.08),
    M(0x101520),
  );
  visor.position.set(0, 0.52, 0.36);
  rider.add(visor);

  g.add(rider);
  return g;
}

/* ═══════════════════════════════════════════════════════════════
   VEÍCULOS DE EMERGÊNCIA (POLÍCIA, BOMBEIRO, AMBULÂNCIA)
   ═══════════════════════════════════════════════════════════════ */
function mkEmergency(kind: 'police' | 'fire' | 'ambulance', _lane: number) {
  const g      = new THREE.Group();
  const lights: THREE.Mesh[] = [];
  // O grupo 'g' é posicionado na faixa por m.position.set(l * LANE, ...); a geometria interna deve estar centralizada em 0
  const lx     = 0;

  if (kind === 'police') {
    // ═══════════════════════════════════════════════════════════
    // VIATURA POLICIAL DE PERSEGUIÇÃO URBANA
    // Altura aumentada para ficar quase do tamanho do jogador (~1.82m)
    // ═══════════════════════════════════════════════════════════
    g.scale.set(1.08, 1.28, 1.06);

    box(2.3, 0.01, 4.2, shadM, lx, 0.02, 0, g);

    // Carroceria principal (preta e branca)
    box(1.92, 0.60, 3.8, policeBlackM, lx, 0.48, 0, g, true);
    // Capô dianteiro com vinco
    box(1.86, 0.10, 1.2, policeBlackM, lx, 0.72, 1.25, g, true);
    // Quebra-mato / push-bumper dianteiro
    box(1.65, 0.32, 0.12, M(0x282c36), lx, 0.46, 2.05, g);
    cyl(0.04, 0.42, M(0x282c36), lx - 0.65, 0.46, 2.04, g, 6);
    cyl(0.04, 0.42, M(0x282c36), lx + 0.65, 0.46, 2.04, g, 6);

    // Cabine do passageiro (branca com faixa azul de intervenção)
    box(1.78, 0.56, 1.95, policeWhiteM, lx, 1.02, -0.15, g);
    box(1.80, 0.18, 3.75, policeBlueM,  lx, 0.68, 0, g); // Faixa lateral tática

    // Para-brisa dianteiro e traseiro inclinados
    const windshield = new THREE.Mesh(BOX, M(0x223548));
    windshield.scale.set(1.72, 0.48, 0.05);
    windshield.rotation.x = -0.42;
    windshield.position.set(lx, 1.02, 0.88);
    g.add(windshield);

    const rearGlass = new THREE.Mesh(BOX, M(0x223548));
    rearGlass.scale.set(1.72, 0.44, 0.05);
    rearGlass.rotation.x = 0.42;
    rearGlass.position.set(lx, 1.02, -1.18);
    g.add(rearGlass);

    // Vidros laterais
    [-0.90, 0.90].forEach(wx => {
      box(0.04, 0.38, 1.45, M(0x223548), lx + wx, 1.04, -0.15, g);
      // Espelhos retrovisores
      box(0.18, 0.10, 0.08, policeBlackM, lx + wx * 1.08, 0.88, 0.72, g);
    });

    // Faróis dianteiros com lentes duplas
    cyl(0.14, 0.06, headlightM, lx - 0.72, 0.52, 1.92, g, 8).rotation.x = Math.PI / 2;
    cyl(0.14, 0.06, headlightM, lx + 0.72, 0.52, 1.92, g, 8).rotation.x = Math.PI / 2;

    // Lanternas traseiras de freio
    box(0.28, 0.16, 0.06, taillightM, lx - 0.78, 0.54, -1.92, g);
    box(0.28, 0.16, 0.06, taillightM, lx + 0.78, 0.54, -1.92, g);

    // Barra de luzes de emergência (Giroflex de LED aerodinâmico)
    box(1.1, 0.06, 0.28, M(0x20242e), lx, 1.34, -0.15, g);
    const l1 = box(0.44, 0.14, 0.24, sirenRedM,  lx - 0.28, 1.42, -0.15, g);
    const l2 = box(0.44, 0.14, 0.24, sirenBlueM, lx + 0.28, 1.42, -0.15, g);
    lights.push(l1, l2);

    // 4 rodas esportivas com disco de freio
    [-0.95, 0.95].forEach(wx => {
      mkWheel(0.30, 0.22, g, lx + wx, 0.32,  1.12);
      mkWheel(0.30, 0.22, g, lx + wx, 0.32, -1.12);
    });

  } else if (kind === 'fire') {
    // ═══════════════════════════════════════════════════════════
    // CAMINHÃO DE RESGATE DOS BOMBEIROS
    // ═══════════════════════════════════════════════════════════
    g.scale.set(1.06, 1.12, 1.05);

    box(2.6, 0.01, 5.2, shadM, lx, 0.02, 0, g);

    // Chassi principal e corpo vermelho bombeiro
    box(2.2, 1.45, 4.8, fireRedM, lx, 0.95, 0, g);
    // Para-choque cromado pesado
    box(2.35, 0.28, 0.32, fireSilverM, lx, 0.34, 2.44, g);
    // Grade dianteira imponente de aço
    box(1.4, 0.65, 0.04, fireSilverM, lx, 0.88, 2.42, g);

    // Cabine do caminhão
    box(2.1, 0.75, 1.75, fireWhiteM, lx, 1.82, 1.25, g);
    // Para-brisa bipartido
    box(1.95, 0.55, 0.04, M(0x2a4458), lx, 1.85, 2.14, g);

    // Portas de persiana de alumínio dos compartimentos de ferramentas
    for (const zc of [-0.45, -1.45]) {
      [-1.11, 1.11].forEach(sx => {
        box(0.04, 0.85, 0.75, fireSilverM, lx + sx, 0.98, zc, g);
      });
    }

    // Escadas duplas extensíveis de resgate no teto
    box(0.92, 0.12, 3.8, fireSilverM, lx, 2.36, -0.38, g);
    [-0.42, 0.42].forEach(ex => box(0.06, 0.24, 3.8, fireSilverM, lx + ex, 2.36, -0.38, g));
    for (let dz = -1.8; dz < 1.8; dz += 0.55) {
      box(0.80, 0.05, 0.08, fireSilverM, lx, 2.36, dz, g);
    }

    // Faróis principais potentes
    cyl(0.16, 0.06, headlightM, lx - 0.82, 0.68, 2.44, g, 8).rotation.x = Math.PI / 2;
    cyl(0.16, 0.06, headlightM, lx + 0.82, 0.68, 2.44, g, 8).rotation.x = Math.PI / 2;

    // Giroflex duplo vermelho
    box(1.6, 0.10, 0.32, M(0x282c38), lx, 2.26, 1.25, g);
    const l1 = box(0.48, 0.18, 0.28, sirenRedM, lx - 0.50, 2.35, 1.25, g);
    const l2 = box(0.48, 0.18, 0.28, sirenRedM, lx + 0.50, 2.35, 1.25, g);
    lights.push(l1, l2);

    // Rodas pesadas (rodado duplo na traseira)
    [-1.12, 1.12].forEach(wx => {
      mkWheel(0.38, 0.24, g, lx + wx, 0.40,  1.42);
      mkWheel(0.38, 0.24, g, lx + wx, 0.40, -1.42);
    });

  } else {
    // ═══════════════════════════════════════════════════════════
    // AMBULÂNCIA DE EMERGÊNCIA MÉDICA
    // Altura aumentada para quase o tamanho do jogador (~2.0m)
    // ═══════════════════════════════════════════════════════════
    g.scale.set(1.05, 1.16, 1.05);

    box(2.3, 0.01, 4.4, shadM, lx, 0.02, 0, g);

    // Carroceria branca aerodinâmica
    box(2.0, 1.45, 4.2, ambWhiteM, lx, 0.95, 0, g);
    // Faixa diagonal de visibilidade (verde e vermelha)
    box(2.04, 0.18, 4.0, ambStripeM, lx, 0.50, 0, g);

    // Cruz da vida / emblema médico nas laterais
    [-1.02, 1.02].forEach((cx) => {
      box(0.02, 0.52, 0.16, ambRedM, lx + cx, 1.08, -0.3, g);
      box(0.02, 0.16, 0.52, ambRedM, lx + cx, 1.08, -0.3, g);
    });

    // Janelas de atendimento e para-brisa
    [-1.01, 1.01].forEach(wx => {
      box(0.04, 0.38, 0.82, M(0x284255), lx + wx, 1.10, -1.1, g);
    });
    box(1.88, 0.55, 0.04, M(0x284255), lx, 1.08, 2.11, g);

    // Para-choque dianteiro
    box(2.1, 0.22, 0.24, M(0x8a929e), lx, 0.34, 2.12, g);

    // Faróis
    cyl(0.14, 0.06, headlightM, lx - 0.74, 0.54, 2.12, g, 8).rotation.x = Math.PI / 2;
    cyl(0.14, 0.06, headlightM, lx + 0.74, 0.54, 2.12, g, 8).rotation.x = Math.PI / 2;

    // Giroflex de emergência
    box(1.0, 0.08, 0.30, M(0x28303e), lx, 1.74, 0.95, g);
    const l1 = box(0.38, 0.16, 0.24, sirenRedM,  lx - 0.28, 1.82, 0.95, g);
    const l2 = box(0.38, 0.16, 0.24, sirenBlueM, lx + 0.28, 1.82, 0.95, g);
    lights.push(l1, l2);

    // 4 rodas com aro
    [-1.02, 1.02].forEach(wx => {
      mkWheel(0.32, 0.22, g, lx + wx, 0.35,  1.22);
      mkWheel(0.32, 0.22, g, lx + wx, 0.35, -1.22);
    });
  }

  return { g, lights };
}

/* ═══════════════════════════════════════════════════════════════
   OBSTÁCULOS ESTÁTICOS (PULAR, AGACHAR, DESVIAR)
   ═══════════════════════════════════════════════════════════════ */
function mkObs(kind: string, z: number, lanes: number[], v: number) {
  const g = new THREE.Group();
  g.position.z = z;

  if (kind === 'jump') {
    if (v % 2) {
      // ── Barreira de obras com cavaletes e faixas zebradas ───
      [-1, 0, 1].forEach((l) => {
        const x = l * LANE;
        // Postes de madeira reforçados
        taperCyl(0.07, 0.09, 0.85, poleM, x - 1.35, 0.42, 0, g, 6);
        taperCyl(0.07, 0.09, 0.85, poleM, x + 1.35, 0.42, 0, g, 6);
        // Barra zebrada refletiva
        box(2.85, 0.28, 0.16, hazM, x, 0.62, 0, g);
        // Reforço diagonal
        box(1.8, 0.08, 0.10, M(0xffc533), x, 0.50, 0, g);
        // Sombra suave sob a barreira
        box(2.9, 0.01, 0.6, shadM, x, 0.02, 0, g);
      });
    } else {
      // ── Pilha de caixas rústicas com detalhes ───────────────
      [-1, 0, 1].forEach((l) => {
        const x = l * LANE;
        box(2.8, 0.01, 1.6, shadM, x, 0.02, 0, g);
        // Caixa base reforçada
        box(2.6, 0.64, 1.1, crateM, x, 0.32, 0, g);
        // Caixa superior inclinada dinamicamente
        const top = new THREE.Mesh(BOX, crateM);
        top.scale.set(1.8, 0.52, 0.88);
        top.position.set(x + (l % 2 === 0 ? 0.16 : -0.14), 0.90, 0.04);
        top.rotation.y = 0.16;
        top.castShadow = top.receiveShadow = true;
        g.add(top);
        // Faixa de perigo na borda
        box(2.62, 0.05, 1.12, hazM, x, 0.78, 0, g);
      });
    }

  } else if (kind === 'crouch') {
    // ── Obstáculo alto que exige agachar (cruza toda a rua larga de 12m) ──────────────
    [-5.8, 5.8].forEach((x) => {
      // Base sólida e coluna monumental
      box(0.38, 0.32, 0.38, M(0x5a483a), x, 0.16, 0, g);
      taperCyl(0.12, 0.15, 3.0, poleM, x, 1.65, 0, g, 8);
      box(0.42, 0.16, 0.42, M(0x7a6250), x, 3.16, 0, g);
    });

    if (v % 2) {
      // Toldo de tecido esticado com cordas de suporte
      box(11.6, 0.96, 0.42, G.TH.rural ? greenM : awnM, 0, 1.78, 0, g);
      // Cordas de aço
      [-4.2, -1.8, 1.8, 4.2].forEach(cx => {
        const rope = new THREE.Mesh(BOX, M(0x8a7060));
        rope.scale.set(0.04, 0.95, 0.04);
        rope.position.set(cx, 1.45, 0.2);
        rope.rotation.z = 0.16;
        g.add(rope);
      });
    } else {
      // Faixa cívica com flâmulas decorativas
      box(11.6, 0.92, 0.12, flagM, 0, 1.78, 0, g);
      for (let fx = -5.0; fx <= 5.0; fx += 1.25) {
        cone(0.18, 0.45, M(0xd9261c), fx, 2.32, 0, g, 4);
      }
    }

  } else {
    // ── Barraca de feira tradicional / Mercado 4 ───────────────
    lanes.forEach((l) => {
      const x = l * LANE;
      box(2.8, 0.01, 2.0, shadM, x, 0.02, 0, g);

      if (v % 3 === 1) {
        // Pilha de caixas com mercadorias
        box(2.6, 1.15, 1.25, crateM, x, 0.58, 0, g);
        const mid = new THREE.Mesh(BOX, woodM);
        mid.scale.set(2.0, 0.85, 1.05);
        mid.position.set(x + 0.16, 1.58, 0);
        mid.rotation.y = 0.12;
        mid.castShadow = mid.receiveShadow = true;
        g.add(mid);
        box(1.5, 0.65, 0.95, crateM, x - 0.10, 2.32, 0, g);
        return;
      }

      if (v % 3 === 2) {
        // Carrinho de venda de frutas com rodas
        box(2.6, 0.28, 1.4, poleM, x, 0.48, 0, g);
        box(2.4, 1.35, 1.25, GOODS[(l + v + 4) % 4], x, 1.28, 0, g);
        // 4 rodas de raio do carrinho
        [-0.95, 0.95].forEach(wx => {
          cyl(0.18, 0.12, M(0x3a3c48), x + wx, 0.40,  0.65, g, 8);
          cyl(0.18, 0.12, M(0x3a3c48), x + wx, 0.40, -0.65, g, 8);
        });
        box(1.8, 0.55, 0.85, GOODS[(l + v + 5) % 4], x, 2.22, 0, g);
        return;
      }

      // Barraca de frutas com toldo e bancada de madeira
      box(2.6, 1.05, 1.45, woodM, x, 0.52, 0, g);
      // Melões / melancias / frutas tropicais em exposição
      for (let i = 0; i < 4; i++) {
        sph(0.24, GOODS[(l + i + 3) % 4], x - 0.9 + i * 0.6, 1.32, 0, g, 8);
      }
      // Postes cilíndricos da barraca
      cyl(0.06, 2.2, poleM, x - 1.2, 1.10, 0.64, g, 6);
      cyl(0.06, 2.2, poleM, x + 1.2, 1.10, 0.64, g, 6);
      // Toldo com aba caída
      box(2.9, 0.12, 1.85, awnM, x, 2.18, 0.1, g);
      for (let fz = -0.7; fz <= 0.7; fz += 0.28) {
        box(2.8, 0.24, 0.06, awnM, x, 2.04, 1.02 + fz * 0.1, g);
      }
    });
  }

  return g;
}

const coinGeom = new THREE.CylinderGeometry(0.34, 0.34, 0.08, 14);
coinGeom.rotateX(Math.PI / 2);

function addCoin(lane: number, zPos: number) {
  const c = new THREE.Mesh(coinGeom, clueM);
  c.position.set(lane * LANE, 0.9, zPos);
  lvl.add(c);
  clues.push({ m: c, x: lane * LANE, z: zPos, got: false });
}

/* ═══════════════════════════════════════════════════════════════
   GERA A FASE COMPLETA DO CAPÍTULO ATUAL
   ═══════════════════════════════════════════════════════════════ */
export function genLevel() {
  while (lvl.children.length) lvl.remove(lvl.children[0]);
  obs.length   = 0;
  clues.length = 0;
  seed = 11 + G.CI * 7;

  const TH = G.TH, LEN = G.LEN;
  let z = -45, idx = 0, prev = '', run = 0, pz = 0;
  const tut = ['jump', 'crouch', 'hole', 'dodge', 'moto', 'police', 'ambulance', 'fire'];

  // Trilha inicial de moedas na reta de largada
  [-14, -17, -20].forEach((cz) => addCoin(0, cz));

  while (z > -LEN + 30) {
    let kind: string = idx < tut.length
      ? tut[idx]
      : (() => {
          const r = sr();
          if (r < 0.17) return 'jump';
          if (r < 0.30) return 'crouch';
          if (r < 0.44) return 'dodge';
          if (r < 0.58) return 'hole';
          if (r < 0.72) return 'moto';
          if (r < 0.82) return 'police';
          if (r < 0.91) return 'ambulance';
          return 'fire';
        })();

    if (kind === prev && run >= 2) kind = kind === 'dodge' ? 'hole' : 'dodge';
    run  = kind === prev ? run + 1 : 1;
    prev = kind;

    let lanes: number[] = [];
    let free  = [-1, 0, 1];
    let m: THREE.Group;
    let speedZ:     number | undefined;
    let currentX:   number | undefined;
    let targetLane: number | undefined;
    let laneTimer:  number | undefined;
    let lights: THREE.Mesh[] | undefined;

    if (kind === 'hole') {
      const l = Math.floor(sr() * 3) - 1;
      lanes = [l];
      free  = [-1, 0, 1].filter((x) => x !== l);
      m     = mkHole(l);
      m.position.z = z;
    } else if (kind === 'moto') {
      const l = Math.floor(sr() * 3) - 1;
      lanes = [l];
      free  = [-1, 0, 1].filter((x) => x !== l);
      m     = mkMoto(l, Math.floor(sr() * 3));
      m.position.set(l * LANE, 0, z);
      currentX   = l * LANE;
      targetLane = l;
      laneTimer  = 1.3 + sr() * 1.4;
      speedZ     = 7 + sr() * 3;
    } else if (kind === 'police' || kind === 'fire' || kind === 'ambulance') {
      const l = Math.floor(sr() * 3) - 1;
      lanes = [l];
      free  = [-1, 0, 1].filter((x) => x !== l);
      const res = mkEmergency(kind, l);
      m     = res.g;
      m.position.set(l * LANE, 0, z);
      lights     = res.lights;
      currentX   = l * LANE;
      targetLane = l;
      speedZ     = kind === 'fire' ? 16 + sr() * 4 : kind === 'police' ? 22 + sr() * 5 : 19 + sr() * 5;
    } else {
      if (kind === 'dodge') {
        const f = Math.floor(sr() * 3) - 1;
        lanes = idx === 3 ? [0] : idx > 4 && sr() < 0.5 ? [-1, 0, 1].filter((l) => l !== f) : [f];
        free  = [-1, 0, 1].filter((l) => !lanes.includes(l));
      } else {
        lanes = [-1, 0, 1];
      }
      m = mkObs(kind, z, lanes, Math.floor(sr() * 6));
    }

    lvl.add(m);
    obs.push({
      z,
      initialZ: z,
      kind:      kind as ObstacleKind,
      lanes,
      m,
      done:       false,
      hit:        false,
      speedZ,
      currentX,
      targetLane,
      laneTimer,
      lights,
      lightState:   false,
      lightTimer:   0.08,
      sirenCooldown: 0,
    });

    // Trilhas de moedas douradas rítmicas nas faixas livres
    if (free.length > 0) {
      const l1 = free[Math.floor(sr() * free.length)];
      const dist = pz - z;
      const count = Math.min(4, Math.max(2, Math.floor((dist - 8) / 3.4)));
      const stepZ = 2.4;
      const centerZ = (pz + z) / 2;

      for (let k = 0; k < count; k++) {
        const cz = centerZ - ((count - 1) / 2 - k) * stepZ;
        if (cz < pz - 3.2 && cz > z + 3.2) {
          addCoin(l1, cz);
        }
      }

      // Em trechos com mais espaço e 2 faixas livres, cria ocasionalmente um pequeno par extra
      if (free.length >= 2 && sr() < 0.35) {
        const otherFree = free.filter(f => f !== l1);
        const l2 = otherFree[Math.floor(sr() * otherFree.length)];
        for (let k = 0; k < 2; k++) {
          const cz = centerZ + (k === 0 ? -1.3 : 1.3);
          if (cz < pz - 3.2 && cz > z + 3.2) {
            addCoin(l2, cz);
          }
        }
      }
    }

    pz = z;
    z -= TH.sp[0] - (TH.sp[0] - TH.sp[1]) * (-z / LEN) + sr() * 4;
    idx++;
  }
}
