import * as THREE from 'three';
import { cam } from './scene';
import {
  fpUniformM, fpGloveM, fpWatchM, fpPatchM, M,
} from './materials';

export interface FPArm {
  root: THREE.Group;
  u: THREE.Group;   // pivot do braço (sem malhas do braço superior)
  f: THREE.Group;   // antebraço visível de policial
  s: number;        // lado: -1 esquerdo, 1 direito
  hand: THREE.Group;// mão policial articulada com luva tática
}

/** Cria um dedo anatômico de policial com luva tática flexível e ponta suave. */
function mkPoliceFinger(
  len1: number,
  len2: number,
  r: number,
  bendAngle1: number,
  bendAngle2: number,
  gloveMat: THREE.Material,
): THREE.Group {
  const fGroup = new THREE.Group();

  // Falange proximal (12 lados suaves - elimina o aspecto de prisma/robô)
  const p1 = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.92, r, len1, 12),
    gloveMat,
  );
  p1.rotation.x = Math.PI / 2;
  p1.position.z = -len1 / 2;
  fGroup.add(p1);

  // Junta intermediária anatômica arredondada (suave, sem parafusos robóticos)
  const j1Sphere = new THREE.Mesh(
    new THREE.SphereGeometry(r * 0.94, 10, 8),
    gloveMat,
  );
  j1Sphere.position.z = -len1;
  fGroup.add(j1Sphere);

  // Articulação intermediária
  const j1 = new THREE.Group();
  j1.position.z = -len1;
  j1.rotation.x = bendAngle1;
  fGroup.add(j1);

  // Falange medial e distal anatômica
  const p2 = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.82, r * 0.92, len2, 12),
    gloveMat,
  );
  p2.rotation.x = Math.PI / 2;
  p2.position.z = -len2 / 2;
  j1.add(p2);

  // Segunda junta com ponta arredondada de dedo
  const j2 = new THREE.Group();
  j2.position.z = -len2;
  j2.rotation.x = bendAngle2;
  j1.add(j2);

  const tipLen = len1 * 0.58;
  const tip = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.68, r * 0.82, tipLen, 12),
    gloveMat,
  );
  tip.rotation.x = Math.PI / 2;
  tip.position.z = -tipLen / 2;
  j2.add(tip);

  // Ponta suave esférica da luva de patrulha
  const fingerCap = new THREE.Mesh(
    new THREE.SphereGeometry(r * 0.68, 10, 8),
    gloveMat,
  );
  fingerCap.position.z = -tipLen;
  j2.add(fingerCap);

  return fGroup;
}

/**
 * Modelo de primeira pessoa: antebraço e mãos de policial.
 * Apenas o antebraço fica aparente (sem ombros ou bíceps de robô).
 * O design traz a farda azul-marinho policial clássica, distintivo tático bordado,
 * relógio de serviço e luva tática de patrulha ergonômica.
 */
