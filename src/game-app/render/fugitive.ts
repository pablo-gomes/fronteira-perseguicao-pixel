// @ts-nocheck -- imported game was written for non-strict TypeScript; kept as-is.
import * as THREE from 'three';
import { scene } from './scene';
import { box, cyl, taperCyl, prism, oct } from './geometry';
import { M, crateTex, shadM } from './materials';

export const fug = new THREE.Group();
export const fb  = new THREE.Group(); // corpo (torso, cabeça, mochila)
fug.add(fb);

/* ═══════════════════════════════════════════════════════════════
   MATERIAIS ESPECÍFICOS DO SUSPEITO
   ═══════════════════════════════════════════════════════════════ */
const shirtM     = M(0x277a46); // Camisa verde esmeralda
const collarM    = M(0x19522e); // Gola e detalhes escuros
const skinM      = M(0xdfa682); // Pele humana calorosa
const capM       = M(0xf0b828); // Boné amarelo dourado
const capBrimM   = M(0xd99818); // Aba do boné
const glassesM   = M(0x12141a); // Lente óculos escuros
const glassRimM  = M(0x3a3f4c); // Armação metálica óculos
const pantsM     = M(0x242c44); // Calça jeans/cargo azul-escura
const pantsDarkM = M(0x1a2034); // Detalhes da calça / joelhos
const shoeM      = M(0x1c1e24); // Tênis esportivo preto
const shoeSoleM  = M(0xf5f5f5); // Entressola branca do tênis
const shoeAccentM= M(0xd9261c); // Faixa esportiva vermelha no tênis
const beltM      = M(0x5a341a); // Cinto de couro
const buckleM    = M(0xd0b868); // Fivela metálica
const packM      = M(0xa87848, crateTex); // Mochila de carga rústica
const strapM     = M(0x4a2e16); // Alças reforçadas

/* ═══════════════════════════════════════════════════════════════
   1. TORSO E CINTURA ANATÔMICOS
   ═══════════════════════════════════════════════════════════════ */
// Peitoral e ombros atléticos
box(0.66, 0.28, 0.36, shirtM, 0, 1.58, 0, fb);
// Cintura com afunilamento
box(0.56, 0.36, 0.32, shirtM, 0, 1.30, 0, fb);
// Gola polo aberta e costura frontal
box(0.20, 0.12, 0.04, collarM, 0, 1.66, -0.19, fb);
box(0.04, 0.34, 0.02, collarM, 0, 1.48, -0.18, fb);
// Bolso no peito esquerdo
box(0.12, 0.12, 0.02, collarM, 0.16, 1.52, -0.19, fb);

// Cinto tático de couro com fivela dourada e bolsos utilitários
box(0.58, 0.12, 0.34, beltM, 0, 1.10, 0, fb);
box(0.12, 0.10, 0.04, buckleM, 0, 1.10, -0.18, fb);
box(0.10, 0.14, 0.08, beltM, -0.30, 1.08, 0, fb); // Porta-treco lateral esq
box(0.10, 0.14, 0.08, beltM,  0.30, 1.08, 0, fb); // Porta-treco lateral dir

// Pelve / quadril
box(0.54, 0.22, 0.32, pantsM, 0, 0.96, 0, fb);

/* ═══════════════════════════════════════════════════════════════
   2. PESCOÇO, CABEÇA E BONÉ
   ═══════════════════════════════════════════════════════════════ */
// Pescoço humano cilíndrico
cyl(0.09, 0.16, skinM, 0, 1.76, 0, fb, 8);

// Cabeça anatômica com mandíbula esculpida
box(0.32, 0.32, 0.32, skinM, 0, 1.98, 0, fb);
// Queixo / maxilar
box(0.24, 0.10, 0.14, skinM, 0, 1.84, -0.10, fb);
// Orelhas
box(0.04, 0.10, 0.06, skinM, -0.18, 1.98, 0, fb);
box(0.04, 0.10, 0.06, skinM,  0.18, 1.98, 0, fb);

// Boné esportivo moderno com copa facetada e aba curvada
const capCrown = new THREE.Mesh(
  new THREE.CylinderGeometry(0.20, 0.22, 0.14, 8),
  capM,
);
capCrown.position.set(0, 2.14, -0.01);
fb.add(capCrown);

// Botão no topo do boné
cyl(0.04, 0.03, capBrimM, 0, 2.22, -0.01, fb, 6);

