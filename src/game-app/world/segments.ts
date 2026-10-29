// @ts-nocheck -- imported game was written for non-strict TypeScript; kept as-is.
import * as THREE from 'three';
import { G } from '../game/state';
import { SEG, NSEG, LANE } from '../game/constants';
import { box, cyl, cone, sph, prism, taperCyl, cluster } from '../render/geometry';
import { scene } from '../render/scene';
import {
  asphaltM, whiteM, paveM, grassM, waterM, shopM, awnM, lampPM, lampM,
  trunkM, greenM, pinkM, palmM, tankM, woodM, shadM, poleM, signMs, wallM,
  banner, manholeM, M,
} from '../render/materials';

interface SideParts {
  s: number;
  up: THREE.Mesh;
  sign: THREE.Mesh;
  aw: THREE.Mesh;
  tr: THREE.Group;
  can: THREE.Mesh;
  tank: THREE.Object3D;
  ant: THREE.Mesh;
  tier: THREE.Mesh;
  bal: THREE.Mesh;
  rail: THREE.Mesh;
  shop: THREE.Mesh;
  grass: THREE.Mesh;
  roof: THREE.Mesh;
  chimney: THREE.Object3D;
  balconyPillar: THREE.Mesh;
  // Novos detalhes arquitetônicos
  cornice?: THREE.Mesh;
  pilasters?: THREE.Mesh[];
  acUnit?: THREE.Group;
  foliageClusters?: THREE.Mesh[];
}

export interface Seg extends THREE.Group {
  sd: SideParts[];
}

export const segs: Seg[] = [];

/* ═══════════════════════════════════════════════════════════════
   VEGETAÇÃO ORGÂNICA LOW-POLY (SEM ESFERAS SIMPLES)
   ═══════════════════════════════════════════════════════════════ */

/**
 * Cria uma árvore com tronco cônico escultural, ramificações naturais
 * e copa composta por clusters poliédricos facetados (Lapacho, Palmeira ou Conífera).
 */
