// @ts-nocheck -- imported game was written for non-strict TypeScript; kept as-is.
import { G } from './state';
import { cfg } from './config';
import { BASE, SPR, LANE, GAPMAX, WARN, SEG, NSEG } from './constants';
import { Input } from '../input/queue';
import { beep, impactSound } from '../audio/sound';
import { puff } from '../render/dust';
import { segs, dress } from '../world/segments';
import { obs, clues, Obstacle } from '../world/level';
import { sirenRedM, sirenBlueM, sirenOffM } from '../render/materials';
import { toast, flashHit, setWarn, triggerScreenShake } from '../ui/hud';
import { over, complete } from './flow';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function hit(o: Obstacle) {
  o.hit = true;
  if (G.hitCd > 0) return;
  const S = G.stats;
  S.hits++;
  S.streak = 0;
  G.hitCd = 1.2;
  G.speed *= 0.52;
  G.shake = 1.65; // Chacoalhão equilibrado e responsivo
  G.dip = 0.32;   // Leve recuo da câmera

  // Dano na barra de vida (sem regeneração no jogo)
  const damage = 25;
  G.hp = Math.max(0, G.hp - damage);

  triggerScreenShake();
  flashHit();
  puff(G.px, 0.1, G.pz - 0.8, 18, 2.4, 2.6);
  impactSound();

  if (G.hp <= 0) {
    G.failReason = 'health';
    over();
  }
}

function hitTest(o: Obstacle) {
  if (o.kind === 'jump') return G.py < 0.78;
  if (o.kind === 'crouch') return G.py + (G.crouch ? 1.05 : 1.8) > 1.2 && G.py < 2.2;
  if (o.kind === 'hole') {
    // Pular evita o buraco no chão
    return G.py < 0.65 && o.lanes.some((l) => Math.abs(G.px - l * LANE) < 0.92);
  }
  if (o.kind === 'moto') {
    const mx = o.currentX ?? o.lanes[0] * LANE;
    return G.py < 1.80 && Math.abs(G.px - mx) < 0.70;
  }
  if (o.kind === 'fire') {
    return G.py < 2.6 && o.lanes.some((l) => Math.abs(G.px - l * LANE) < 1.20);
  }
  // Veículos velozes e dodge
  return G.py < 2.3 && o.lanes.some((l) => Math.abs(G.px - l * LANE) < 0.95);
}

/** Atualiza obstáculos móveis (motos que mudam de faixa e viaturas rápidas). */
function updateObstacles(dt: number) {
  const pz = G.pz;
  for (let i = 0; i < obs.length; i++) {
    const o = obs[i];
    if (o.done) continue;

    // Otimização: ignora obstáculos fora do alcance ativo
    const dz = pz - o.z;
    if (dz < -85 || dz > 15) continue;

    // Movimentação veloz em Z
    if (o.speedZ) {
      o.z += o.speedZ * dt;
      o.m.position.z = o.z;
    }

    // Moto dinâmica que muda de faixa periodicamente
    if (o.kind === 'moto') {
      o.laneTimer = (o.laneTimer ?? 1.5) - dt;
      if (o.laneTimer <= 0) {
        const nextLanes = [-1, 0, 1].filter((l) => l !== o.targetLane);
        o.targetLane = nextLanes[Math.floor(Math.random() * nextLanes.length)];
        o.laneTimer = 1.3 + Math.random() * 1.5;
      }
      const targetX = (o.targetLane ?? 0) * LANE;
      o.currentX = (o.currentX ?? targetX) + (targetX - (o.currentX ?? targetX)) * Math.min(1, dt * 4.5);
      o.m.position.x = o.currentX;
      o.lanes = [Math.round(o.currentX / LANE)];
      o.m.rotation.z = (targetX - o.currentX) * -0.15;
    }

    // Giroflex piscante (luzes estroboscópicas)
    if (o.lights && o.lights.length >= 2) {
      o.lightTimer = (o.lightTimer ?? 0.08) - dt;
      if (o.lightTimer <= 0) {
        o.lightTimer = 0.08;
        o.lightState = !o.lightState;
        o.lights[0].material = o.lightState ? sirenRedM : sirenOffM;
        o.lights[1].material = o.lightState ? sirenOffM : sirenBlueM;
      }
    }

    // Sirene de viatura de emergência se aproximando
    if (o.kind === 'police' || o.kind === 'fire' || o.kind === 'ambulance') {
      o.sirenCooldown = Math.max(0, (o.sirenCooldown ?? 0) - dt);
      const dist = G.pz - o.z;
      if (dist > 2 && dist < 42 && o.sirenCooldown <= 0) {
        o.sirenCooldown = 0.24;
        const f = o.kind === 'police' ? 880 : o.kind === 'fire' ? 680 : 980;
        beep(f, 0.1, 'sawtooth', 0.03, f * 0.7);
      }
    }
  }
}