// Aba do boné curvada e projetada para frente
const capBrim = new THREE.Mesh(
  new THREE.BoxGeometry(0.38, 0.04, 0.20),
  capBrimM,
);
capBrim.rotation.x = -0.12;
capBrim.position.set(0, 2.12, -0.18);
fb.add(capBrim);

// Óculos escuros esportivos com armação
box(0.30, 0.02, 0.03, glassRimM, 0, 2.01, -0.18, fb);
box(0.12, 0.08, 0.04, glassesM, -0.09, 1.99, -0.18, fb); // Lente esquerda
box(0.12, 0.08, 0.04, glassesM,  0.09, 1.99, -0.18, fb); // Lente direita
// Hastes dos óculos
box(0.02, 0.03, 0.22, glassRimM, -0.17, 2.01, -0.07, fb);
box(0.02, 0.03, 0.22, glassRimM,  0.17, 2.01, -0.07, fb);

/* ═══════════════════════════════════════════════════════════════
   3. MOCHILA DE CONTRABANDO DETALHADA
   ═══════════════════════════════════════════════════════════════ */
// Corpo principal da mochila com formato arredondado
const packBody = new THREE.Mesh(
  new THREE.BoxGeometry(0.62, 0.68, 0.38),
  packM,
);
packBody.position.set(0, 1.44, 0.32);
fb.add(packBody);

// Bolso frontal da mochila
box(0.48, 0.36, 0.14, M(0x8a5a2e), 0, 1.34, 0.54, fb);
// Fitas e fechos do bolso
box(0.50, 0.04, 0.15, strapM, 0, 1.44, 0.54, fb);
box(0.08, 0.06, 0.16, buckleM, -0.14, 1.44, 0.54, fb);
box(0.08, 0.06, 0.16, buckleM,  0.14, 1.44, 0.54, fb);

// Rolo de carga / saco de dormir amarrado na base da mochila
const roll = new THREE.Mesh(
  new THREE.CylinderGeometry(0.10, 0.10, 0.68, 8),
  M(0x3a483a),
);
roll.rotation.z = Math.PI / 2;
roll.position.set(0, 1.04, 0.36);
fb.add(roll);

// Tiras de amarração do rolo
cyl(0.11, 0.04, strapM, -0.22, 1.04, 0.36, fb, 8);
cyl(0.11, 0.04, strapM,  0.22, 1.04, 0.36, fb, 8);

// Alças da mochila sobre os ombros
box(0.10, 0.36, 0.10, strapM, -0.22, 1.52, 0.02, fb);
box(0.10, 0.36, 0.10, strapM,  0.22, 1.52, 0.02, fb);

/* ═══════════════════════════════════════════════════════════════
   4. PERNAS ARTICULADAS (COXA + JOELHO/CANELA + TÊNIS)
   ═══════════════════════════════════════════════════════════════ */
export const lowerLegs: THREE.Group[] = [];

export const legs = [-0.18, 0.18].map((x) => {
  const hip = new THREE.Group();
  hip.position.set(x, 0.88, 0);

  // Coxa com corte de calça cargo
  const thigh = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.44, 0.26),
    pantsM,
  );
  thigh.position.set(0, -0.20, 0);
  hip.add(thigh);

  // Bolso cargo na lateral da coxa
  const pocket = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.18, 0.16),
    pantsDarkM,
  );
  pocket.position.set(Math.sign(x) * 0.13, -0.18, 0);
  hip.add(pocket);

  // Articulação do joelho
  const knee = new THREE.Group();
  knee.position.set(0, -0.42, 0);
  hip.add(knee);
  lowerLegs.push(knee);

  // Joelheira / rótula
  const kneeCap = new THREE.Mesh(
    new THREE.BoxGeometry(0.20, 0.10, 0.12),
    pantsDarkM,
  );
  kneeCap.position.set(0, 0, -0.09);
  knee.add(kneeCap);

  // Canela / panturrilha com conicidade
  const shin = new THREE.Mesh(
    new THREE.BoxGeometry(0.20, 0.36, 0.22),
    pantsM,
  );
  shin.position.set(0, -0.20, 0);
  knee.add(shin);

  // Barra da calça sobre o tênis
  const cuff = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.06, 0.24),
    pantsDarkM,
  );
  cuff.position.set(0, -0.38, 0);
  knee.add(cuff);

  // Tênis esportivo detalhado voltado para a frente (dedos para frente -Z, calcanhar para trás +Z)
  const foot = new THREE.Group();
  foot.position.set(0, -0.40, -0.06);
  knee.add(foot);

  // Entressola de amortecimento voltada para frente
  const sole = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.07, 0.44),
    shoeSoleM,
  );
  sole.position.set(0, -0.05, -0.04);
  foot.add(sole);

  // Cabedal do calçado
  const upper = new THREE.Mesh(
    new THREE.BoxGeometry(0.23, 0.13, 0.40),
    shoeM,
  );
  upper.position.set(0, 0.04, -0.04);
  foot.add(upper);

  // Biqueira e faixa esportiva lateral
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.03, 0.24),
    shoeAccentM,
  );
  stripe.position.set(0, 0.04, -0.04);
  foot.add(stripe);

  fb.add(hip);
  return hip;
});