function mkTree(g: THREE.Object3D, x: number, kind: 'round' | 'palm' | 'pine', canopyM: THREE.Material) {
  const tr = new THREE.Group();
  tr.position.x = x;

  // Grade de ferro fundido na calçada ao redor da base da árvore
  const treeGrate = box(1.3, 0.02, 1.3, M(0x282a32), 0, 0.05, 0, tr);
  box(0.5, 0.03, 0.5, M(0x181a20), 0, 0.05, 0, tr); // Terra úmida interna

  const foliageClusters: THREE.Mesh[] = [];

  if (kind === 'pine') {
    // ── Conífera estilizada ──────────────────────────────────
    // Tronco cônico com raiz aparente
    taperCyl(0.10, 0.18, 2.6, trunkM, 0, 1.3, 0, tr, 7);
    // 4 camadas de cones facetados com variações de escala e rotação
    const c1 = cone(1.15, 1.4, canopyM, 0, 2.6, 0, tr, 7);
    const c2 = cone(0.92, 1.3, canopyM, 0, 3.5, 0, tr, 7);
    const c3 = cone(0.68, 1.1, canopyM, 0, 4.3, 0, tr, 7);
    const c4 = cone(0.42, 0.9, canopyM, 0, 5.0, 0, tr, 6);
    foliageClusters.push(c1, c2, c3, c4);

  } else if (kind === 'palm') {
    // ── Palmeira tropical escultural ────────────────────────
    // Tronco segmentado com curvatura orgânica em direção à rua
    const seg1 = taperCyl(0.15, 0.22, 1.6, trunkM, 0, 0.8, 0, tr, 7);
    const seg2 = taperCyl(0.13, 0.15, 1.6, trunkM, 0.12, 2.3, 0, tr, 7);
    seg2.rotation.z = 0.14;
    const seg3 = taperCyl(0.10, 0.13, 1.6, trunkM, 0.32, 3.8, 0, tr, 7);
    seg3.rotation.z = 0.22;

    // Coroa de folhas de palmeira arqueadas
    const crown = new THREE.Group();
    crown.position.set(0.48, 4.6, 0);
    tr.add(crown);

    // Cachos de coco sob a copa
    for (let c = 0; c < 4; c++) {
      const a = (c / 4) * Math.PI * 2;
      sph(0.12, M(0x7a522a), Math.cos(a) * 0.16, -0.15, Math.sin(a) * 0.16, crown, 6);
    }

    // 8 folhas arqueadas em leque tridimensional
    for (let a = 0; a < 8; a++) {
      const frondGroup = new THREE.Group();
      frondGroup.rotation.y = (a / 8) * Math.PI * 2;
      crown.add(frondGroup);

      // Nervura central da folha
      const stem = taperCyl(0.02, 0.04, 1.8, canopyM, 0, 0.3, 0.8, frondGroup, 5);
      stem.rotation.x = 1.15;

      // Lâminas da folha em formato de leque facetado
      const blade1 = cone(0.26, 1.2, canopyM, 0, 0.4, 0.7, frondGroup, 4);
      blade1.rotation.x = 1.25;
      blade1.scale.set(1.4, 1, 0.2);
      const blade2 = cone(0.18, 0.9, canopyM, 0, 0.1, 1.4, frondGroup, 4);
      blade2.rotation.x = 1.55;
      blade2.scale.set(1.2, 1, 0.2);
      foliageClusters.push(blade1, blade2);
    }

  } else {
    // ── Árvore urbana frondosa (Lapacho / Jacarandá) ─────────
    // Tronco cônico com alargamento na base e raízes de suporte
    taperCyl(0.16, 0.28, 2.2, trunkM, 0, 1.1, 0, tr, 8);
    // Raízes superficiais aparentes
    box(0.55, 0.12, 0.14, trunkM, 0.18, 0.1, 0.12, tr);
    box(0.14, 0.12, 0.50, trunkM, -0.12, 0.1, -0.18, tr);

    // Duas ramificações estruturais que se abrem
    const b1 = taperCyl(0.11, 0.15, 1.2, trunkM, -0.28, 2.3, 0.18, tr, 6);
    b1.rotation.z = -0.32;
    b1.rotation.x = 0.22;
    const b2 = taperCyl(0.10, 0.14, 1.3, trunkM, 0.26, 2.4, -0.14, tr, 6);
    b2.rotation.z = 0.28;
    b2.rotation.x = -0.18;

    // Copa volumétrica orgânica composta por clusters poliédricos facetados
    // As facetas dos dodecaedros capturam a luz solar criando volume rico e sombras naturais
    const clustersData = [
      { r: 0.88, x:  0.0, y: 3.5, z:  0.0 }, // Cluster central superior
      { r: 0.68, x: -0.55, y: 3.1, z:  0.35 },// Cluster lateral esquerdo
      { r: 0.64, x:  0.50, y: 3.2, z: -0.30 },// Cluster lateral direito
      { r: 0.58, x:  0.30, y: 2.8, z:  0.45 },// Cluster frontal
      { r: 0.54, x: -0.35, y: 2.9, z: -0.40 },// Cluster traseiro
      { r: 0.44, x:  0.0, y: 4.1, z:  0.0 }, // Topo da copa
    ];

    clustersData.forEach((cd) => {
      const cMesh = cluster(cd.r, canopyM, cd.x, cd.y, cd.z, tr);
      cMesh.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
      foliageClusters.push(cMesh);
    });

    // Sombra suave circular no chão
    const sDisc = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.02, 12), shadM);
    sDisc.position.set(0, 0.06, 0);
    tr.add(sDisc);
  }

  g.add(tr);
  return { tr, foliageClusters };
}

