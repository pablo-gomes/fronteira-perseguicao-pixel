// @ts-nocheck -- imported game was written for non-strict TypeScript; kept as-is.
import { FilesetResolver, PoseLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { CommandSource } from './provider';
import type { Command } from './queue';
import { Input } from './queue';
import { G } from '../game/state';
import { cfg, saveCfg } from '../game/config';
import { toast } from '../ui/hud';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO CENTRAL — ajuste aqui sem precisar alterar o resto do código
// ═══════════════════════════════════════════════════════════════════════════
const CONFIG = {
  // Espelhamento: true = direita física → direita na tela (padrão câmera frontal)
  MIRROR_CAMERA: true,
  // Sensibilidade do controle; resposta instantânea filtrando ruído de câmera
  CAMERA_SMOOTHING: 0.08,
  MOVEMENT_THRESHOLD: 0.02,
  JUMP_SPEED_THRESHOLD: 0.014,
  CROUCH_SPEED_THRESHOLD: 0.014,
  DETECTION_CONFIDENCE: 0.35,
  MAX_DETECTION_LATENCY_MS: 100,
  MOVEMENT_CONFIRMATION_FRAMES: 1,

  // ── Suavização ───────────────────────────────────────────────────────────
  // Sem média móvel: usa a posição do quadro atual para latência zero.
  SMOOTHING_FRAMES: 1,

  // ── Histerese das bordas da grade (0.0–1.0) ───────────────────────────
  // Histerese reduzida para resposta imediata ao passar pelas 3 colunas
  HYSTERESIS: 0.008,

  // ── Confirmação de faixa (horizontal) ────────────────────────────────────
  // Um quadro basta para confirmar a troca de coluna.
  CONFIRMATION_FRAMES: 1,

  // ── Limiar de pulo (zona superior) ───────────────────────────────────────
  // Posição Y normalizada (0=topo, 1=base) abaixo da qual entra na zona de PULO
  JUMP_THRESHOLD: 0.42,

  // ── Limiar de agachamento (zona inferior) ────────────────────────────────
  // Posição Y normalizada acima da qual entra na zona de AGACHAMENTO
  CROUCH_THRESHOLD: 0.58,

  // ── Confirmação vertical ──────────────────────────────────────────────────
  // 1 frame = detecção imediata de pulo (máxima velocidade de resposta)
  VERTICAL_CONFIRMATION_FRAMES: 1,

  // ── Cooldown de pulo (ms) ─────────────────────────────────────────────────
  // 350ms entre pulos — resposta rápida e fluida
  JUMP_COOLDOWN_MS: 350,

  // ── Calibração ───────────────────────────────────────────────────────────
  // Duração da contagem regressiva de calibração de posição (segundos)
  CALIBRATION_DURATION_S: 3,

  // Duração do modo de TESTE após calibração (segundos)
  // Durante o teste, o jogador pode verificar que pulo/agache/faixa funcionam
  CALIBRATION_TEST_DURATION_S: 5,
};

// ═══════════════════════════════════════════════════════════════════════════
// ESTADO INTERNO DO MÓDULO
// ═══════════════════════════════════════════════════════════════════════════

let landmarker: PoseLandmarker | null = null;
let stream: MediaStream | null = null;
let animId: number = 0;
let isRunning = false;
let isInitializing = false;

// ── Elementos da UI PiP ──────────────────────────────────────────────────
let pipContainer: HTMLElement | null = null;
let videoEl: HTMLVideoElement | null = null;
let canvasEl: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let drawingUtils: DrawingUtils | null = null;
let badgeEl: HTMLElement | null = null;
let dotEl: HTMLElement | null = null;
let statusLabelEl: HTMLElement | null = null;
let debugEl: HTMLElement | null = null;       // painel de debug (faixa/movimento)
let showGrid = true;                           // ☑ Mostrar área de detecção

// ── Integração com Menu de Teste & Verificação ─────────────────────────────
let testCanvasEl: HTMLCanvasElement | null = null;
let testCtx: CanvasRenderingContext2D | null = null;
let lastConfidence: number | null = null;
let hasError = false;
let errorMessage = '';

export interface SensorLiveState {
  isRunning: boolean;
  isInitializing: boolean;
  hasError: boolean;
  errorMessage: string;
  lane: -1 | 0 | 1;
  vertical: VerticalZone;
  isPumpingArms: boolean;
  confidence: number | null;
  isCalibrating: boolean;
  isQuickCalibrating: boolean;
  calibrationStepIndex: number;
  calibrationTotalSteps: number;
  calibrationPrompt: string;
  calibrationCountdown: number;
  hasBody: boolean;
  mirrorCamera: boolean;
  showGrid: boolean;
  calibOffsetX: number;
  calibOffsetY: number;
}

type SensorStateListener = (state: SensorLiveState) => void;
const sensorStateListeners = new Set<SensorStateListener>();

let isQuickCalibrating = false;
let quickCalibCountdown = 0;
let currentCalibCountdown = 0;
let currentCalibPrompt = '';

// ── Calibração ────────────────────────────────────────────────────────────
// Offset de calibração normalizado (0.0–1.0) aplicado à posição bruta.
// Quando calibrado ao centro, calibOffsetX = 0.5 - posX_bruta_do_jogador.
// Permite compensar enquadramentos fora do centro sem mover as linhas visuais.
let calibOffsetX = 0.0;
let calibOffsetY = 0.0;
let columnThreshold = 0.5;
let jumpThreshold = CONFIG.JUMP_THRESHOLD;
let crouchThreshold = CONFIG.CROUCH_THRESHOLD;
let isCalibrating = false;
let calibSamples: { x: number; y: number }[] = [];
const calibrationSteps = [
  { key: 'center', prompt: 'Fique em pé, no centro da imagem' },
  { key: 'left', prompt: 'Incline o corpo para a esquerda e mantenha' },
  { key: 'right', prompt: 'Incline o corpo para a direita e mantenha' },
  { key: 'jump', prompt: 'Pule repetidamente' },
  { key: 'crouch', prompt: 'Agache e mantenha a posição' },
] as const;
type CalibrationKey = (typeof calibrationSteps)[number]['key'];
let calibrationData: Record<CalibrationKey, { x: number; y: number }[]> = {
  center: [], left: [], right: [], jump: [], crouch: [],
};
let calibrationStepIndex = 0;

// Modo de TESTE de calibração (após coletar posição, mostra o feedback ao vivo)
let isTestMode = false;
let testModeEndTime = 0;
let testOverlay: HTMLElement | null = null;

// ── Suavização (média móvel da posição dos sensores de ombro) ─────────────
const posHistory: { x: number; y: number }[] = [];
const leftSensorHistory: { x: number; y: number }[] = [];
const rightSensorHistory: { x: number; y: number }[] = [];

// ── Estado de faixa atual ─────────────────────────────────────────────────
// -1 = esquerda, 0 = centro, 1 = direita  (espelha G.lane do jogo)
let currentLane: -1 | 0 | 1 = 0;
let pendingLane: -1 | 0 | 1 = 0;
let laneConfirmCount = 0;

// ── Estado de movimento vertical ──────────────────────────────────────────
type VerticalZone = 'JUMP' | 'NORMAL' | 'CROUCH';
let currentVertical: VerticalZone = 'NORMAL';
let pendingVertical: VerticalZone = 'NORMAL';
let verticalConfirmCount = 0;

// Cooldown de pulo
let lastJumpTime = 0;

// Indicador de badge animado
let badgeTimer = 0;

// Detecção de braços (corrida) — mantida para compatibilidade
const motionHistory: number[] = [];
let prevWristLY = 0;
let prevWristRY = 0;
let prevElbowLY = 0;
let prevElbowRY = 0;

let lastVideoTime = -1;
let previousControlY: number | null = null;
let previousControlAt = 0;

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES UTILITÁRIAS
// ═══════════════════════════════════════════════════════════════════════════

/** Aplica a média móvel sobre o buffer de histórico de posição. */
function smoothedPos(): { x: number; y: number } {
  if (posHistory.length === 0) return { x: 0.5, y: 0.5 };
  const sum = posHistory.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / posHistory.length, y: sum.y / posHistory.length };
}

