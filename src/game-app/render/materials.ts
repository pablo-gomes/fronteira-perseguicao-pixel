// @ts-nocheck -- imported game was written for non-strict TypeScript; kept as-is.
import * as THREE from 'three';
import { F, tex, noise } from './textures';

export const M = (c: number, m?: THREE.Texture | null) =>
  new THREE.MeshLambertMaterial({ color: c, map: m || null });

export const PBR = (c: number, roughness = 0.32, metalness = 0.55, m?: THREE.Texture | null) =>
  new THREE.MeshStandardMaterial({ color: c, roughness, metalness, map: m || null });

/* ═══════════════════════════════════════════════════════════════════
   ASFALTO, CALÇADAS E MOBILIÁRIO URBANO
   ═══════════════════════════════════════════════════════════════════ */

/** Asfalto com agregado mineral, remendos de piche e marcas de pneu. */
export const asphaltM = M(0xffffff, tex(128, 128, (g) => {
  // Base com ruído de agregado mineral
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const n = Math.sin(x * 0.35 + y * 0.22) * 5 + Math.cos(x * 0.18 - y * 0.41) * 4;
      const v = Math.max(58, Math.min(108, (76 + n + ((Math.random() * 20) | 0)) | 0));
      F(g, `rgb(${v},${v + 1},${v + 6})`, x, y);
    }
  }

  // Remendos de alcatrão / piche com bordas irregulares
  for (let i = 0; i < 28; i++) {
    const rx = (Math.random() * 110) | 0, ry = (Math.random() * 110) | 0;
    const rw = 4 + ((Math.random() * 8) | 0), rh = 2 + ((Math.random() * 5) | 0);
    F(g, 'rgba(32,32,40,0.7)', rx, ry, rw, rh);
    F(g, 'rgba(24,24,30,0.85)', rx + 1, ry + 1, rw - 2, rh - 1);
  }

  // Marcas de frenagem e desgaste de pneus (duas faixas suaves)
  for (let y = 0; y < 128; y++) {
    const o = 0.28 + Math.sin(y * 0.08) * 0.08;
    F(g, `rgba(28,28,34,${o})`, 28, y, 9, 1);
    F(g, `rgba(28,28,34,${o * 0.6})`, 26, y, 2, 1);
    F(g, `rgba(28,28,34,${o * 0.6})`, 37, y, 2, 1);

    F(g, `rgba(28,28,34,${o})`, 91, y, 9, 1);
    F(g, `rgba(28,28,34,${o * 0.6})`, 89, y, 2, 1);
    F(g, `rgba(28,28,34,${o * 0.6})`, 100, y, 2, 1);
  }

  // Pequenas pedrinhas / brita clara no asfalto
  for (let i = 0; i < 60; i++) {
    const sx = (Math.random() * 128) | 0, sy = (Math.random() * 128) | 0;
    F(g, 'rgba(180,184,195,0.4)', sx, sy, 1, 1);
  }
}, 4, 10));

/** Buraco no asfalto com camadas de profundidade e rachaduras orgânicas. */
export const holeM = M(0xffffff, tex(48, 48, (g) => {
  F(g, '#2b2732', 0, 0, 48, 48);
  // Bordas partidas
  F(g, '#1a1622', 4, 4, 40, 40);
  F(g, '#100c18', 8, 8, 32, 32);
  F(g, '#08050e', 14, 14, 20, 20);
  F(g, '#020106', 18, 18, 12, 12);

  // Brita e cascalho solto no fundo
  for (let i = 0; i < 50; i++) {
    const rx = 6 + ((Math.random() * 36) | 0), ry = 6 + ((Math.random() * 36) | 0);
    F(g, '#4a3f55', rx, ry, 2, 2);
    if (i % 2 === 0) F(g, '#706480', rx, ry, 1, 1);
  }
  // Rachaduras pronunciadas
  F(g, '#0f0c16', 0, 14, 8, 2);
  F(g, '#0f0c16', 6, 12, 4, 2);
  F(g, '#0f0c16', 38, 26, 10, 2);
  F(g, '#0f0c16', 34, 28, 6, 2);
  F(g, '#0f0c16', 22, 0, 2, 8);
  F(g, '#0f0c16', 26, 40, 2, 8);
}));