/** Poste de iluminação urbana elegante com lanterna de cúpula e emissão quente. */
function mkLamp(g: THREE.Group, x: number, z: number) {
  const dir = Math.sign(x);

  // Base ornamental octogonal
  taperCyl(0.12, 0.18, 0.6, lampPM, x, 0.35, z, g, 8);
  // Fuste esbelto com anel decorativo
  cyl(0.06, 4.2, lampPM, x, 2.7, z, g, 8);
  cyl(0.08, 0.08, lampPM, x, 4.4, z, g, 8); // Colar do topo

  // Braço curvo swan-neck direcionado para a rua
  const arm = box(0.95, 0.05, 0.05, lampPM, x - dir * 0.48, 4.75, z, g);
  // Suporte diagonal de reforço
  const strut = box(0.45, 0.04, 0.04, lampPM, x - dir * 0.28, 4.55, z, g);
  strut.rotation.z = dir * 0.55;

  // Cúpula da luminária
  taperCyl(0.22, 0.14, 0.16, lampPM, x - dir * 0.90, 4.65, z, g, 8);
  // Vidro emissivo quente da lanterna
  const bulb = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.16, 0.12, 8),
    lampM,
  );
  bulb.position.set(x - dir * 0.90, 4.52, z);
  bulb.castShadow = false;
  g.add(bulb);
}

/** Hidrante urbano retrô (vermelho com porcas prateadas). */
function mkHydrant(g: THREE.Group, x: number, z: number) {
  const hGroup = new THREE.Group();
  hGroup.position.set(x, 0.15, z);

  // Corpo cilíndrico vermelho
  cyl(0.12, 0.45, M(0xd9261c), 0, 0.22, 0, hGroup, 8);
  // Chapéu abaulado
  sph(0.13, M(0xd9261c), 0, 0.44, 0, hGroup, 8);
  // Porca de abertura superior
  box(0.06, 0.05, 0.06, M(0xc4ced8), 0, 0.54, 0, hGroup);
  // Bocais laterais de engate
  cyl(0.06, 0.32, M(0xc4ced8), 0, 0.28, 0, hGroup, 6).rotation.z = Math.PI / 2;

  g.add(hGroup);
}