export const fpArms: FPArm[] = [-1, 1].map((s) => {
  const root = new THREE.Group();
  root.scale.set(0.72, 0.72, 0.72); // Escala refinada e compacta
  const u    = new THREE.Group();   // pivot
  const f    = new THREE.Group();   // antebraço de policial
  const hand = new THREE.Group();   // mão e dedos com luva tática

  root.add(u);
  u.add(f);
  // O antebraço nasce direto da base do pivot
  f.position.set(0, 0, 0);
  f.add(hand);
  hand.position.set(0, 0, -0.28);
  // Posição inicial: mão direita virada para a esquerda, mão esquerda para a direita
  hand.rotation.set(-0.10, s * 0.65, s * 1.35);

  // ═══════════════════════════════════════════════════════════════
  // ANTEBRAÇO DE POLICIAL (MANGA DA FARDA AZUL-MARINHO)
  // ═══════════════════════════════════════════════════════════════

  // Manga principal do antebraço policial (cônico, 16 lados suaves)
  const forearmMain = new THREE.Mesh(
    new THREE.CylinderGeometry(0.040, 0.052, 0.28, 16),
    fpUniformM,
  );
  forearmMain.rotation.x = Math.PI / 2;
  forearmMain.position.set(0, 0, -0.14);
  f.add(forearmMain);

  // Base traseira fechada da manga para evitar visão oca quando a câmera se move
  const sleeveBackCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.052, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    fpUniformM,
  );
  sleeveBackCap.rotation.x = -Math.PI / 2;
  sleeveBackCap.position.set(0, 0, 0.01);
  f.add(sleeveBackCap);

  // Dobra suave natural do tecido da farda no meio do antebraço
  const fabricFold = new THREE.Mesh(
    new THREE.CylinderGeometry(0.046, 0.048, 0.038, 16),
    fpUniformM,
  );
  fabricFold.rotation.x = Math.PI / 2;
  fabricFold.position.set(0, 0, -0.12);
  f.add(fabricFold);

  // Punho dobrado da camisa de uniforme policial (cuff) com costura escura
  const policeCuff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042, 0.040, 0.040, 16),
    M(0x152238),
  );
  policeCuff.rotation.x = Math.PI / 2;
  policeCuff.position.set(0, 0, -0.24);
  f.add(policeCuff);

  // Costura reforçada no punho da farda
  const cuffStitch = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0425, 0.0425, 0.008, 16),
    M(0x283d60),
  );
  cuffStitch.rotation.x = Math.PI / 2;
  cuffStitch.position.set(0, 0, -0.23);
  f.add(cuffStitch);

  // Botão dourado de farda policial no punho da manga
  const policeButton = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 0.005, 8),
    M(0xd4af37),
  );
  policeButton.position.set(s * 0.041, 0.008, -0.24);
  policeButton.rotation.z = -s * (Math.PI / 2);
  f.add(policeButton);

  // Distintivo / Patch tático da Polícia bordado no antebraço
  const policePatch = new THREE.Mesh(
    new THREE.BoxGeometry(0.003, 0.044, 0.046),
    fpPatchM,
  );
  policePatch.position.set(s * 0.048, 0.012, -0.10);
  policePatch.rotation.y = s * 0.10;
  f.add(policePatch);

  // Tarja tática refletiva discreta de patrulha policial
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.003, 0.010, 0.06),
    M(0x4a7ad0),
  );
  stripe.position.set(s * 0.048, -0.016, -0.10);
  f.add(stripe);

  // Acessório de pulso policial:
  if (s === -1) {
    // Braço esquerdo: relógio tático de serviço policial militar (G-Shock style)
    const watchBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.038, 0.038, 16),
      M(0x111317),
    );
    watchBand.rotation.x = Math.PI / 2;
    watchBand.position.set(0, 0, -0.265);
    f.add(watchBand);

    const watchBezel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 0.012, 12),
      M(0x20242c),
    );
    watchBezel.position.set(0, 0.036, -0.265);
    f.add(watchBezel);

    const watchFace = new THREE.Mesh(
      new THREE.CircleGeometry(0.018, 12),
      fpWatchM,
    );
    watchFace.rotation.x = -Math.PI / 2;
    watchFace.position.set(0, 0.0425, -0.265);
    f.add(watchFace);

    // Botões laterais de cronômetro do relógio
    for (const bz of [-0.255, -0.275]) {
      const btn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.003, 0.003, 0.006, 6),
        M(0x505868),
      );
      btn.rotation.z = Math.PI / 2;
      btn.position.set(0.025, 0.036, bz);
      f.add(btn);
    }
  } else {
    // Braço direito: faixa elástica tática de compressão com puxador
    const wristWrap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.038, 0.032, 16),
      M(0x181c24),
    );
    wristWrap.rotation.x = Math.PI / 2;
    wristWrap.position.set(0, 0, -0.265);
    f.add(wristWrap);

    const pullTab = new THREE.Mesh(
      new THREE.BoxGeometry(0.008, 0.014, 0.026),
      M(0x2c3545),
    );
    pullTab.position.set(s * 0.037, 0.008, -0.265);
    f.add(pullTab);
  }

  // ═══════════════════════════════════════════════════════════════
  // MÃO COM LUVA TÁTICA DE POLICIAL (FLEXÍVEL E ORGÂNICA)
  // ═══════════════════════════════════════════════════════════════

  // Palma anatômica em couro tático preto fosco (sem blindagem robótica)
  const palm = new THREE.Mesh(
    new THREE.BoxGeometry(0.076, 0.042, 0.082),
    fpGloveM,
  );
  palm.position.set(0, 0, -0.041);
  hand.add(palm);

  // Almofada de aderência antiderrapante na palma interna
  const palmGrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.064, 0.008, 0.066),
    M(0x14161a),
  );
  palmGrip.position.set(0, -0.021, -0.041);
  hand.add(palmGrip);

  // Almofada tenar macia na base do polegar
  const thenar = new THREE.Mesh(
    new THREE.BoxGeometry(0.026, 0.032, 0.048),
    fpGloveM,
  );
  thenar.position.set(s * 0.036, -0.010, -0.032);
  thenar.rotation.y = s * 0.22;
  hand.add(thenar);

  // Costura acolchoada flexível nas juntas (elimina os nós de robô)
  const knucklePadding = new THREE.Mesh(
    new THREE.BoxGeometry(0.072, 0.014, 0.024),
    M(0x232732),
  );
  knucklePadding.position.set(0, 0.021, -0.065);
  hand.add(knucklePadding);

  // ── Polegar articulado de policial ───────────────────────────
  const thumbBase = new THREE.Group();
  thumbBase.position.set(s * 0.034, -0.006, -0.030);
  thumbBase.rotation.set(0.32, s * 0.50, -s * 0.32);
  hand.add(thumbBase);

  // Falange proximal do polegar (12 lados suaves)
  const th1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.0135, 0.040, 12),
    fpGloveM,
  );
  th1.rotation.x = Math.PI / 2;
  th1.position.z = -0.020;
  thumbBase.add(th1);

  const thJoint = new THREE.Mesh(
    new THREE.SphereGeometry(0.0125, 8, 8),
    fpGloveM,
  );
  thJoint.position.z = -0.040;
  thumbBase.add(thJoint);

  // Falange distal do polegar curvada naturalmente
  const thumbTipJoint = new THREE.Group();
  thumbTipJoint.position.z = -0.040;
  thumbTipJoint.rotation.x = 0.42;
  thumbTipJoint.rotation.y = -s * 0.22;
  thumbBase.add(thumbTipJoint);

  const th2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.009, 0.012, 0.036, 12),
    fpGloveM,
  );
  th2.rotation.x = Math.PI / 2;
  th2.position.z = -0.018;
  thumbTipJoint.add(th2);

  const thTipCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.009, 8, 8),
    fpGloveM,
  );
  thTipCap.position.z = -0.036;
  thumbTipJoint.add(thTipCap);

  // ── 4 Dedos anatômicos com luva policial ──────────────────────
  const fingerSpecs = [
    { x: -0.026, l1: 0.042, l2: 0.034, r: 0.0110, a1: 0.45, a2: 0.36 }, // Indicador
    { x: -0.009, l1: 0.046, l2: 0.038, r: 0.0115, a1: 0.50, a2: 0.40 }, // Médio
    { x:  0.009, l1: 0.042, l2: 0.034, r: 0.0108, a1: 0.54, a2: 0.42 }, // Anelar
    { x:  0.026, l1: 0.036, l2: 0.028, r: 0.0098, a1: 0.58, a2: 0.45 }, // Mínimo
  ];

  fingerSpecs.forEach((spec) => {
    const posX = s === -1 ? spec.x : -spec.x;
    const fNode = mkPoliceFinger(spec.l1, spec.l2, spec.r, spec.a1, spec.a2, fpGloveM);
    fNode.position.set(posX, 0.006, -0.082);
    fNode.rotation.y = (posX / 0.03) * 0.06;
    hand.add(fNode);
  });

  // Configuração de profundidade para renderização correta
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = false;
      o.receiveShadow = false;
      o.renderOrder = 999;
      if (o.material) {
        o.material.depthTest = true;
        o.material.depthWrite = true;
      }
    }
  });

  cam.add(root);
  return { root, u, f, s, hand };
});