/** Tampa de bueiro metálica com relevo antiderrapante e aro de ferro fundido. */
export const manholeM = M(0xffffff, tex(32, 32, (g) => {
  F(g, '#3a3a44', 0, 0, 32, 32);
  F(g, '#555562', 1, 1, 30, 30);
  F(g, '#24242c', 3, 3, 26, 26);
  F(g, '#444450', 5, 5, 22, 22);

  // Grade xadrez antiderrapante
  for (let y = 7; y < 25; y += 3) {
    for (let x = 7; x < 25; x += 3) {
      F(g, '#656575', x, y, 2, 1);
      F(g, '#1a1a22', x + 1, y + 1, 1, 1);
    }
  }
  // Friso central com inscrições
  F(g, '#1f1f28', 12, 15, 8, 2);
  F(g, '#7a7a8e', 13, 15, 6, 1);
}));

/** Calçada de blocos intertravados (pavers) com juntas e chanfros. */
export const paveM = M(0xffffff, tex(64, 64, (g) => {
  // Base de pedra
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const v = 205 + ((Math.random() * 25) | 0);
      const bx = c * 8, by = r * 8;
      // Bloco de pedra com tom quente natural
      F(g, `rgb(${v},${v - 12},${v - 32})`, bx, by, 8, 8);
      // Junta de argamassa escura
      F(g, '#8c7b64', bx, by, 8, 1);
      F(g, '#8c7b64', bx, by, 1, 8);
      // Chanfro superior iluminado
      F(g, 'rgba(255,255,255,0.3)', bx + 1, by + 1, 6, 1);
      F(g, 'rgba(255,255,255,0.2)', bx + 1, by + 1, 1, 6);
      // Sombra na borda inferior
      F(g, 'rgba(0,0,0,0.18)', bx + 1, by + 7, 7, 1);
      F(g, 'rgba(0,0,0,0.18)', bx + 7, by + 1, 1, 7);
    }
  }
}, 4, 16));

/* ═══════════════════════════════════════════════════════════════════
   JOGADOR / BRAÇOS EM PRIMEIRA PESSOA E UNIFORME POLICIAL
   ═══════════════════════════════════════════════════════════════════ */

/** Tecido ripstop tático do uniforme policial azul-marinho com costuras. */
export const fpUniformTex = tex(64, 64, (g) => {
  // Tecido azul-marinho tático moderno
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const weave = ((x % 4 === 0) || (y % 4 === 0)) ? -6 : 0;
      const v = 28 + weave + ((Math.random() * 8) | 0);
      F(g, `rgb(${v - 4},${v + 4},${v + 28})`, x, y);
    }
  }
  // Costuras duplas reforçadas
  for (let y = 0; y < 64; y += 2) {
    F(g, '#121f36', 16, y, 1, 1);
    F(g, '#3a5482', 17, y, 1, 1);
    F(g, '#121f36', 48, y, 1, 1);
    F(g, '#3a5482', 49, y, 1, 1);
  }
  // Dobras de tecido e sombras volumétricas
  for (let x = 0; x < 64; x++) {
    F(g, 'rgba(10,16,28,0.3)', x, 30, 1, 3);
    F(g, 'rgba(70,100,150,0.25)', x, 33, 1, 2);
  }
});
export const fpUniformM = M(0xffffff, fpUniformTex);