/** Segmento de rua completo e arquiteturalmente rico. */
function mkSeg(): Seg {
  const g = new THREE.Group() as Seg;

  // ═══════════════════════════════════════════════════════════════
  // 1. ASFALTO E SINALIZAÇÃO HORIZONTAL DA PISTA (PISTA LARGA: 12m)
  // ═══════════════════════════════════════════════════════════════
  box(12.0, 0.22, SEG, asphaltM, 0, -0.11, 0, g);

  // Faixa de pedestres estilizada (zebra crossing) com pintura desgastada
  for (let fz = -7.5; fz <= 7.5; fz += 3.8) {
    [-LANE, 0, LANE].forEach((fx) => {
      const stripe = box(0.24, 0.015, 2.8, whiteM, fx, 0.01, fz, g);
      stripe.receiveShadow = true;
    });
  }

  // Linhas divisórias pontilhadas das 3 faixas com tachões refletivos ("olhos de gato")
  for (let dz = -SEG / 2 + 2; dz < SEG / 2; dz += 5) {
    [-LANE / 2, LANE / 2].forEach((lx) => {
      box(0.10, 0.014, 2.8, whiteM, lx, 0.012, dz, g);
      // Tachão refletivo amarelo na ponta da faixa
      box(0.06, 0.025, 0.06, M(0xf5c842), lx, 0.02, dz + 1.4, g);
    });
  }

  // Tampas de bueiro metálicas integradas na pista
  const manhole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.48, 0.02, 12),
    manholeM,
  );
  manhole.position.set(2.0, 0.012, 3);
  manhole.receiveShadow = true;
  g.add(manhole);

  // ═══════════════════════════════════════════════════════════════
  // 2. CALÇADAS, MEIO-FIO E MOBILIÁRIO URBANO
  // ═══════════════════════════════════════════════════════════════
  g.sd = [-1, 1].map((s) => {
    // Calçada de lajotas com chanfro
    box(5.6, 0.32, SEG, paveM, s * 8.8, 0.05, 0, g);

    // Meio-fio de concreto chanfrado ao longo da rua larga
    const curb = box(0.24, 0.16, SEG, M(0xbab09c), s * 6.02, 0.16, 0, g);
    curb.castShadow = curb.receiveShadow = true;

    // Grelhas de drenagem de águas pluviais junto ao meio-fio
    box(0.20, 0.02, 0.80, M(0x2e3038), s * 5.92, 0.015, -4, g);

    // Vegetação de fundo / água para capítulos costeiros
    const grass = box(16, 0.30, SEG, grassM, s * 19.5, 0.05, 0, g);

    // ── Edifício comercial: Térreo (loja) ──────────────────────
    const shop = box(8, 3.40, SEG - 2, shopM, s * 15.0, 1.7, 0, g);

    // Pilastras arquitetônicas clássicas que emolduram a fachada térrea
    const p1 = box(0.35, 3.42, 0.40, M(0x9a8870), s * 10.92, 1.7, -SEG / 2 + 1.5, g);
    const p2 = box(0.35, 3.42, 0.40, M(0x9a8870), s * 10.92, 1.7,  SEG / 2 - 1.5, g);
    const pilasters = [p1, p2];

    // Cornija horizontal divisória entre o térreo e os andares superiores
    const cornice = box(0.45, 0.18, SEG - 1.6, M(0x8a7860), s * 10.95, 3.45, 0, g);

    // ── Edifício: Andares superiores ───────────────────────────
    const up = box(8, 1, SEG - 2, wallM(0, 2), s * 15.0, 5.0, 0, g);

    // ── Placa de comércio em alto-relevo ───────────────────────
    const signGroup = new THREE.Group();
    signGroup.position.set(s * 10.85, 3.0, 0);
    g.add(signGroup);

    // Moldura 3D da placa
    box(0.12, 1.25, 5.2, M(0x28201a), 0, 0, 0, signGroup);
    // Face com texto
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 1.1), signMs[0]);
    sign.rotation.y = (-s * Math.PI) / 2;
    sign.position.x = -s * 0.07;
    signGroup.add(sign);

    // Suportes metálicos de fixação da placa na parede
    cyl(0.03, 0.4, M(0x555560), -s * 0.2, 0.4, -2.1, signGroup, 6).rotation.z = Math.PI / 2;
    cyl(0.03, 0.4, M(0x555560), -s * 0.2, 0.4,  2.1, signGroup, 6).rotation.z = Math.PI / 2;

    // ── Toldo listrado com estrutura de ferro ──────────────────
    const awGroup = new THREE.Group();
    awGroup.position.set(s * 10.2, 2.5, 0);
    g.add(awGroup);

    const aw = box(1.8, 0.14, 10, awnM, 0, 0, 0, awGroup);
    // Hastes metálicas diagonais de suporte do toldo
    for (const az of [-4.5, 0, 4.5]) {
      const strut = box(1.6, 0.04, 0.04, M(0x3a3c46), 0, -0.4, az, awGroup);
      strut.rotation.z = s * 0.45;
    }

    // ── Árvore orgânica escultural ─────────────────────────────
    const treeRes = mkTree(g, s * 7.1, 'round', greenM);
    const tr = treeRes.tr;
    const can = (tr.children[1] ?? tr.children[0]) as THREE.Mesh;

    // ── Poste de iluminação urbana ─────────────────────────────
    mkLamp(g, s * 6.35, 7);

    // ── Hidrante urbano na calçada ─────────────────────────────
    if (s > 0) mkHydrant(g, s * 6.4, -6);

    // ── Aparelho de Ar Condicionado (AC) na fachada externa ────
    const acUnit = new THREE.Group();
    box(0.55, 0.45, 0.70, M(0xdfe4ec), 0, 0, 0, acUnit);
    // Grelha frontal do compressor
    box(0.02, 0.35, 0.45, M(0x363a44), -s * 0.28, 0, 0, acUnit);
    // Suporte angular de parede
    box(0.60, 0.04, 0.04, M(0x505460), 0, -0.25, -0.25, acUnit);
    box(0.60, 0.04, 0.04, M(0x505460), 0, -0.25,  0.25, acUnit);
    acUnit.position.set(s * 10.7, 4.8, -4.5);
    g.add(acUnit);

    // ── Telhado e remates superiores ───────────────────────────
    const roof = prism(8.4, 1.4, SEG - 2, M(0xb86438), s * 15.0, 5.1, 0, g);

    // Chaminé com chapéu de tijolo
    const chimney = new THREE.Group();
    box(0.55, 1.2, 0.55, M(0x8a4430), 0, 0, 0, chimney);
    box(0.68, 0.14, 0.68, M(0x5a2e20), 0, 0.65, 0, chimney); // Chapéu da chaminé
    cyl(0.12, 0.28, M(0x303038), 0, 0.85, 0, chimney, 6);   // Duto de exaustão
    chimney.position.set(s * 13.5, 6.2, 0);
    g.add(chimney);

    // ── Balcão / Varanda ───────────────────────────────────────
    const tier = box(5.5, 1, SEG - 6, wallM(1, 2), 0, 0, 0, g);
    const bal  = box(1.3, 0.16, 11, woodM, 0, 0, 0, g);
    const rail = box(0.06, 0.65, 11, M(0x282a32), 0, 0, 0, g);
    const balconyPillar = cyl(0.04, 0.6, M(0x3a3c46), 0, 0, 0, g, 6);

    // ── Caixa d'água no topo do edifício ───────────────────────
    const tank = new THREE.Group();
    // Cilindro do reservatório com relevo de cintas
    cyl(0.95, 1.8, tankM, 0, 0.9, 0, tank, 12);
    cyl(0.98, 0.06, M(0x607888), 0, 0.5, 0, tank, 12);
    cyl(0.98, 0.06, M(0x607888), 0, 1.3, 0, tank, 12);
    // Estrutura metálica de suporte com 4 pés treliçados
    for (const [tx, tz] of [[-0.65, -0.65], [0.65, -0.65], [-0.65, 0.65], [0.65, 0.65]]) {
      cyl(0.05, 1.1, poleM, tx, -0.05, tz, tank, 6);
    }
    // Tampa cônica
    cone(1.05, 0.45, M(0x90a8b8), 0, 1.95, 0, tank, 12);
    const ant = cyl(0.04, 3.5, poleM, 0, 0, 0, tank, 6);

    tank.position.set(s * 15.2, 0, 0);
    g.add(tank);

    return {
      s, up, sign, aw, tr, can, tank,
      ant: ant as unknown as THREE.Mesh,
      tier, bal, rail, shop, grass, roof, chimney, balconyPillar,
      cornice, pilasters, acUnit, foliageClusters: treeRes.foliageClusters,
    };
  });

  return g;
}