/** Um passo da simulação. Roda só durante PLAYING. */
export function update(dt: number) {
  G.runT += dt;

  // comandos (teclado, toque ou sensor)
  let leanedThisFrame = false;
  for (const c of Input.drain()) {
    if (G.fin) break;
    if (c.type === 'SET_LANE') {
      G.lane = clamp(c.lane, -1, 1);
    } else if (c.type === 'LEAN') {
      if (!leanedThisFrame) {
        G.lane = clamp(G.lane + (c.dir > 0 ? 1 : -1), -1, 1);
        leanedThisFrame = true;
      }
    } else if (c.type === 'JUMP' && G.py === 0) {
      G.vy = 7.6;
      G.py = 0.001;
      beep(300, 0.12, 'square', 0.05, 620);
    }
  }

  // agachar, correr e fôlego
  const n = performance.now();
  G.crouch = !G.fin && (Input.crouch || n < Input.cu);
  const wantsSprint = !G.fin && (Input.run || n < Input.ru);

  let sprint = false;
  let exhausted = false;

  if (cfg.bodyTrack) {
    // ── MODO CÂMERA LIGADO: SISTEMA DE FÔLEGO DESATIVADO (FÔLEGO INFINITO) ──
    // Correr livremente sem consumir fôlego e sem tomar dano de exaustão
    G.stam = 100;
    G.lock = false;
    sprint = wantsSprint;
  } else {
    // ── MODO PADRÃO (TECLADO/TOQUE): SISTEMA DE FÔLEGO ATIVO ──
    sprint = wantsSprint && G.stam > 0 && !G.lock;
    G.stam = sprint ? Math.max(0, G.stam - 24 * dt) : Math.min(100, G.stam + 14 * dt);
    if (G.stam <= 0) G.lock = true;
    else if (G.lock && G.stam > 30) G.lock = false;

    // Se o jogador estiver com pouco fôlego e insistir em correr, perde vida por exaustão
    if (wantsSprint && (G.stam < 22 || G.lock)) {
      exhausted = true;
      G.hp = Math.max(0, G.hp - 20 * dt);
      flashHit();
      beep(95, 0.05, 'triangle', 0.035);
      if (G.hp <= 0) {
        G.failReason = 'health';
        over();
        return;
      }
    }
  }

  // velocidade e movimento
  const target = G.fin ? 0 : (sprint ? SPR : BASE) * (G.crouch ? 0.9 : 1);
  G.speed += (target - G.speed) * Math.min(1, dt * (target > G.speed ? 1.8 : 3));
  G.pz -= G.speed * dt;
  const laneSpeed = cfg.bodyTrack ? 24 : 14;
  G.px += (G.lane * LANE - G.px) * Math.min(1, dt * laneSpeed);
  G.hitCd = Math.max(0, G.hitCd - dt);

  // poeira ao correr (com frequência controlada para máxima fluidez)
  G.dustT -= dt;
  if (G.dustT <= 0 && G.py === 0 && G.speed > 6) {
    G.dustT = 0.09;
    puff(G.px + (Math.random() - 0.5) * 4, 0.05, G.pz - 3 - Math.random() * 4, 1, 0.8, 1.0);
    puff(G.fx, 0.05, G.fz + 0.5, 1, 0.6, 1.2);
  }

  // gravidade do pulo
  if (G.py > 0 || G.vy > 0) {
    G.vy -= 22 * dt;
    G.py += G.vy * dt;
    if (G.py <= 0) {
      G.py = 0;
      G.vy = 0;
      G.dip = 0.16;
      puff(G.px, 0.1, G.pz - 0.8, 6, 1.2, 1.4);
      beep(80, 0.06, 'triangle', 0.05);
    }
  }

  // atualiza movimento e luzes dos obstáculos dinâmicos
  updateObstacles(dt);

  // colisões e pontuação dos obstáculos
  for (let i = 0; i < obs.length; i++) {
    const o = obs[i];
    if (o.done) continue;
    const r = G.pz - o.z;
    if (r < -12) continue; // muito à frente
    const zDepth = o.kind === 'fire' ? 2.6 : (o.kind === 'police' || o.kind === 'ambulance' || o.kind === 'dodge') ? 1.75 : 0.95;
    if (Math.abs(r) < zDepth) {
      if (!o.hit && hitTest(o)) hit(o);
    }
    if (r < -zDepth) {
      o.done = true;
      if (!o.hit) {
        const S = G.stats;
        S.cleared++;
        S.streak++;
        S.best = Math.max(S.best, S.streak);
        beep(660, 0.05, 'square', 0.03);
      }
    }
  }

  // moedas: pontuação e som melódico progressivo (verificação espacial rápida)
  for (let i = 0; i < clues.length; i++) {
    const c = clues[i];
    if (c.got) continue;
    const dz = G.pz - c.z;
    if (dz < -5 || dz > 5) continue;
    if (Math.abs(dz) < 1.35 && Math.abs(G.px - c.x) < 1.45) {
      c.got = true;
      c.m.visible = false;
      G.stats.clues++;
      const pitch = 920 + (G.stats.clues % 8) * 60;
      beep(pitch, 0.08, 'sine', 0.045, pitch * 1.32);
    }
  }

  // checkpoint na metade do capítulo (salva progresso, sem cura)
  if (!G.cp && G.pz <= G.CPZ) {
    G.cp = { z: G.CPZ, S: { ...G.stats }, t: G.runT, hp: G.hp };
    toast('Checkpoint salvo');
    beep(520, 0.2, 'square', 0.05, 780);
  }

  // recicla segmentos de rua que ficaram para trás
  for (const s of segs) {
    if (s.position.z > G.pz + SEG * 1.75) {
      s.position.z -= NSEG * SEG;
      dress(s);
    }
  }

  // suspeito: velocidade, desvios e saltos
  let fs = 12.4 + G.CI * 0.2 + 2.4 * Math.min(1, -G.fz / G.LEN) + 1.2 * Math.sin(G.tm * 0.45);
  const gap = G.pz - G.fz;
  if (gap < 6) fs += (6 - gap) * 2;
  if (G.fin) fs *= 0.15;
  G.fz -= fs * dt;

  // Analisa todos os obstáculos à frente do suspeito (estáticos e viaturas velozes)
  let targetJumpY = 0;
  let targetCrouchScale = 1;
  const blockedLanes = new Set<number>();

  for (let i = 0; i < obs.length; i++) {
    const o = obs[i];
    if (o.done) continue;

    const d = G.fz - o.z;
    // Ignora obstáculos que já ficaram para trás
    if (d < -1.8) continue;

    // Alcance de visão do suspeito: maior para viaturas em aproximação rápida
    const lookahead = o.speedZ ? 32 : 22;
    if (d > lookahead) continue;

    let obstacleLanes = o.lanes;
    if (o.kind === 'moto') {
      const currentLane = Math.round((o.currentX ?? o.lanes[0] * LANE) / LANE);
      const targetL = o.targetLane ?? currentLane;
      obstacleLanes = Array.from(new Set([...o.lanes, currentLane, targetL]));
    }

    // Veículos e bloqueios forçam mudança de faixa
    if (
      o.kind === 'dodge' ||
      o.kind === 'moto' ||
      o.kind === 'police' ||
      o.kind === 'fire' ||
      o.kind === 'ambulance'
    ) {
      for (const l of obstacleLanes) {
        blockedLanes.add(l);
      }
    }

    // Buracos no chão: desvia para faixa livre ou pula alto
    if (o.kind === 'hole') {
      for (const l of obstacleLanes) {
        blockedLanes.add(l);
      }
      const inHole = obstacleLanes.some((l) => Math.abs(G.fx - l * LANE) < 1.35);
      if (inHole && d > 0 && d < 4.8) {
        const jumpArc = 1.05 * Math.sin(Math.PI * Math.max(0, Math.min(1, 1 - d / 4.8)));
        targetJumpY = Math.max(targetJumpY, jumpArc);
      }
    }

    // Obstáculo de salto (cavalete/barreira baixa): salta
    if (o.kind === 'jump') {
      const inJump = obstacleLanes.some((l) => Math.abs(G.fx - l * LANE) < 1.35);
      if (inJump && d > 0 && d < 4.8) {
        const jumpArc = 1.10 * Math.sin(Math.PI * Math.max(0, Math.min(1, 1 - d / 4.8)));
        targetJumpY = Math.max(targetJumpY, jumpArc);
      }
    }

    // Obstáculo de agachar (viga/placa aérea baixa): agacha
    if (o.kind === 'crouch') {
      const inCrouch = obstacleLanes.some((l) => Math.abs(G.fx - l * LANE) < 1.35);
      if (inCrouch && d > 0 && d < 4.2) {
        targetCrouchScale = Math.min(targetCrouchScale, 0.55);
      }
    }
  }

  // Se a faixa planejada estiver obstruída, desvia para a faixa livre mais próxima
  if (blockedLanes.has(G.ftl)) {
    const freeLanes = [-1, 0, 1].filter((l) => !blockedLanes.has(l));
    if (freeLanes.length > 0) {
      freeLanes.sort((a, b) => Math.abs(a - G.ftl) - Math.abs(b - G.ftl));
      G.ftl = freeLanes[0];
    } else {
      // Se todas as faixas estiverem bloqueadas, salta por cima
      targetJumpY = Math.max(targetJumpY, 1.05);
    }
  }

  // Interpolação suave e ágil de física para o suspeito
  G.fy += (targetJumpY - G.fy) * Math.min(1, dt * 13);
  G.fcr += (targetCrouchScale - G.fcr) * Math.min(1, dt * 11);
  G.fx += (G.ftl * LANE - G.fx) * Math.min(1, dt * 9.5);

  // fim da fase e derrota
  if (!G.fin && G.pz <= -G.LEN) {
    G.fin = true;
    G.finT = 0;
    G.gapF = Math.round(G.pz - G.fz);
  }
  if (G.fin) {
    G.finT += dt;
    if (G.finT > 2.2) complete();
  } else if (gap > GAPMAX) over();

  // sem dicas de tutorial na tela; apenas o alerta de fôlego
  setWarn(exhausted ? '⚠ Sem fôlego!' : '');
}