/** Luva tática de combate: couro preto, nylon balístico e reforço nos nós dos dedos. */
export const fpGloveTex = tex(64, 64, (g) => {
  // Base preta / carvão com microtextura
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const n = (Math.random() * 12) | 0;
      const v = 22 + n;
      F(g, `rgb(${v},${v + 2},${v + 5})`, x, y);
    }
  }
  // Textura em colmeia / fibra de carbono para a placa de proteção
  for (let y = 8; y < 28; y += 2) {
    for (let x = 8; x < 56; x += 2) {
      F(g, '#363c48', x, y, 1, 1);
      F(g, '#14161c', x + 1, y, 1, 1);
    }
  }
  // Almofadas de aderência na palma e falanges
  for (let i = 0; i < 4; i++) {
    const fx = 12 + i * 11;
    F(g, '#101216', fx, 36, 8, 22);
    F(g, '#454c5c', fx + 1, 37, 6, 1);
    F(g, '#242832', fx + 2, 40, 4, 14);
  }
  // Costuras de contraste cinza-tático
  for (let x = 4; x < 60; x += 3) {
    F(g, '#6a7488', x, 32, 2, 1);
  }
});
export const fpGloveM = M(0xffffff, fpGloveTex);

/** Relógio tático com display LCD digital iluminado e pulseira de borracha. */
export const fpWatchTex = tex(32, 32, (g) => {
  F(g, '#14161a', 0, 0, 32, 32);
  // Bezel resistente com marcas de minuto
  F(g, '#282d38', 2, 2, 28, 28);
  F(g, '#384050', 3, 3, 26, 2);
  F(g, '#0c1016', 5, 5, 22, 22);

  // Visor digital retroiluminado verde tático
  F(g, '#0a2216', 7, 9, 18, 14);
  F(g, '#123824', 8, 10, 16, 12);

  // Dígitos do cronômetro "14:28" e batimentos
  g.fillStyle = '#48e890';
  g.font = 'bold 8px monospace';
  g.fillText('14:28', 8, 18);

  // Indicador de batimentos cardíacos
  F(g, '#e03a3a', 8, 20, 2, 1);
  F(g, '#48e890', 11, 20, 12, 1);
});
export const fpWatchM = new THREE.MeshBasicMaterial({ map: fpWatchTex });

/** Distintivo policial tático bordado no braço (estrela dourada e escudo nacional). */
export const fpPatchTex = tex(32, 32, (g) => {
  F(g, '#122038', 0, 0, 32, 32);
  // Borda dourada bordada
  F(g, '#d4af37', 2, 2, 28, 28);
  F(g, '#152442', 4, 4, 24, 24);
  // Faixa tricolor paraguaia (vermelho, branco, azul)
  F(g, '#d9261c', 6, 8, 20, 3);
  F(g, '#ffffff', 6, 11, 20, 3);
  F(g, '#1f4fb5', 6, 14, 20, 3);
  // Estrela dourada no centro
  F(g, '#f5c842', 15, 19, 2, 6);
  F(g, '#f5c842', 13, 21, 6, 2);
  F(g, '#ffffff', 15, 21, 2, 2);
});
export const fpPatchM = M(0xffffff, fpPatchTex);

/** Joelheira / cotoveleira reforçada com kevlar e rebites metálicos. */
export const fpKevlarM = M(0x181c24, tex(16, 16, (g) => {
  F(g, '#1a1f28', 0, 0, 16, 16);
  for (let y = 0; y < 16; y += 2) {
    for (let x = 0; x < 16; x += 2) {
      F(g, '#28303e', x, y, 1, 1);
      F(g, '#10141a', x + 1, y + 1, 1, 1);
    }
  }
  // Rebites nos cantos
  F(g, '#8a94a6', 2, 2, 2, 2);
  F(g, '#8a94a6', 12, 2, 2, 2);
  F(g, '#8a94a6', 2, 12, 2, 2);
  F(g, '#8a94a6', 12, 12, 2, 2);
}));

/** Tom de pele humano realista e com sombreamento. */
export const fpSkinM = M(0xdfa682);