/** Atualiza cores, vegetação e visibilidade arquitetônica conforme o capítulo. */
export function dress(g: Seg) {
  const TH = G.TH;
  const r  = Math.random;

  g.sd.forEach((o) => {
    const ru = !!TH.rural;
    const wt = !!TH.coast && o.s > 0;
    const f  = ru ? 1 : 2 + ((r() * 4) | 0);

    // Paredes e andares superiores
    o.up.material   = wallM(TH.pc[0] + ((r() * (TH.pc[1] - TH.pc[0])) | 0), f);
    o.up.scale.y    = f * 3.2;
    o.up.position.y = 3.4 + f * 1.6;

    // Cornija divisória acompanha a parede
    if (o.cornice) {
      o.cornice.position.y = 3.4;
      o.cornice.visible = !ru && !wt;
    }

    // Telhado e arremates
    o.roof.visible    = !ru && !wt;
    o.roof.position.y = 3.4 + f * 3.2;
    o.roof.scale.y    = 1.2 + r() * 0.6;

    // Chaminé no topo
    o.chimney.visible    = !ru && !wt && r() < 0.65;
    o.chimney.position.y = 3.6 + f * 3.2;

    // Decorações de cobertura
    const ty = ru ? 0 : (r() * 5) | 0;
    const tp = 3.4 + f * 3.2;
    const s  = o.s;

    // Caixa d'água
    o.tank.visible = ty === 1;
    o.tank.position.set(s * 15.0 + (r() - 0.5) * 3, tp + 0.9, (r() - 0.5) * 8);

    // Piso extra / ático
    o.tier.visible  = ty === 2;
    o.tier.material = wallM(TH.pc[0] + ((r() * (TH.pc[1] - TH.pc[0])) | 0), 2);
    o.tier.scale.y  = 6.4;
    o.tier.position.set(s * 16.25, tp + 3.2, 0);

    // Sacada com corrimão
    o.bal.visible  = o.rail.visible = ty === 3;
    o.bal.position.set(s * 10.45, 6.6, 0);
    o.rail.position.set(s * 9.95, 6.95, 0);

    // Aparelho de AC na parede
    if (o.acUnit) {
      o.acUnit.visible = !ru && !wt && r() < 0.7;
      o.acUnit.position.y = 3.8 + (r() * (f * 2.2));
    }

    // Lojas e grama
    const h = (!ru && !wt) || (ru && r() < 0.35);
    o.shop.visible  = o.up.visible = h;
    o.grass.visible = ru || wt;
    o.grass.material= wt ? waterM : grassM;

    if (wt) {
      o.tank.visible = false;
      o.tier.visible = o.bal.visible = o.rail.visible = false;
      o.roof.visible = false;
      if (o.cornice) o.cornice.visible = false;
    }

    // Placa comercial
    o.sign.visible    = h && !ru;
    o.sign.material   = signMs[TH.sg[0] + ((r() * (TH.sg[1] - TH.sg[0])) | 0)];
    o.sign.position.z = (r() - 0.5) * 10;

    // Toldo
    o.aw.visible = h && !ru && r() < 0.65;

    // Vegetação orgânica (tipo e coloração adaptados por bioma)
    o.tr.visible    = !wt && r() < (ru ? 0.90 : 0.60);
    o.tr.position.x = s * (ru ? 7.1 + r() * 9 : 7.0);
    o.tr.position.z = (r() - 0.5) * 14;

    const chosenCanopyM = ru
      ? greenM
      : TH.coast
        ? palmM
        : r() < 0.45
          ? pinkM   // Flores de Lapacho / Jacarandá
          : greenM; // Verde urbano viçoso

    if (o.can && (o.can as THREE.Mesh).material !== undefined) {
      (o.can as THREE.Mesh).material = chosenCanopyM;
    }
    if (o.foliageClusters) {
      o.foliageClusters.forEach((cl) => {
        cl.material = chosenCanopyM;
      });
    }
  });
}