/** Adiciona uma amostra ao buffer de suavização central. */
function pushSmoothPos(x: number, y: number) {
  posHistory.push({ x, y });
  if (posHistory.length > CONFIG.SMOOTHING_FRAMES) posHistory.shift();
}

/** Adiciona uma amostra ao buffer de suavização de sensor de ombro. */
function pushSmoothSensor(
  history: { x: number; y: number }[],
  x: number,
  y: number,
  maxFrames = CONFIG.SMOOTHING_FRAMES
) {
  history.push({ x, y });
  if (history.length > maxFrames) history.shift();
}

/** Retorna a posição suavizada de um sensor de ombro. */
function getSmoothedSensor(
  history: { x: number; y: number }[],
  fallback: { x: number; y: number }
): { x: number; y: number } {
  if (history.length === 0) return fallback;
  const sum = history.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / history.length, y: sum.y / history.length };
}

export function getBodySensorLane(): -1 | 0 | 1 {
  return currentLane;
}

/**
 * Determina em qual coluna (faixa) da grade o jogador se encontra:
 * - Coluna Esquerda: [0, 1/3] -> faixa -1 (ESQUERDA)
 * - Coluna do Meio:  [1/3, 2/3] -> faixa 0 (CENTRO)
 * - Coluna Direita:  [2/3, 1] -> faixa 1 (DIREITA)
 *
 * Utiliza o centro do corpo do jogador (peito/ombros) com histerese suave (H = 0.025)
 * nas bordas da grade de 3 colunas, garantindo que o personagem fique SEMPRE na coluna
 * correta da câmera sem desvios ou falsas leituras para a direita.
 */
function detectColumn(centerX: number, lane: -1 | 0 | 1): -1 | 0 | 1 {
  const leftBoundary = 1 / 3;  // ~0.3333
  const rightBoundary = 2 / 3; // ~0.6667
  const H = CONFIG.HYSTERESIS;

  if (lane === 0) {
    if (centerX < leftBoundary - H) return -1;
    if (centerX > rightBoundary + H) return 1;
    return 0;
  }
  if (lane === -1) {
    if (centerX > rightBoundary + H) return 1;
    if (centerX > leftBoundary + H) return 0;
    return -1;
  }
  if (lane === 1) {
    if (centerX < leftBoundary - H) return -1;
    if (centerX < rightBoundary - H) return 0;
    return 1;
  }

  if (centerX < leftBoundary) return -1;
  if (centerX > rightBoundary) return 1;
  return 0;
}

/**
 * Determina a zona vertical com base na posição normalizada Y.
 * 0 = topo (pulo), 1 = base (agachar).
 * A histerese também é aplicada verticalmente.
 */
function detectZone(normY: number, zone: VerticalZone, velocityY = 0): VerticalZone {
  const H = CONFIG.HYSTERESIS * 0.8;
  if (zone === 'JUMP') return normY > jumpThreshold + H ? 'NORMAL' : 'JUMP';
  if (zone === 'CROUCH') return normY < crouchThreshold - H ? 'NORMAL' : 'CROUCH';
  // A velocidade detecta o in?cio do gesto antes de atravessar a linha da zona.
  if (normY < jumpThreshold || (velocityY < -CONFIG.JUMP_SPEED_THRESHOLD && normY < 0.57)) return 'JUMP';
  if (normY > crouchThreshold || (velocityY > CONFIG.CROUCH_SPEED_THRESHOLD && normY > 0.43)) return 'CROUCH';
  return 'NORMAL';
}

/** Retorna o nome legível da faixa. */
function laneName(lane: -1 | 0 | 1): string {
  return lane === -1 ? 'ESQUERDA' : lane === 1 ? 'DIREITA' : 'CENTRO';
}

// ═══════════════════════════════════════════════════════════════════════════
// BADGE ANIMADO E STATUS DO PIP
// ═══════════════════════════════════════════════════════════════════════════

function showBadge(text: string, cls = '') {
  if (!badgeEl) return;
  badgeEl.textContent = text;
  badgeEl.className = 'pip-badge ' + cls;
  clearTimeout(badgeTimer);
  badgeTimer = window.setTimeout(() => {
    if (badgeEl && !Input.crouch) {
      badgeEl.textContent = 'EM PÉ (PRONTO)';
      badgeEl.className = 'pip-badge';
    }
  }, 500);
}

function updateStatus(dotClass: 'active' | 'detecting' | '', label: string) {
  if (dotEl) dotEl.className = 'pip-dot ' + dotClass;
  if (statusLabelEl) statusLabelEl.textContent = label;
  const inputBc = document.querySelector('.bc');
  if (inputBc) {
    inputBc.textContent = isRunning
      ? 'Entrada: sensor câmera (MediaPipe)'
      : 'Entrada: teclado/toque';
  }
}