/* ═══════════════════════════════════════════════════════════════════
   VEÍCULOS, CONES E OBSTÁCULOS
   ═══════════════════════════════════════════════════════════════════ */

export const coneM = M(0xff5500);
export const coneWhiteM = new THREE.MeshBasicMaterial({ color: 0xffffff });

/** Pneu de borracha com ranhuras de banda de rodagem. */
export const tireTex = tex(32, 32, (g) => {
  F(g, '#18191d', 0, 0, 32, 32);
  for (let y = 0; y < 32; y += 4) {
    F(g, '#101114', 0, y, 32, 2);
    F(g, '#282a32', 0, y + 2, 32, 1);
  }
});
export const tireM = M(0xffffff, tireTex);

/** Roda de liga leve prata com detalhes de raios e porcas de fixação. */
export const rimTex = tex(32, 32, (g) => {
  F(g, '#6a7280', 0, 0, 32, 32);
  F(g, '#9aa2b0', 2, 2, 28, 28);
  F(g, '#3a404c', 6, 6, 20, 20);
  F(g, '#adb8c8', 12, 12, 8, 8);
  F(g, '#20242c', 14, 14, 4, 4);
  // Parafusos
  for (const [x, y] of [[8, 8], [22, 8], [8, 22], [22, 22]]) {
    F(g, '#d8e0ec', x, y, 2, 2);
  }
});
export const rimM = PBR(0xffffff, 0.18, 0.85, rimTex);

export const motoRedM    = PBR(0xd9261c, 0.25, 0.65);
export const motoYellowM = PBR(0xf5b800, 0.25, 0.65);
export const motoBlueM   = PBR(0x1f5ae0, 0.25, 0.65);
export const helmetM     = PBR(0xf0ede6, 0.22, 0.20);

export const policeBlackM = PBR(0x181a20, 0.22, 0.70);
export const policeWhiteM = PBR(0xf6f8fc, 0.20, 0.30);
export const policeBlueM  = PBR(0x1a46b0, 0.25, 0.60);
export const fireRedM     = PBR(0xd41e15, 0.25, 0.50);
export const fireSilverM  = PBR(0xdbe2ea, 0.20, 0.85);
export const fireWhiteM   = PBR(0xfafafa, 0.20, 0.30);
export const ambWhiteM    = PBR(0xfdfdfd, 0.20, 0.30);
export const ambRedM      = PBR(0xd92020, 0.25, 0.50);
export const ambStripeM   = PBR(0x28a745, 0.30, 0.40);

export const sirenRedM   = new THREE.MeshStandardMaterial({ color: 0xff1e1e, emissive: 0xff1010, emissiveIntensity: 1.6, roughness: 0.2 });
export const sirenBlueM  = new THREE.MeshStandardMaterial({ color: 0x1e78ff, emissive: 0x1e78ff, emissiveIntensity: 1.6, roughness: 0.2 });
export const sirenOffM   = new THREE.MeshStandardMaterial({ color: 0x282a34, roughness: 0.6 });
export const headlightM  = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2b8, emissiveIntensity: 1.5, roughness: 0.1 });
export const taillightM  = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff1010, emissiveIntensity: 1.2, roughness: 0.1 });

/* ═══════════════════════════════════════════════════════════════════
   EDIFÍCIOS, CASAS, LOJAS E CENÁRIO
   ═══════════════════════════════════════════════════════════════════ */