export function initSegments() {
  for (let i = 0; i < NSEG; i++) {
    const s = mkSeg();
    scene.add(s);
    segs.push(s);
  }
}

/** Arco monumental de Checkpoint e Meta com colunas clássicas e frisos chanfrados. */
export function arch(z: number, txt: string, c: string) {
  const g = new THREE.Group();

  // Colunas clássicas com pedestal e capitel
  [-4.4, 4.4].forEach((x) => {
    // Pedestal cúbico na base
    box(0.70, 0.45, 0.70, M(0x3a3c48), x, 0.22, 0, g);
    // Coluna cônica canelada
    taperCyl(0.24, 0.28, 5.4, poleM, x, 3.15, 0, g, 8);
    // Capitel decorado
    box(0.68, 0.24, 0.68, M(0x9a8870), x, 5.97, 0, g);
  });

  // Viga mestra com letreiro dimensional
  box(9.4, 1.6, 0.52, banner(txt, c), 0, 5.4, 0, g);
  // Frisos arquitetônicos superior e inferior
  box(9.8, 0.18, 0.62, M(0x8a7860), 0, 6.30, 0, g);
  box(9.8, 0.18, 0.62, M(0x8a7860), 0, 4.52, 0, g);

  g.position.z = z;
  scene.add(g);
  return g;
}

export const arcCP  = arch(-400, 'CHECKPOINT', '#1f4fb5');
export const arcEnd = arch(-800, 'META',        '#d9261c');