/** Atualiza o painel de debug com faixa e movimento detectados. */
function updateDebugPanel(lane: -1 | 0 | 1, vertical: VerticalZone, confidence: number | null) {
  if (!debugEl) return;
  const vName = vertical === 'JUMP' ? 'PULO' : vertical === 'CROUCH' ? 'AGACHADO' : 'NORMAL';
  const confStr = confidence !== null ? `\nConfiança: ${Math.round(confidence * 100)}%` : '';
  debugEl.textContent = `FAIXA: ${laneName(lane)}\nMOVIMENTO: ${vName}${confStr}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// CALIBRAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Inicia a calibração interativa com contagem regressiva.
 * O jogador deve ficar parado no centro durante CONFIG.CALIBRATION_DURATION_S segundos.
 * Ao finalizar, calibOffsetX e calibOffsetY são ajustados para que a posição
 * do jogador mapeie para o centro da grade (0.5, 0.5).
 * As linhas da grade NÃO se movem — apenas os valores internos são ajustados.
 */
export function recalibrate() {
  if (isCalibrating || isQuickCalibrating) return;
  isCalibrating = true;
  isTestMode = false;
  calibSamples = [];
  calibrationData = { center: [], left: [], right: [], jump: [], crouch: [] };
  calibrationStepIndex = 0;
  columnThreshold = 0.5;
  jumpThreshold = CONFIG.JUMP_THRESHOLD;
  crouchThreshold = CONFIG.CROUCH_THRESHOLD;
  currentCalibCountdown = CONFIG.CALIBRATION_DURATION_S;
  currentCalibPrompt = calibrationSteps[0].prompt;
  emitSensorState(true);
  showCalibrationOverlay();
  toast('🎯 Calibração iniciada! Fique no centro da câmera.');
}

function applyCalibration() {
  if (calibrationData.center.length === 0 && calibSamples.length === 0) {
    isCalibrating = false;
    currentCalibCountdown = 0;
    currentCalibPrompt = '';
    removeCalibrationOverlay();
    emitSensorState(true);
    return;
  }

  // Média das amostras capturadas durante calibração (sem offset aplicado)
  const centerSamples = calibrationData.center.length ? calibrationData.center : calibSamples;
  const avgX = centerSamples.reduce((a, s) => a + s.x, 0) / centerSamples.length;
  const avgY = centerSamples.reduce((a, s) => a + s.y, 0) / centerSamples.length;

  // Offset: desloca posição para que o jogador fique em (0.5, 0.5)
  calibOffsetX = 0.5 - avgX;
  calibOffsetY = 0.5 - avgY;

  const average = (key: CalibrationKey, axis: 'x' | 'y') => {
    const samples = calibrationData[key];
    return samples.length
      ? samples.reduce((sum, sample) => sum + sample[axis], 0) / samples.length
      : null;
  };
  const leftX = average('left', 'x');
  const rightX = average('right', 'x');
  if (leftX !== null && rightX !== null && rightX - leftX > 0.08) {
    columnThreshold = Math.max(0.35, Math.min(0.65, (leftX + rightX) / 2 + calibOffsetX));
  } else {
    columnThreshold = 0.5;
  }
  const jumpYs = calibrationData.jump.map((sample) => sample.y);
  const crouchYs = calibrationData.crouch.map((sample) => sample.y);
  if (jumpYs.length) {
    const jumpY = Math.min(...jumpYs) + calibOffsetY;
    if (jumpY < 0.46) jumpThreshold = Math.max(0.18, Math.min(0.46, (0.5 + jumpY) / 2));
  }
  if (crouchYs.length) {
    const crouchY = Math.max(...crouchYs) + calibOffsetY;
    if (crouchY > 0.54) crouchThreshold = Math.max(0.54, Math.min(0.82, (0.5 + crouchY) / 2));
  }

  // Reseta estado para evitar transições espúrias
  posHistory.length = 0;
  leftSensorHistory.length = 0;
  rightSensorHistory.length = 0;
  previousControlY = null;
  previousControlAt = 0;
  currentLane = 0; // Reinicia no centro l?gico; offset s? compensa o enquadramento.
  pendingLane = currentLane;
  laneConfirmCount = 0;
  currentVertical = 'NORMAL';
  pendingVertical = 'NORMAL';
  verticalConfirmCount = 0;
  Input.crouch = false;
  Input.run = false;

  isCalibrating = false;
  calibSamples = [];
  removeCalibrationOverlay();

  toast('✅ Posição calibrada! Agora TESTE: pule, agache e se mova!');
  showBadge('CALIBRADO ✓', 'jump');

  // Inicia o modo de teste imediatamente após calibração
  startTestMode();
}

// ── Modo de TESTE de calibração ───────────────────────────────────────────
// Após calibrar a posição, exibe um overlay interativo por alguns segundos
// onde o usuário pode ver em tempo real se pulo/agache/faixa estão corretos.

let testModeInterval: number = 0;

function startTestMode() {
  if (!pipContainer) return;
  isTestMode = true;
  testModeEndTime = performance.now() + CONFIG.CALIBRATION_TEST_DURATION_S * 1000;

  // Remove overlay anterior se existir
  if (testOverlay) { testOverlay.remove(); testOverlay = null; }

  testOverlay = document.createElement('div');
  testOverlay.id = 'test-overlay';
  testOverlay.style.cssText = `
    position:absolute;top:4px;left:4px;right:4px;z-index:15;
    background:rgba(0,0,0,0.82);
    border-radius:6px;padding:8px;
    font-family:monospace;text-align:center;
    border:1px solid rgba(76,255,145,0.4);
    pointer-events:none;
  `;
  testOverlay.innerHTML = `
    <div style="font-size:11px;color:#4cff91;font-weight:bold;margin-bottom:6px;">✅ TESTE DE CALIBRAÇÃO</div>
    <div style="font-size:10px;color:#aaa;margin-bottom:8px;">PULE • AGACHE • MOVA-SE</div>
    <div id="test-action" style="
      font-size:22px;font-weight:bold;color:#fff;
      padding:6px;border-radius:4px;
      background:rgba(56,214,208,0.15);
      transition:background 0.1s,color 0.1s;
    ">AGUARDANDO...</div>
    <div id="test-lane" style="font-size:10px;color:#ffc533;margin-top:5px;">FAIXA: —</div>
    <div id="test-timer" style="font-size:9px;color:#555;margin-top:4px;">
      Fecha em ${CONFIG.CALIBRATION_TEST_DURATION_S}s
    </div>
  `;
  pipContainer.appendChild(testOverlay);

  // Countdown para fechar o modo de teste
  let remaining = CONFIG.CALIBRATION_TEST_DURATION_S;
  clearInterval(testModeInterval);
  testModeInterval = window.setInterval(() => {
    remaining--;
    const timerEl = document.getElementById('test-timer');
    if (timerEl) timerEl.textContent = remaining > 0 ? `Fecha em ${remaining}s` : 'Concluído!';
    if (remaining <= 0) { stopTestMode(); }
  }, 1000);
}

function stopTestMode() {
  clearInterval(testModeInterval);
  isTestMode = false;
  if (testOverlay) { testOverlay.remove(); testOverlay = null; }
  toast('🎮 Calibração concluída! Boa sorte!');
}

/** Atualiza o painel de teste com a ação detectada no frame atual. */
function updateTestOverlay(lane: -1 | 0 | 1, zone: VerticalZone) {
  if (!isTestMode || !testOverlay) return;

  const actionEl = document.getElementById('test-action');
  const laneEl = document.getElementById('test-lane');

  if (actionEl) {
    let actionText: string;
    let bgColor: string;
    if (zone === 'JUMP') {
      actionText = '⬆ PULANDO!';
      bgColor = 'rgba(76,255,145,0.35)';
      actionEl.style.color = '#4cff91';
    } else if (zone === 'CROUCH') {
      actionText = '⬇ AGACHADO!';
      bgColor = 'rgba(255,197,51,0.35)';
      actionEl.style.color = '#ffc533';
    } else {
      actionText = '▶ NORMAL';
      bgColor = 'rgba(56,214,208,0.10)';
      actionEl.style.color = '#aaa';
    }
    actionEl.textContent = actionText;
    actionEl.style.background = bgColor;
  }

  if (laneEl) {
    const laneText = lane === -1 ? '⬅ ESQUERDA' : lane === 1 ? '➡ DIREITA' : '⏺ CENTRO';
    laneEl.textContent = `FAIXA: ${laneText}`;
    laneEl.style.color = lane === -1 ? '#38d6d0' : lane === 1 ? '#ffc533' : '#4cff91';
  }
}

// ── Overlay de calibração ──────────────────────────────────────────────────

let calibOverlay: HTMLElement | null = null;
let calibCountdownInterval: number = 0;

function showCalibrationOverlay() {
  if (!pipContainer) return;
  removeCalibrationOverlay();

  calibOverlay = document.createElement('div');
  calibOverlay.id = 'calib-overlay';
  calibOverlay.style.cssText = `
    position:absolute;inset:0;z-index:20;
    background:rgba(0,0,0,0.78);
    display:flex;align-items:center;justify-content:center;
    border-radius:8px;font-family:monospace;
  `;
  calibOverlay.innerHTML = `
    <div style="text-align:center;color:#fff;padding:16px;">
      <div style="font-size:13px;font-weight:bold;color:#ffc533;margin-bottom:8px;">
        🎯 CALIBRAR SENSOR
      </div>
      <div id="calib-prompt" style="font-size:11px;color:#ccc;margin-bottom:14px;">
        ${calibrationSteps[0].prompt}
      </div>
      <div id="calib-cd" style="font-size:38px;font-weight:bold;color:#38d6d0;line-height:1;">
        ${CONFIG.CALIBRATION_DURATION_S}
      </div>
      <div id="calib-status" style="font-size:10px;color:#aaa;margin-top:10px;">
        Aguardando...
      </div>
    </div>
  `;

  pipContainer.appendChild(calibOverlay);

  let remaining = CONFIG.CALIBRATION_DURATION_S;
  calibCountdownInterval = window.setInterval(() => {
    remaining--;
    const cdEl = document.getElementById('calib-cd');
    const stEl = document.getElementById('calib-status');
    if (cdEl) {
      cdEl.textContent = remaining > 0 ? String(remaining) : '✓';
      cdEl.style.color = remaining <= 1 ? '#4cff91' : '#38d6d0';
    }
    if (stEl) stEl.textContent = `Etapa ${calibrationStepIndex + 1}/${calibrationSteps.length} ? amostras: ${calibSamples.length}`;
    if (remaining <= 0) {
      const step = calibrationSteps[calibrationStepIndex];
      calibrationData[step.key] = calibSamples.slice();
      calibrationStepIndex++;
      if (calibrationStepIndex >= calibrationSteps.length) {
        clearInterval(calibCountdownInterval);
        const stEl2 = document.getElementById('calib-status');
        if (stEl2) stEl2.textContent = 'CALIBRA??O CONCLU?DA';
        window.setTimeout(() => applyCalibration(), 500);
      } else {
        calibSamples = [];
        remaining = CONFIG.CALIBRATION_DURATION_S;
        const cdEl = document.getElementById('calib-cd');
        const stEl2 = document.getElementById('calib-status');
        const promptEl = document.getElementById('calib-prompt');
        if (cdEl) cdEl.textContent = String(remaining);
        if (promptEl) promptEl.textContent = calibrationSteps[calibrationStepIndex].prompt;
        if (stEl2) stEl2.textContent = `Etapa ${calibrationStepIndex + 1}/${calibrationSteps.length}`;
      }
    }
  }, 1000);
}

function removeCalibrationOverlay() {
  clearInterval(calibCountdownInterval);
  if (calibOverlay) {
    calibOverlay.remove();
    calibOverlay = null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GRADE VISUAL FIXA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Desenha a grade 2×3 sobre o canvas do PiP.
 * HORIZONTAL: 2 colunas — 1 linha vertical central em x = 50%
 * VERTICAL:   3 zonas  — 2 linhas horizontais em y = JUMP_THRESHOLD e CROUCH_THRESHOLD
 * Todas as linhas são FIXAS. Não acompanham o jogador.
 */
function drawGrid(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
  const w = canvas.width;
  const h = canvas.height;
  const x1 = w / 3;
  const x2 = 2 * w / 3;
  const y1 = h / 3;
  const y2 = 2 * h / 3;
  context.save();
  context.strokeStyle = 'rgba(56, 214, 208, 0.85)';
  context.lineWidth = 2;
  context.setLineDash([8, 5]);
  context.beginPath();
  context.moveTo(x1, 0); context.lineTo(x1, h);
  context.moveTo(x2, 0); context.lineTo(x2, h);
  context.stroke();
  context.strokeStyle = 'rgba(255, 197, 51, 0.7)';
  context.lineWidth = 1.5;
  context.setLineDash([6, 4]);
  context.beginPath();
  context.moveTo(0, y1); context.lineTo(w, y1);
  context.moveTo(0, y2); context.lineTo(w, y2);
  context.stroke();
  context.setLineDash([]);
  context.font = 'bold 10px monospace';
  context.textAlign = 'center';
  context.fillStyle = 'rgba(56, 214, 208, 0.95)';
  context.fillText('ESQUERDA', w / 6, 14);
  context.fillText('CENTRO', w / 2, 14);
  context.fillText('DIREITA', 5 * w / 6, 14);
  context.textAlign = 'left';
  context.fillStyle = 'rgba(255, 197, 51, 0.95)';
  context.fillText('PULO', 3, y1 - 3);
  context.fillText('NORMAL', 3, (y1 + y2) / 2 + 3);
  context.fillText('AGACHAR', 3, y2 + 11);
  context.restore();
}

/**
 * Desenha os DOIS sensores de referência posicionados próximos aos ombros do usuário.
 * Em vez de um único ponto no peito, o jogador tem agora dois sensores posicionados
 * próximos aos ombros (esquerdo e direito, cerca de 70% a partir do centro do peito),
 * indicando com alta precisão e clareza visual quando o corpo passa para a direita ou esquerda.
 */
function drawDualShoulderSensors(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  leftSens: { x: number; y: number },
  rightSens: { x: number; y: number },
  lane: -1 | 0 | 1,
  zone: VerticalZone
) {
  const w = canvas.width;
  const h = canvas.height;
  const lx = Math.max(12, Math.min(w - 12, leftSens.x * w));
  const ly = Math.max(12, Math.min(h - 12, leftSens.y * h));
  const rx = Math.max(12, Math.min(w - 12, rightSens.x * w));
  const ry = Math.max(12, Math.min(h - 12, rightSens.y * h));
  const mx = (lx + rx) / 2;
  const my = (ly + ry) / 2;

  context.save();

  // 1. Linha tática conectando os dois sensores (região peitoral/clavicular)
  context.strokeStyle = 'rgba(56, 214, 208, 0.45)';
  context.lineWidth = 1.5;
  context.setLineDash([4, 4]);
  context.beginPath();
  context.moveTo(lx, ly);
  context.lineTo(rx, ry);
  context.stroke();
  context.setLineDash([]);

  // Ponto central guia no meio da conexão
  context.fillStyle = 'rgba(56, 214, 208, 0.7)';
  context.beginPath();
  context.arc(mx, my, 2.5, 0, Math.PI * 2);
  context.fill();

  // 2. Determinação de estado ativo por faixa e movimento vertical
  const isLeftActive = lane === -1;
  const isRightActive = lane === 1;
  const isJump = zone === 'JUMP';
  const isCrouch = zone === 'CROUCH';

  const baseColor = isJump ? '#4cff91' : isCrouch ? '#ffc533' : '#38d6d0';
  const leftColor = isLeftActive ? '#4cff91' : baseColor;
  const rightColor = isRightActive ? '#ffc533' : baseColor;

  // Função para desenhar um sensor individual próximo ao ombro
  const drawSensor = (
    x: number,
    y: number,
    label: string,
    color: string,
    isActive: boolean,
    side: 'left' | 'right'
  ) => {
    context.save();
    context.strokeStyle = color;
    context.fillStyle = color;

    // Efeito de brilho quando ativo
    if (isActive || isJump || isCrouch) {
      context.shadowColor = color;
      context.shadowBlur = 8;
    }

    // Anel externo tático
    context.lineWidth = isActive ? 2.5 : 1.8;
    context.beginPath();
    context.arc(x, y, 9, 0, Math.PI * 2);
    context.stroke();

    // Núcleo central do sensor
    context.beginPath();
    context.arc(x, y, isActive ? 4 : 3, 0, Math.PI * 2);
    context.fill();

    // Ticks táticos (retículo em formato de mira com ênfase lateral)
    context.beginPath();
    if (side === 'left') {
      context.moveTo(x - 14, y); context.lineTo(x - 6, y);
      context.moveTo(x, y - 10); context.lineTo(x, y - 6);
      context.moveTo(x, y + 6); context.lineTo(x, y + 10);
    } else {
      context.moveTo(x + 6, y); context.lineTo(x + 14, y);
      context.moveTo(x, y - 10); context.lineTo(x, y - 6);
      context.moveTo(x, y + 6); context.lineTo(x, y + 10);
    }
    context.stroke();

    // Rótulo do sensor
    context.shadowBlur = 0;
    context.font = 'bold 9px monospace';
    context.textAlign = 'center';
    context.fillStyle = color;
    context.fillText(label, x, y - 12);

    if (isActive) {
      context.font = 'bold 8px monospace';
      context.fillStyle = '#fff';
      context.fillText(side === 'left' ? '◀ ATIVO' : 'ATIVO ▶', x, y + 18);
    }

    context.restore();
  };

  // Desenha os dois sensores próximos aos ombros
  drawSensor(lx, ly, 'SENSOR ESQ', leftColor, isLeftActive, 'left');
  drawSensor(rx, ry, 'SENSOR DIR', rightColor, isRightActive, 'right');

  // Rótulo central de status
  const vLabel = isJump ? '▲ PULO ▲' : isCrouch ? '▼ AGACHAR ▼' : `${laneName(lane)}`;
  const centerColor = isJump ? '#4cff91' : isCrouch ? '#ffc533' : 'rgba(255,255,255,0.9)';
  context.font = 'bold 9px monospace';
  context.fillStyle = centerColor;
  context.textAlign = 'center';
  context.fillText(vLabel, mx, my + 14);

  context.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// PROCESSAMENTO DE GESTOS
// ═══════════════════════════════════════════════════════════════════════════

function processGestures(landmarks: NormalizedLandmark[], emit?: (c: Command) => void) {
  const now = performance.now();
  const pushCmd = (c: Command) => { if (emit) emit(c); else Input.push(c); };

  const lShoulder = landmarks[11];
  const rShoulder = landmarks[12];
  const lHip = landmarks[23];
  const rHip = landmarks[24];
  const lElbow = landmarks[13];
  const rElbow = landmarks[14];
  const lWrist = landmarks[15];
  const rWrist = landmarks[16];

  // ── DOIS SENSORES PRÓXIMOS AOS OMBROS DO USUÁRIO ──────────────────────
  // Landmark 11 = ombro esquerdo anatômico, Landmark 12 = ombro direito anatômico.
  const rawCenterCamX = (lShoulder.x + rShoulder.x) / 2;
  const rawCenterCamY = (lShoulder.y + rShoulder.y) / 2;

  // Fator 0.70 coloca os dois sensores a 70% do centro em direção aos ombros,
  // ou seja, bem próximos aos ombros (região da clavícula / peitoral superior),
  // sem ficarem exatamente em cima da ponta da articulação dos ombros.
  const SHOULDER_FACTOR = 0.70;

  const lSensCamX = rawCenterCamX + SHOULDER_FACTOR * (lShoulder.x - rawCenterCamX);
  const lSensCamY = rawCenterCamY + SHOULDER_FACTOR * (lShoulder.y - rawCenterCamY);
  const rSensCamX = rawCenterCamX + SHOULDER_FACTOR * (rShoulder.x - rawCenterCamX);
  const rSensCamY = rawCenterCamY + SHOULDER_FACTOR * (rShoulder.y - rawCenterCamY);

  // Espelhamento horizontal para câmera frontal (comportamento de espelho natural)
  const lSensX = CONFIG.MIRROR_CAMERA ? 1 - lSensCamX : lSensCamX;
  const rSensX = CONFIG.MIRROR_CAMERA ? 1 - rSensCamX : rSensCamX;
  const lSensY = lSensCamY;
  const rSensY = rSensCamY;

  // Determina qual sensor está à esquerda e qual à direita na tela do jogador
  const screenLeftX = Math.min(lSensX, rSensX);
  const screenRightX = Math.max(lSensX, rSensX);
  const screenLeftY = lSensX <= rSensX ? lSensY : rSensY;
  const screenRightY = lSensX <= rSensX ? rSensY : lSensY;

  // Ponto central médio dos dois sensores
  const rawX = (screenLeftX + screenRightX) / 2;
  const rawY = (screenLeftY + screenRightY) / 2;

  // ── Calibração em andamento: coleta amostras (sem offset) ─────────────
  if (isCalibrating || isQuickCalibrating) {
    calibSamples.push({ x: rawX, y: rawY });
    return; // não processa gestos durante calibração
  }

  // ── Aplica offset de calibração e normaliza em [0,1] ──────────────────
  const calibX = Math.max(0, Math.min(1, rawX + calibOffsetX));
  const calibY = Math.max(0, Math.min(1, rawY + calibOffsetY));

  const calibLeftX = Math.max(0, Math.min(1, screenLeftX + calibOffsetX));
  const calibLeftY = Math.max(0, Math.min(1, screenLeftY + calibOffsetY));
  const calibRightX = Math.max(0, Math.min(1, screenRightX + calibOffsetX));
  const calibRightY = Math.max(0, Math.min(1, screenRightY + calibOffsetY));

  // ── Suavização dos dois sensores de ombro ─────────────────────────────
  pushSmoothSensor(leftSensorHistory, calibLeftX, calibLeftY, CONFIG.SMOOTHING_FRAMES);
  pushSmoothSensor(rightSensorHistory, calibRightX, calibRightY, CONFIG.SMOOTHING_FRAMES);
  const smoothLeft = getSmoothedSensor(leftSensorHistory, { x: calibLeftX, y: calibLeftY });
  const smoothRight = getSmoothedSensor(rightSensorHistory, { x: calibRightX, y: calibRightY });

  // Posição central suavizada
  const previousPos = posHistory[posHistory.length - 1];
  const displacement = previousPos ? Math.hypot(calibX - previousPos.x, calibY - previousPos.y) : 1;
  const smoothing = displacement > CONFIG.MOVEMENT_THRESHOLD ? 0 : CONFIG.CAMERA_SMOOTHING;
  const filteredX = previousPos ? previousPos.x + (calibX - previousPos.x) * (1 - smoothing) : calibX;
  const filteredY = previousPos ? previousPos.y + (calibY - previousPos.y) * (1 - smoothing) : calibY;
  pushSmoothPos(filteredX, filteredY);
  const { x: smoothX, y: smoothY } = smoothedPos();

  // ── DETECÇÃO HORIZONTAL (faixa) estritamente alinhada às 3 colunas da câmera ──
  const targetLane = detectColumn(smoothX, currentLane);

  if (targetLane === currentLane) {
    laneConfirmCount = 0;
    pendingLane = currentLane;
  } else {
    if (targetLane !== pendingLane) {
      pendingLane = targetLane;
      laneConfirmCount = 1;
    } else {
      laneConfirmCount++;
    }
    if (laneConfirmCount >= CONFIG.MOVEMENT_CONFIRMATION_FRAMES) {
      currentLane = targetLane;
      laneConfirmCount = 0;
      pushCmd({ type: 'SET_LANE', lane: targetLane });
      showBadge(targetLane === -1 ? '⬅ ESQUERDA' : targetLane === 1 ? 'DIREITA ➡' : '⏺ CENTRO', '');
    }
  }

  // Garante que o jogo fique sempre sincronizado com a coluna física da câmera
  if (G.state === 'PLAYING' && G.lane !== currentLane) {
    pushCmd({ type: 'SET_LANE', lane: currentLane });
  }

  // ── DETECÇÃO VERTICAL (zona) com confirmação ──────────────────────────
  // JUMP usa VERTICAL_CONFIRMATION_FRAMES=1 → resposta imediata
  const elapsed = previousControlAt ? Math.max(1, now - previousControlAt) : 33;
  const velocityY = previousControlY === null ? 0 : (smoothY - previousControlY) * (33 / elapsed);
  previousControlY = smoothY;
  previousControlAt = now;
  const targetZone = detectZone(smoothY, currentVertical, velocityY);

  if (targetZone === currentVertical) {
    verticalConfirmCount = 0;
    pendingVertical = currentVertical;
  } else {
    if (targetZone !== pendingVertical) {
      pendingVertical = targetZone;
      verticalConfirmCount = 1;
    } else {
      verticalConfirmCount++;
    }
    if (verticalConfirmCount >= CONFIG.VERTICAL_CONFIRMATION_FRAMES) {
      const prevVertical = currentVertical;
      currentVertical = targetZone;
      verticalConfirmCount = 0;

      if (currentVertical === 'JUMP' && now - lastJumpTime > CONFIG.JUMP_COOLDOWN_MS) {
        lastJumpTime = now;
        pushCmd({ type: 'JUMP' });
        showBadge('⬆ PULO!', 'jump');
      }

      if (currentVertical === 'CROUCH') {
        Input.crouch = true;
        showBadge('⬇ AGACHADO', 'crouch');
      } else if (prevVertical === 'CROUCH' || currentVertical === 'NORMAL') {
        Input.crouch = false;
      }
    }
  }

  // ── Atualiza overlay de TESTE se estiver ativo ────────────────────────
  if (isTestMode) {
    updateTestOverlay(currentLane, currentVertical);
    if (performance.now() >= testModeEndTime) stopTestMode();
  }

  // Garante consistência do agachamento
  if (currentVertical !== 'CROUCH' && Input.crouch) {
    Input.crouch = false;
  }

  // ── DETECÇÃO DE CORRIDA (bombear braços) — mantida para compatibilidade ─
  const shoulderWidth = Math.max(0.08, Math.hypot(lShoulder.x - rShoulder.x, lShoulder.y - rShoulder.y));
  const deltaArms = (
    Math.abs(lWrist.y - prevWristLY) +
    Math.abs(rWrist.y - prevWristRY) +
    0.5 * (Math.abs(lElbow.y - prevElbowLY) + Math.abs(rElbow.y - prevElbowRY))
  );
  prevWristLY = lWrist.y; prevWristRY = rWrist.y;
  prevElbowLY = lElbow.y; prevElbowRY = rElbow.y;

  const normalizedMotion = deltaArms / shoulderWidth;
  motionHistory.push(normalizedMotion);
  if (motionHistory.length > 8) motionHistory.shift();
  const avgMovement = motionHistory.reduce((a, b) => a + b, 0) / motionHistory.length;
  const isPumpingArms = avgMovement > 0.065 && !Input.crouch;

  if (isPumpingArms) { Input.run = true; showBadge('🏃 CORRENDO', 'sprint'); }
  else { Input.run = false; }

  // ── Confiança média dos landmarks-chave ───────────────────────────────
  const keyLm = [lShoulder, rShoulder, lHip, rHip].filter(Boolean);
  const avgConf = keyLm.length > 0
    ? keyLm.reduce((a, lm) => a + (lm.visibility ?? 0.5), 0) / keyLm.length
    : null;
  lastConfidence = avgConf;

  cachedLeftSens = smoothLeft;
  cachedRightSens = smoothRight;

  // ── Atualiza painel de debug com status ágil ──
  updateDebugPanel(currentLane, currentVertical, avgConf);
}

// ═══════════════════════════════════════════════════════════════════════════
// LOOP DE RENDERIZAÇÃO / DETECÇÃO ULTRA-LEVE DESACOPLADO
// ═══════════════════════════════════════════════════════════════════════════

let inferCanvas: HTMLCanvasElement | null = null;
let inferCtx: CanvasRenderingContext2D | null = null;
let isDetecting = false;
let lastDetectTime = 0;
let lastVideoTimestamp = 0;
let cachedLandmarks: NormalizedLandmark[] | null = null;
let cachedLeftSens = { x: 0.35, y: 0.45 };
let cachedRightSens = { x: 0.65, y: 0.45 };
// Intervalo adaptativo: começa em ~30 FPS e se ajusta ao custo real da detecção
// para nunca consumir mais que ~35% do tempo do quadro principal.
let detectIntervalMs = 33;
let avgDetectCost = 8;
let lastInferVideoTime = -1;
let lastDrawnVideoTime = -1;

function renderDetectionLoop(emit?: (c: Command) => void) {
  if (!isRunning || !videoEl || !canvasEl || !ctx) return;
  animId = requestAnimationFrame(() => renderDetectionLoop(emit));

  if (videoEl.readyState < 2) return;
  const vt = videoEl.currentTime;
  const newFrame = vt !== lastDrawnVideoTime;

  if (newFrame) {
    lastDrawnVideoTime = vt;
    ctx.save();
    if (CONFIG.MIRROR_CAMERA) {
      ctx.translate(320, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(videoEl, 0, 0, 320, 240);
    if (CONFIG.MIRROR_CAMERA) {
      ctx.scale(-1, 1);
      ctx.translate(-320, 0);
    }
    if (showGrid) drawGrid(canvasEl, ctx);
    if (cachedLandmarks) {
      updateStatus('active', 'CONECTADO');
      drawDualShoulderSensors(canvasEl, ctx, cachedLeftSens, cachedRightSens, currentLane, currentVertical);
    } else {
      updateStatus('detecting', 'ENQUADRE O CORPO');
      if (badgeEl && !Input.crouch && !Input.run) {
        badgeEl.textContent = 'PROCURANDO...';
        badgeEl.className = 'pip-badge';
      }
    }
    ctx.restore();

    if (testCanvasEl && testCtx) {
      const tw = testCanvasEl.width;
      const th = testCanvasEl.height;
      testCtx.save();
      if (CONFIG.MIRROR_CAMERA) {
        testCtx.translate(tw, 0);
        testCtx.scale(-1, 1);
      }
      testCtx.drawImage(videoEl, 0, 0, tw, th);
      if (CONFIG.MIRROR_CAMERA) {
        testCtx.scale(-1, 1);
        testCtx.translate(-tw, 0);
      }
      if (showGrid) drawGrid(testCanvasEl, testCtx);
      if (cachedLandmarks) {
        drawDualShoulderSensors(testCanvasEl, testCtx, cachedLeftSens, cachedRightSens, currentLane, currentVertical);
      }
      testCtx.restore();
    }
  }

  // Inferência só quando há um quadro novo da câmera e o intervalo adaptativo permite
  const now = performance.now();
  if (landmarker && !isDetecting && vt !== lastInferVideoTime && now - lastDetectTime >= detectIntervalMs) {
    lastDetectTime = now;
    lastInferVideoTime = vt;
    isDetecting = true;
    try {
      if (!inferCanvas) {
        inferCanvas = document.createElement('canvas');
        inferCanvas.width = 192;
        inferCanvas.height = 144;
        inferCtx = inferCanvas.getContext('2d', { willReadFrequently: false });
      }
      if (inferCtx) {
        inferCtx.drawImage(videoEl, 0, 0, 192, 144);
        const ts = Math.max(now, lastVideoTimestamp + 1);
        lastVideoTimestamp = ts;
        const t0 = performance.now();
        const results = landmarker.detectForVideo(inferCanvas, ts);
        const cost = performance.now() - t0;
        avgDetectCost = avgDetectCost * 0.85 + cost * 0.15;
        // Mantém a detecção abaixo de ~35% do tempo disponível (entre 33ms e 120ms)
        detectIntervalMs = Math.min(120, Math.max(33, avgDetectCost / 0.35));
        if (results.landmarks && results.landmarks.length > 0) {
          cachedLandmarks = results.landmarks[0];
          processGestures(cachedLandmarks, emit);
        } else {
          cachedLandmarks = null;
          Input.crouch = false;
          Input.run = false;
          updateDebugPanel(currentLane, 'NORMAL', null);
        }
      }
    } catch {
      // Trata frames transitórios
    } finally {
      isDetecting = false;
    }
    emitSensorState();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CRIAÇÃO DA INTERFACE PiP
// ═══════════════════════════════════════════════════════════════════════════

function createPipUI() {
  if (document.getElementById('body-sensor-pip')) return;

  pipContainer = document.createElement('div');
  pipContainer.id = 'body-sensor-pip';
  pipContainer.innerHTML = `
    <div class="pip-header">
      <div class="pip-status">
        <span class="pip-dot"></span>
        <span class="pip-title" style="font-size:12px">CÂMERA</span>
      </div>
      <div style="display:flex;align-items:center;gap:4px">
        <label style="font-size:10px;color:#ccc;cursor:pointer;display:flex;align-items:center;gap:3px;user-select:none">
          <input type="checkbox" id="pip-grid-toggle" checked style="margin:0;width:11px;height:11px;">
          Grade
        </label>
        <button class="pip-btn" id="pip-calib"
          title="Calibrar posição central do sensor"
          style="background:rgba(255,197,51,0.2);color:var(--sun,#ffc533);border:1px solid rgba(255,197,51,0.4);border-radius:3px;margin-right:2px;">
          🎯 Calibrar
        </button>
        <button class="pip-btn" id="pip-min" title="Minimizar / Expandir">_</button>
        <button class="pip-btn" id="pip-close" title="Desativar Câmera">✕</button>
      </div>
    </div>
    <div class="pip-view" style="position:relative">
      <video class="pip-video" playsinline muted autoplay style="display:none"></video>
      <canvas class="pip-canvas" width="320" height="240"></canvas>
      <div class="pip-badge">INICIANDO...</div>
      <div id="pip-debug" style="
        position:absolute;bottom:4px;right:4px;
        background:rgba(0,0,0,0.65);color:#4cff91;
        font:bold 9px monospace;padding:4px 6px;
        border-radius:4px;line-height:1.5;
        white-space:pre;pointer-events:none;
        border:1px solid rgba(76,255,145,0.3);
      ">AGUARDANDO...</div>
    </div>
  `;

  document.body.appendChild(pipContainer);

  videoEl = pipContainer.querySelector('video') as HTMLVideoElement;
  canvasEl = pipContainer.querySelector('canvas') as HTMLCanvasElement;
  ctx = canvasEl.getContext('2d', { alpha: false, desynchronized: true }) as CanvasRenderingContext2D | null;
  canvasEl.width = 320;
  canvasEl.height = 240;
  if (ctx) drawingUtils = new DrawingUtils(ctx);

  dotEl = pipContainer.querySelector('.pip-dot');
  statusLabelEl = pipContainer.querySelector('.pip-title');
  badgeEl = pipContainer.querySelector('.pip-badge');
  debugEl = document.getElementById('pip-debug');

  document.getElementById('pip-calib')?.addEventListener('click', recalibrate);

  const gridToggle = document.getElementById('pip-grid-toggle') as HTMLInputElement | null;
  if (gridToggle) {
    gridToggle.checked = showGrid;
    gridToggle.addEventListener('change', () => { showGrid = gridToggle.checked; });
  }

  document.getElementById('pip-min')?.addEventListener('click', () => {
    pipContainer?.classList.toggle('minimized');
  });

  document.getElementById('pip-close')?.addEventListener('click', () => {
    BodyTrackingProvider.stop();
    cfg.bodyTrack = false;
    saveCfg();
    const btn = document.querySelector('[data-a="bodyTrack"]');
    if (btn) {
      btn.setAttribute('aria-pressed', 'false');
      btn.textContent = '📹 Sensor Câmera: Desligado';
    }
  });
}

function removePipUI() {
  removeCalibrationOverlay();
  if (pipContainer) {
    pipContainer.remove();
    pipContainer = null;
    videoEl = null;
    canvasEl = null;
    ctx = null;
    drawingUtils = null;
    dotEl = null;
    statusLabelEl = null;
    badgeEl = null;
    debugEl = null;
  }
  const inputBc = document.querySelector('.bc');
  if (inputBc) inputBc.textContent = 'Entrada: teclado/toque';
}

// ═══════════════════════════════════════════════════════════════════════════
// INICIALIZAÇÃO DO MEDIAPIPE
// ═══════════════════════════════════════════════════════════════════════════

async function initMediaPipe(): Promise<PoseLandmarker> {
  if (landmarker) return landmarker;

  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
  );

  try {
    landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
  } catch (err) {
    console.warn('[BodyTrackingProvider] GPU delegate falhou, tentando CPU fallback:', err);
    landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        delegate: 'CPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
  }

  return landmarker;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT: Provedor de comandos por rastreamento corporal
// ═══════════════════════════════════════════════════════════════════════════

export const BodyTrackingProvider: CommandSource = {
  name: 'body-tracking',

  async start(emit?: (c: Command) => void) {
    if (isRunning || isInitializing) return;
    isInitializing = true;

    try {
      createPipUI();
      updateStatus('detecting', 'INICIANDO IA...');
      toast('Carregando visão computacional...');

      await initMediaPipe();

      updateStatus('detecting', 'PEDINDO CÂMERA...');
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 320, max: 640 },
          height: { ideal: 240, max: 480 },
          frameRate: { ideal: 30, max: 30 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (videoEl) {
        videoEl.srcObject = stream;
        await videoEl.play();
      }

      // Reseta todos os estados
      isRunning = true;
      isInitializing = false;
      isDetecting = false;
      cachedLandmarks = null;
      lastDetectTime = 0;
      lastVideoTimestamp = 0;
      calibOffsetX = 0;
      calibOffsetY = 0;
      posHistory.length = 0;
      leftSensorHistory.length = 0;
      rightSensorHistory.length = 0;
      previousControlY = null;
      previousControlAt = 0;
      currentLane = 0;
      pendingLane = 0;
      laneConfirmCount = 0;
      currentVertical = 'NORMAL';
      pendingVertical = 'NORMAL';
      verticalConfirmCount = 0;
      lastJumpTime = 0;
      isCalibrating = false;
      calibSamples = [];
      Input.crouch = false;
      Input.run = false;

      hasError = false;
      errorMessage = '';
      updateStatus('active', 'CONECTADO');
      toast('📹 Câmera ativa! Fique no centro da tela.');
      emitSensorState(true);

      renderDetectionLoop(emit);
    } catch (err) {
      console.error('[BodyTrackingProvider] Erro ao iniciar:', err);
      isInitializing = false;
      isRunning = false;
      hasError = true;
      errorMessage = err instanceof Error ? err.message : String(err);
      removePipUI();
      toast('⚠ Câmera não autorizada ou indisponível.');
      cfg.bodyTrack = false;
      saveCfg();
      emitSensorState(true);
    }
  },

  stop() {
    isRunning = false;
    isInitializing = false;
    isDetecting = false;
    cachedLandmarks = null;
    lastDetectTime = 0;
    lastVideoTimestamp = 0;
    inferCanvas = null;
    inferCtx = null;
    cancelAnimationFrame(animId);
    removeCalibrationOverlay();

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }

    Input.run = false;
    Input.crouch = false;
    posHistory.length = 0;
    leftSensorHistory.length = 0;
    rightSensorHistory.length = 0;
    previousControlY = null;
    previousControlAt = 0;
    currentLane = 0;
    pendingLane = 0;
    laneConfirmCount = 0;
    currentVertical = 'NORMAL';
    pendingVertical = 'NORMAL';
    verticalConfirmCount = 0;
    isCalibrating = false;
    calibSamples = [];

    removePipUI();
    toast('Sensor de câmera desligado.');
    emitSensorState(true);
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS DE INTEGRAÇÃO COM MENU DE TESTE & CALIBRAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

let lastEmitTime = 0;

export function emitSensorState(force = false) {
  if (sensorStateListeners.size === 0) return;
  const now = performance.now();
  if (!force && now - lastEmitTime < 33) return; // ~30 fps cap para renders do React
  lastEmitTime = now;

  const state: SensorLiveState = {
    isRunning,
    isInitializing,
    hasError,
    errorMessage,
    lane: currentLane,
    vertical: currentVertical,
    isPumpingArms: Input.run,
    confidence: lastConfidence,
    isCalibrating: isCalibrating || isQuickCalibrating,
    isQuickCalibrating,
    calibrationStepIndex,
    calibrationTotalSteps: calibrationSteps.length,
    calibrationPrompt: isQuickCalibrating
      ? 'Fique em pé no centro e relaxe os braços'
      : (currentCalibPrompt || calibrationSteps[calibrationStepIndex]?.prompt || ''),
    calibrationCountdown: isQuickCalibrating ? quickCalibCountdown : currentCalibCountdown,
    hasBody: cachedLandmarks !== null,
    mirrorCamera: CONFIG.MIRROR_CAMERA,
    showGrid,
    calibOffsetX,
    calibOffsetY,
  };
  sensorStateListeners.forEach((fn) => fn(state));
}

/**
 * Conecta o canvas do modal de teste ao fluxo contínuo de renderização.
 * Quando o modal está aberto, o mini-pip fica oculto para não sobrepor a visão.
 */
export function setTestCanvas(canvas: HTMLCanvasElement | null) {
  testCanvasEl = canvas;
  if (canvas) {
    testCtx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (pipContainer) {
      pipContainer.style.display = 'none';
    }
  } else {
    testCtx = null;
    if (pipContainer) {
      pipContainer.style.display = 'flex';
    }
  }
}

let quickCalibInterval = 0;

/**
 * Calibra rapidamente a posição central do jogador (3 segundos parado no centro).
 * Compensa qualquer ângulo ou enquadramento da webcam para que o personagem
 * fique sempre alinhado na faixa do meio (0).
 */
export function calibrateCenterNow(durationSeconds = 3): Promise<boolean> {
  return new Promise((resolve) => {
    if (isCalibrating || isQuickCalibrating) {
      resolve(false);
      return;
    }
    isQuickCalibrating = true;
    quickCalibCountdown = durationSeconds;
    calibSamples = [];
    emitSensorState(true);
    toast('🎯 Calibrando centro! Fique relaxado no centro da câmera.');

    clearInterval(quickCalibInterval);
    quickCalibInterval = window.setInterval(() => {
      quickCalibCountdown--;
      emitSensorState(true);
      if (quickCalibCountdown <= 0) {
        clearInterval(quickCalibInterval);
        if (calibSamples.length > 0) {
          const avgX = calibSamples.reduce((a, s) => a + s.x, 0) / calibSamples.length;
          const avgY = calibSamples.reduce((a, s) => a + s.y, 0) / calibSamples.length;
          calibOffsetX = 0.5 - avgX;
          calibOffsetY = 0.5 - avgY;
          toast('✅ Centro calibrado! Seu personagem está perfeitamente alinhado.');
        } else {
          calibOffsetX = 0;
          calibOffsetY = 0;
          toast('⚠️ Fique visível no centro da câmera.');
        }

        posHistory.length = 0;
        leftSensorHistory.length = 0;
        rightSensorHistory.length = 0;
        previousControlY = null;
        previousControlAt = 0;
        currentLane = 0;
        pendingLane = 0;
        laneConfirmCount = 0;
        currentVertical = 'NORMAL';
        pendingVertical = 'NORMAL';
        verticalConfirmCount = 0;
        Input.crouch = false;
        Input.run = false;
        isQuickCalibrating = false;
        quickCalibCountdown = 0;
        emitSensorState(true);
        resolve(true);
      }
    }, 1000);
  });
}

export function subscribeSensorState(fn: SensorStateListener): () => void {
  sensorStateListeners.add(fn);
  emitSensorState(true);
  return () => {
    sensorStateListeners.delete(fn);
  };
}

export function getMirrorCamera(): boolean {
  return CONFIG.MIRROR_CAMERA;
}

export function setMirrorCamera(val: boolean) {
  CONFIG.MIRROR_CAMERA = val;
  emitSensorState(true);
}

export function getShowGrid(): boolean {
  return showGrid;
}

export function setShowGrid(val: boolean) {
  showGrid = val;
  const gridToggle = document.getElementById('pip-grid-toggle') as HTMLInputElement | null;
  if (gridToggle) gridToggle.checked = val;
  emitSensorState(true);
}

export function isBodySensorRunning(): boolean {
  return isRunning;
}

export async function startBodySensor(): Promise<void> {
  if (isRunning) return;
  await BodyTrackingProvider.start();
}

export function stopBodySensor(): void {
  BodyTrackingProvider.stop();
}