export const shopM = M(0xffffff, tex(64, 64, (g) => {
  // Fachada térrea de comércio tradicional
  F(g, '#f2e8d2', 0, 0, 64, 64);
  // Rodapé e soleira
  F(g, '#8c7860', 0, 60, 64, 4);
  F(g, '#4a3c2e', 0, 0, 64, 6);

  // Duas grandes vitrines com iluminação interior acolhedora
  for (const x of [4, 36]) {
    // Moldura de ferro escuro da vitrine
    F(g, '#242a36', x, 12, 24, 46);
    // Vidro com reflexo superior e luz aconchegante interna
    F(g, '#1a3048', x + 1, 13, 22, 44);
    F(g, '#78bad8', x + 2, 14, 20, 6);
    F(g, 'rgba(255,255,255,0.4)', x + 3, 16, 4, 18);
    // Interior iluminado da loja
    F(g, '#d8b87a', x + 2, 38, 20, 18);
    // Mercadorias em exibição (eletrônicos / perfumes / caixas)
    F(g, '#d9261c', x + 4, 42, 6, 6);
    F(g, '#1f4fb5', x + 12, 40, 5, 8);
    F(g, '#2f8f4a', x + 18, 44, 4, 5);
  }
}, 5, 1));

export const awnM = M(0xffffff, tex(4, 16, (g) => {
  for (let i = 0; i < 16; i++) {
    const isRed = i % 2 === 0;
    F(g, isRed ? '#d9261c' : '#fff5dd', 0, i, 4, 1);
    // Linha de costura e dobra
    F(g, isRed ? '#a51810' : '#dcd0b2', 0, i, 1, 1);
  }
}, 1, 5));

export const crateTex = tex(32, 32, (g) => {
  // Madeira com veios e ripas
  F(g, '#d49444', 0, 0, 32, 32);
  for (let i = 0; i < 32; i += 8) {
    F(g, '#825220', 0, i, 32, 1);
    F(g, '#f0b468', 0, i + 1, 32, 1);
  }
  // Moldura reforçada
  F(g, '#8a5824', 0, 0, 4, 32);
  F(g, '#8a5824', 28, 0, 4, 32);
  F(g, '#8a5824', 0, 0, 32, 4);
  F(g, '#8a5824', 0, 28, 32, 4);
  // Diagonal de reforço (X)
  for (let i = 0; i < 32; i++) {
    F(g, '#a26b2e', i, i, 2, 2);
    F(g, '#a26b2e', 30 - i, i, 2, 2);
  }
  // Cantoneiras metálicas e parafusos
  for (const [x, y] of [[1, 1], [27, 1], [1, 27], [27, 27]]) {
    F(g, '#36281c', x, y, 4, 4);
    F(g, '#888480', x + 1, y + 1, 2, 2);
  }
});

export const crateM = M(0xffffff, crateTex);
export const woodM  = M(0xc9a27a, crateTex);
export const poleM  = M(0x564234);

/** Casca de tronco de árvore com ranhuras verticais profundas e musgo. */
export const trunkTex = tex(32, 64, (g) => {
  F(g, '#523a26', 0, 0, 32, 64);
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 32; x++) {
      const groove = Math.sin(x * 1.2 + Math.sin(y * 0.2) * 2) * 8;
      const v = Math.max(30, Math.min(85, (52 + groove + ((Math.random() * 12) | 0)) | 0));
      F(g, `rgb(${v},${(v * 0.8) | 0},${(v * 0.55) | 0})`, x, y);
    }
  }
  // Musgo sutil perto da base
  for (let i = 0; i < 40; i++) {
    F(g, 'rgba(40,110,45,0.4)', (Math.random() * 32) | 0, 40 + ((Math.random() * 24) | 0), 2, 2);
  }
});
export const trunkM = M(0xffffff, trunkTex);

export const whiteM = new THREE.MeshBasicMaterial({ color: 0xf5f0e0 });
export const pinkM  = M(0xf06aa8);
export const greenM = M(0x3e8a34);
export const tankM  = M(0xb8cddb);
export const lampPM = M(0x2a2c34);
export const lampM  = new THREE.MeshBasicMaterial({ color: 0xfff4ba });
export const palmM  = M(0x2a8542);
export const shadM  = new THREE.MeshBasicMaterial({ color: 0x050408, transparent: true, opacity: 0.28, depthWrite: false });

