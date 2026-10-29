import { G } from '../game/state';
import { cfg } from '../game/config';
import { BASE, SPR, LANE } from '../game/constants';
import { beep } from '../audio/sound';
import { cam, dl } from './scene';
import { fpArms } from './firstPerson';

// Suavização dos estados dos braços evita saltos de pose ao arrancar,
// saltar ou agachar. A fase continua ligada à passada usada pela câmera.
let armMotion = 0;
let jumpPose = 0;
let crouchPose = 0;

/** Câmera em primeira pessoa com balanço, inclinação e braços. */
export function camUpdate(dt: number) {
  const s = G;
  s.eye += ((s.state === 'PLAYING' && s.crouch ? 0.95 : 1.7) - s.eye) * Math.min(1, dt * 10);

  const amp = cfg.comfort ? 0.25 : 1.0;
  const sp = Math.min(1.4, s.speed / BASE);
  s.bobP += s.speed * dt * 0.22;
  const phase = s.bobP * Math.PI;

  // ── Balanço imersivo da visão ao correr (Head Bob & Dynamic Sway) ─────────
  // Ativo no chão enquanto o personagem corre.
  const isGroundedRun = s.state === 'PLAYING' && s.py === 0 && s.speed > 1.5;

  // Deslocamento vertical: oscilação harmônica suave a cada pisada (2 impactos por passada)
  const bobY = isGroundedRun
    ? (Math.sin(phase * 2 - Math.PI / 2) - 0.25) * 0.052 * amp * sp
    : 0;

  // Deslocamento lateral: transferência de peso rítmica entre as pernas
  const swayX = isGroundedRun
    ? Math.sin(phase) * 0.046 * amp * sp
    : 0;

  // Rotações da cabeça que tornam a corrida muito mais viva e imersiva:
  // Roll (inclinação lateral rítmica da cabeça a cada passada)
  const runRoll = isGroundedRun
    ? Math.sin(phase) * 0.035 * amp * sp
    : 0;

  // Pitch (aceno suave para frente e para trás acompanhando a passada)
  const runPitch = isGroundedRun
    ? (Math.cos(phase * 2) * 0.020 - 0.008) * amp * sp
    : 0;

  // Yaw (sutil olhar compensatório com o movimento do tronco)
  const runYaw = isGroundedRun
    ? -Math.sin(phase) * 0.015 * amp * sp
    : 0;

  // Inclinação dinâmica ao trocar de faixa (banking effect): inclina suavemente na direção do movimento
  const targetOffset = (s.lane * LANE - s.px);
  const bankRoll = (cfg.comfort ? 0 : Math.max(-0.065, Math.min(0.065, targetOffset * 0.032)));

  // Inclinação vertical ao saltar (olhar acompanha a trajetória aérea)
  const jumpPitch = s.py > 0 ? Math.max(-0.06, Math.min(0.06, s.vy * 0.004)) : 0;

  // Respiração sutil em repouso
  const idleBreathe = s.speed < 2 ? Math.sin(s.tm * 2.2) * 0.008 : 0;

  const step = Math.floor(s.bobP);
  if (step !== s.lastSt) {
    s.lastSt = step;
    if (s.state === 'PLAYING' && s.py === 0) beep(90, 0.04, 'triangle', 0.025);
  }

  s.dip = Math.max(0, s.dip - dt * 2.4);
  s.shake = Math.max(0, s.shake - dt * 2.2);

  // Trauma quadrático: impacto suave, ágil e equilibrado
  const trauma = Math.min(1.8, s.shake);
  const traumaSq = trauma * trauma;
  const shakeTrans = cfg.comfort ? traumaSq * 0.08 : traumaSq * 0.28;
  const shakeRot   = cfg.comfort ? traumaSq * 0.03 : traumaSq * 0.11;

  // Vibração suave de trauma (impactos e colisões)
  const shakeX = (Math.sin(s.tm * 48) * 0.7 + (Math.random() - 0.5) * 0.6) * shakeTrans;
  const shakeY = (Math.cos(s.tm * 52) * 0.7 + (Math.random() - 0.5) * 0.6) * shakeTrans;
  const shakeZ = Math.sin(s.tm * 38) * shakeTrans * 0.5;

  const rollShake  = (Math.sin(s.tm * 42) * 0.6 + (Math.random() - 0.5) * 0.4) * shakeRot;
  const pitchShake = (-Math.abs(Math.cos(s.tm * 34)) * 0.6 + (Math.random() - 0.5) * 0.3) * shakeRot;
  const yawShake   = Math.sin(s.tm * 28) * shakeRot * 0.4;

  // Micro-vibração aerodinâmica em alta velocidade (suave e contínua)
  const windVibe = !cfg.comfort && s.state === 'PLAYING' && s.speed > BASE
    ? Math.sin(s.tm * 32) * 0.003 * Math.min(1.5, (s.speed - BASE) / 10)
    : 0;

  cam.position.set(
    s.px + swayX + shakeX,
    s.py + s.eye + bobY + idleBreathe - s.dip * (cfg.comfort ? 0.4 : 0.8) + shakeY + windVibe,
    s.pz + shakeZ,
  );
  cam.rotation.z = bankRoll + runRoll + rollShake;
  cam.rotation.x = runPitch + jumpPitch + pitchShake;
  cam.rotation.y = runYaw + yawShake;

  // Pulso sutil de FOV (efeito de lente leve e agradável)
  const fovPunch = cfg.comfort ? 0 : Math.min(6, traumaSq * 1.8);
  const fov = 72 + (cfg.comfort ? 0 : Math.max(0, s.speed - BASE) * 0.5) + fovPunch;
  if (Math.abs(fov - cam.fov) > 0.05) {
    cam.fov = fov;
    cam.updateProjectionMatrix();
  }

  // a luz de sombra acompanha o jogador
  const tz = Math.round(s.pz);
  dl.target.position.set(0, 0, tz - 14);
  dl.position.set(-14, 18, tz - 24);

  // Braços em primeira pessoa: fase compartilhada com o balanço dos passos.
  // O braço oposto à perna que avança também avança, como numa corrida real.
  const active = s.state === 'PLAYING';
  const speed01 = Math.max(0, Math.min(1, (s.speed - 2) / (SPR - 2)));
  const moveTarget = active ? Math.min(1, s.speed / BASE) : 0;
  armMotion += (moveTarget - armMotion) * Math.min(1, dt * 5.5);
  const jumpTarget = active ? Math.max(0, Math.min(1, s.py / 1.1)) : 0;
  jumpPose += (jumpTarget - jumpPose) * Math.min(1, dt * 7);
  const crouchTarget = active && s.crouch ? 1 : 0;
  crouchPose += (crouchTarget - crouchPose) * Math.min(1, dt * 6);

  const breathe = Math.sin(s.tm * 2.1) * 0.008 * (1 - armMotion);
  const gap = s.pz - s.fz;
  const rc = s.state === 'PLAYING' && gap < 45 ? Math.min(1, (45 - gap) / 30) * (0.65 + 0.35 * Math.sin(s.tm * 6)) : 0;
  const armShake = traumaSq * 0.12;

  fpArms.forEach((a) => {
    const sidePhase = phase + (a.s > 0 ? Math.PI : 0);
    const sw = Math.sin(sidePhase);
    const swCos = Math.cos(sidePhase);
    const armAmp = 0.12 + speed01 * 0.12;
    a.root.visible = s.state !== 'MAIN_MENU';

    // Mantém apenas os antebraços de policial no rodapé da visão em primeira pessoa
    const armX = a.s * 0.27 - a.s * rc * 0.03 + swayX * 0.10 + swCos * 0.012 * armMotion;
    const armY = -0.32 - bobY * 0.24 + sw * 0.012 * armMotion + breathe - crouchPose * 0.025 - armShake * 0.25;
    const armZ = -0.30 + swCos * 0.018 * armMotion + rc * 0.06 - armShake * 0.2;
    a.root.position.set(armX, armY, armZ);

    // Oscilação natural do antebraço de policial na passada de corrida
    const fPitch = -0.16 + sw * armAmp * 0.85 * armMotion + jumpPose * 0.08 + crouchPose * 0.08 + rc * 0.38 - armShake * 0.25;
    const fYaw   = a.s * (0.12 + rc * 0.08) + swCos * 0.025 * armMotion;
    const fRoll  = -a.s * 0.05;
    a.u.rotation.set(0, 0, 0);
    a.f.rotation.set(fPitch + 0.38, fYaw, fRoll);

    // Apenas as mãos ficam viradas para os lados:
    // mão direita (s=1) virada para a esquerda; mão esquerda (s=-1) virada para a direita
    if (a.hand) {
      const handYaw = a.s * 0.65 + swCos * 0.02 * armMotion;
      const handRoll = a.s * 1.35 - sw * 0.02 * armMotion;
      const handPitch = -0.10 + rc * 0.20 + sw * 0.04 * armMotion;
      a.hand.rotation.set(handPitch, handYaw, handRoll);
    }
  });
}

