// @ts-nocheck -- imported game was written for non-strict TypeScript; kept as-is.
import { G } from '../game/state';
import { clues } from '../world/level';
import { updateHud } from '../ui/hud';
import { fug, fb, legs, arms, lowerLegs, forearms, mark, setFugitiveOpacity } from './fugitive';
import { dustUpdate } from './dust';

let currentFugOpacity = 1.0;

/** Animação orgânica do suspeito, pistas, poeira e HUD a cada quadro. */
export function animateScene(dt: number) {
  const s = G;
  const isMoving = s.state === 'PLAYING' || s.state === 'MAIN_MENU' || s.state === 'READY';
  s.lp += dt * (isMoving ? 14 : 0);

  // Ciclo de passada atlético com flexão anatômica de joelhos e cotovelos
  const step = Math.sin(s.lp);
  const oppStep = -step;
  const swingAmp = isMoving ? 0.78 : 0;

  // Coxas
  legs[0].rotation.x = step * swingAmp;
  legs[1].rotation.x = oppStep * swingAmp;

  // Joelhos: dobram para trás anatomicamente ao recolher a perna na passada de corrida
  if (lowerLegs.length >= 2) {
    lowerLegs[0].rotation.x = -Math.max(0, -step) * 1.25 * (isMoving ? 1 : 0);
    lowerLegs[1].rotation.x = -Math.max(0, -oppStep) * 1.25 * (isMoving ? 1 : 0);
  }

  // Braços e cotovelos bombeando em oposição às pernas
  arms[0].rotation.x = oppStep * swingAmp * 0.9;
  arms[1].rotation.x = step * swingAmp * 0.9;
  arms[0].rotation.z = -0.12;
  arms[1].rotation.z =  0.12;

  if (forearms.length >= 2) {
    forearms[0].rotation.x = 0.45 + Math.max(0, oppStep) * 0.65;
    forearms[1].rotation.x = 0.45 + Math.max(0, step) * 0.65;
  }

  // Torso: inclinação atlética para frente, torção sutil no eixo Y e oscilação vertical
  fb.rotation.x = 0.14; // postura de arrancada para frente
  fb.rotation.y = step * 0.10 * (isMoving ? 1 : 0);
  fb.rotation.z = Math.cos(s.lp) * 0.035 * (isMoving ? 1 : 0);
  fb.position.y = Math.abs(Math.sin(s.lp)) * 0.08;
  fb.scale.y = s.fcr;

  fug.position.set(s.fx, s.fy, s.fz);

  // O fugitivo fica levemente transparente quando o jogador está na mesma faixa
  // para permitir ao jogador enxergar através dele os obstáculos à frente
  const isSameLane = Math.abs(s.px - s.fx) < 1.6;
  const targetOpacity = isSameLane ? 0.35 : 1.0;
  currentFugOpacity += (targetOpacity - currentFugOpacity) * Math.min(1, dt * 8);
  setFugitiveOpacity(currentFugOpacity);

  // Marcador holográfico 3D com rotação contínua e pulsação suave
  mark.rotation.y += dt * 2.8;
  mark.position.y = 3.35 + Math.sin(s.tm * 4.2) * 0.16;

  // Pistas de evidência girando e flutuando suavemente (apenas as visíveis próximas)
  const pz = s.pz;
  for (let i = 0; i < clues.length; i++) {
    const c = clues[i];
    if (c.got) continue;
    const dz = c.z - pz;
    if (dz > 12 || dz < -65) continue;
    c.m.rotation.y += dt * 2.6;
    c.m.position.y = 0.9 + Math.sin(s.tm * 3.2 + c.z * 0.1) * 0.12;
  }
  dustUpdate(dt);

  if (s.state !== 'MAIN_MENU') updateHud();
}