/** Moeda dourada colecionável com relevo e brilho reluzente. */
export const clueTex = tex(32, 32, (g) => {
  g.fillStyle = '#ffd700';
  g.beginPath();
  g.arc(16, 16, 15, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 2.5;
  g.strokeStyle = '#b8860b';
  g.stroke();

  // Borda interna chanfrada
  g.beginPath();
  g.arc(16, 16, 11, 0, Math.PI * 2);
  g.lineWidth = 1.2;
  g.strokeStyle = '#d4af37';
  g.stroke();

  // Estrela dourada no centro com facetas de luz
  F(g, '#ffffff', 14, 14, 4, 4);
  F(g, '#fff4a0', 11, 15, 10, 2);
  F(g, '#fff4a0', 15, 11, 2, 10);
  F(g, '#ffffff', 15, 15, 2, 2);
});
export const clueM = new THREE.MeshBasicMaterial({ map: clueTex });

export const grassM = M(0x5a9a40, tex(32, 32, (g) => {
  F(g, '#5a9a40', 0, 0, 32, 32);
  for (let i = 0; i < 90; i++) {
    F(g, 'rgba(30,75,20,0.38)', (Math.random() * 32) | 0, (Math.random() * 32) | 0, 1, 3);
    F(g, 'rgba(140,210,80,0.32)', (Math.random() * 32) | 0, (Math.random() * 32) | 0, 1, 2);
  }
}, 6, 10));

export const waterM = M(0x388ec8, tex(32, 32, (g) => {
  F(g, '#388ec8', 0, 0, 32, 32);
  for (let i = 0; i < 30; i++) {
    const rx = (Math.random() * 26) | 0, ry = (Math.random() * 32) | 0;
    F(g, 'rgba(255,255,255,0.65)', rx, ry, 6, 1);
    F(g, 'rgba(20,70,120,0.4)', rx, ry + 1, 6, 1);
  }
}, 6, 10));

export const hazM = M(0xffffff, tex(32, 8, (g) => {
  for (let x = 0; x < 32; x++) {
    for (let y = 0; y < 8; y++) {
      F(g, ((x + y * 2) >> 1) % 2 ? '#ffc533' : '#1b1426', x, y);
    }
  }
}));

export const flagM = M(0xffffff, tex(32, 24, (g) => {
  F(g, '#d52b1e', 0, 0, 32, 8);
  F(g, '#ffffff', 0, 8, 32, 8);
  F(g, '#0038a8', 0, 16, 32, 8);
  // Brasão de armas paraguaio no centro
  F(g, '#e0b030', 13, 10, 6, 4);
  F(g, '#2f7d4a', 14, 11, 4, 2);
}));

export const GOODS = [0x2d9cdb, 0xf2c94c, 0x6fcf97, 0xeb5757].map((c) => M(c));

/* ═══════════════════════════════════════════════════════════════════
   PAREDES E FACHADAS ARQUITETÔNICAS DETALHADAS
   ═══════════════════════════════════════════════════════════════════ */

const STUCCO = [
  0xf0ce96, 0xe27a64, 0x76beb2, 0xf2ece0, 0xdeb038, 0x96b0dc, 0xc89e72,
  0x86b280, 0xd4cdc0, 0xb05444, 0x6676a0, 0xe2c298, 0xfbeef0, 0x729852,
];
const walls: Record<number, THREE.Material> = {};

/** Parede arquitetônica detalhada com janelas estruturadas, peitoris e molduras. */
export function wallM(ci: number, f: number) {
  const k = ci * 13 + f;
  if (!walls[k]) {
    walls[k] = M(STUCCO[ci % STUCCO.length], tex(64, 64, (g) => {
      // Base com ruído de reboco/stucco
      F(g, '#fff', 0, 0, 64, 64);
      for (let i = 0; i < 90; i++) {
        F(g, 'rgba(100,80,60,0.12)', (Math.random() * 64) | 0, (Math.random() * 64) | 0, 2, 2);
      }
      // Friso arquitetônico superior e inferior
      F(g, '#ded6c6', 0, 0, 64, 4);
      F(g, '#c0b6a2', 0, 3, 64, 1);
      F(g, '#ded6c6', 0, 60, 64, 4);
      F(g, '#a89c86', 0, 60, 64, 1);

      // Duas janelas bem detalhadas com esquadria, vidro reflexivo e peitoril saliente
      for (const x of [8, 40]) {
        // Moldura externa da janela
        F(g, '#ebe4d4', x - 2, 10, 18, 38);
        F(g, '#b0a490', x - 2, 10, 18, 1);
        // Peitoril inferior saliente (sill)
        F(g, '#f2ece0', x - 4, 47, 22, 4);
        F(g, '#8c806c', x - 4, 50, 22, 2);

        // Vidro interno (com iluminação ou reflexo do céu)
        const lit = (ci + x) % 3 === 0;
        F(g, lit ? '#222838' : '#1e2434', x, 12, 14, 34);

        if (lit) {
          // Luz aconchegante interna amarela
          F(g, '#f8d070', x + 1, 14, 12, 14);
          F(g, '#e0a840', x + 1, 28, 12, 16);
          // Cortinas laterais
          F(g, '#d9261c', x + 1, 14, 3, 30);
          F(g, '#d9261c', x + 10, 14, 3, 30);
        } else {
          // Reflexo azul do céu no vidro
          F(g, '#7aaad6', x + 1, 13, 12, 10);
          F(g, 'rgba(255,255,255,0.45)', x + 2, 14, 3, 20);
        }

        // Esquadria da janela (cruzeta)
        F(g, '#ded6c4', x + 6, 12, 2, 34);
        F(g, '#ded6c4', x, 28, 14, 2);
      }
    }, 5, f));
  }
  return walls[k];
}

/** Placa de loja comercial iluminada com moldura chanfrada. */
export const banner = (txt: string, c: string) =>
  new THREE.MeshBasicMaterial({
    map: tex(256, 64, (g) => {
      F(g, c, 0, 0, 256, 64);
      // Moldura chanfrada clássica
      F(g, '#ffffff', 0, 0, 256, 4);
      F(g, '#ffffff', 0, 0, 4, 64);
      F(g, 'rgba(0,0,0,0.35)', 0, 60, 256, 4);
      F(g, 'rgba(0,0,0,0.35)', 252, 0, 4, 64);

      // Friso interno decorativo
      F(g, 'rgba(255,255,255,0.25)', 8, 8, 240, 1);
      F(g, 'rgba(255,255,255,0.25)', 8, 55, 240, 1);

      // Tipografia pixelada nítida com sombra projetada
      g.font = 'bold 26px monospace';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = 'rgba(0,0,0,0.6)';
      g.fillText(txt, 130, 36);
      g.fillStyle = '#fff9e8';
      g.fillText(txt, 128, 34);
    }),
  });

export const signMs = [
  ['TERERÉ GELADO', '#c8231a'],
  ['CAMBIOS FRONTERA', '#1a48aa'],
  ['PERFUMES IMPORT', '#187e52'],
  ['ELECTRÓNICOS DIGITAL', '#6e38a0'],
  ['FARMACIA CENTRAL', '#d48018'],
  ['ARTESANÍAS ÑANDUTÍ', '#b42246'],
  ['MERCADO 4 COMIDAS', '#a84e16'],
  ['CHIPA TRADICIONAL', '#9a6a24'],
  ['ASADO & PARRILLA', '#7c2416'],
  ['HOTEL & CASINO', '#24427c'],
  ['BANCO NACIONAL', '#186052'],
  ['CAFÉ DE LA PLAZA', '#5e3224'],
].map(([s, c]) => banner(s, c));