/* ═══════════════════════════════════════════════════════════════
   5. BRAÇOS ARTICULADOS (OMBRO/BÍCEPS + COTOVELO/ANTEBRAÇO + MÃO)
   ═══════════════════════════════════════════════════════════════ */
export const forearms: THREE.Group[] = [];

export const arms = [-0.42, 0.42].map((x) => {
  const shoulder = new THREE.Group();
  shoulder.position.set(x, 1.62, 0);

  // Deltoide da manga da camisa
  const delt = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.18, 0.24),
    shirtM,
  );
  delt.position.set(0, -0.06, 0);
  shoulder.add(delt);

  // Bíceps com manga dobrada
  const bicep = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.24, 0.18),
    shirtM,
  );
  bicep.position.set(0, -0.22, 0);
  shoulder.add(bicep);

  // Manga dobrada
  const sleeveRoll = new THREE.Mesh(
    new THREE.BoxGeometry(0.20, 0.06, 0.20),
    collarM,
  );
  sleeveRoll.position.set(0, -0.32, 0);
  shoulder.add(sleeveRoll);

  // Articulação do cotovelo
  const elbow = new THREE.Group();
  elbow.position.set(0, -0.35, 0);
  shoulder.add(elbow);
  forearms.push(elbow);

  // Antebraço (pele visível com manga curta)
  const lowerArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.28, 0.15),
    skinM,
  );
  lowerArm.position.set(0, -0.14, 0);
  elbow.add(lowerArm);

  // Mão fechada em punho de corrida
  const hand = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.14, 0.16),
    skinM,
  );
  hand.position.set(0, -0.32, 0.02);
  elbow.add(hand);

  // Polegar sobre o punho
  const thumb = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.08, 0.10),
    skinM,
  );
  thumb.position.set(Math.sign(x) * -0.07, -0.30, 0.02);
  elbow.add(thumb);

  fb.add(shoulder);
  return shoulder;
});

/* ═══════════════════════════════════════════════════════════════
   6. SOMBRA PROJETADA E MARCADOR HOLOGRÁFICO
   ═══════════════════════════════════════════════════════════════ */
// Sombra oval suave no asfalto
const groundShadow = new THREE.Mesh(
  new THREE.CylinderGeometry(0.65, 0.65, 0.02, 12),
  shadM,
);
groundShadow.position.set(0, 0.03, 0);
fug.add(groundShadow);

// Marcador holográfico 3D (octaedro reluzente vermelho com anel de mira)
export const mark = new THREE.Mesh(
  new THREE.OctahedronGeometry(0.38, 0),
  new THREE.MeshBasicMaterial({ color: 0xff2828, fog: false }),
);
mark.position.y = 3.4;
fug.add(mark);

// Anel de mira ao redor do marcador
const markRing = new THREE.Mesh(
  new THREE.RingGeometry(0.48, 0.54, 8),
  new THREE.MeshBasicMaterial({ color: 0xffd23a, side: THREE.DoubleSide, fog: false }),
);
markRing.rotation.x = Math.PI / 2;
mark.add(markRing);

fug.scale.setScalar(1.22);
scene.add(fug);

// Lista de materiais do fugitivo para controle dinâmico de transparência
export const fugitiveMaterials: THREE.Material[] = [];

fb.traverse((obj) => {
  if (obj instanceof THREE.Mesh) {
    obj.castShadow = true;
    obj.receiveShadow = true;
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        m.transparent = true;
        if (!fugitiveMaterials.includes(m)) {
          fugitiveMaterials.push(m);
        }
      }
    }
  }
});

/** Define a opacidade de todos os componentes do corpo do fugitivo. */
export function setFugitiveOpacity(val: number) {
  for (let i = 0; i < fugitiveMaterials.length; i++) {
    fugitiveMaterials[i].opacity = val;
  }
}
