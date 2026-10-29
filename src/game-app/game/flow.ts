// @ts-nocheck -- imported game was written for non-strict TypeScript; kept as-is.
import { G } from './state';
import { cfg, saveCfg } from './config';
import { reset } from './reset';
import { parts, total } from './score';
import { LS } from './storage';
import { loadChapter } from '../world/chapters';
import { hudEl, setWarn, toast, setObjective } from '../ui/hud';
import { beep } from '../audio/sound';
import { resize } from '../render/scene';
import { BodyTrackingProvider, recalibrate } from '../input/body-sensor';
import { cameraModal } from './cameraModalState';

import type { GameStateName, CompleteData } from './state';

export type FlowListener = (state: GameStateName, completeData?: CompleteData | null) => void;
const flowListeners = new Set<FlowListener>();

export function subscribeFlow(fn: FlowListener) {
  flowListeners.add(fn);
  return () => { flowListeners.delete(fn); };
}

export function notifyFlow(state: GameStateName, completeData: CompleteData | null = G.completeData) {
  flowListeners.forEach((fn) => fn(state, completeData));
}

/** Inicia uma tentativa, do começo ou do checkpoint. */
export function start(useCp: boolean) {
  if (!useCp) loadChapter(G.CI);
  reset(useCp);
  G.state = 'READY';
  G.readyT = 3.4;
  hudEl.hidden = false;
  setObjective('Cap. ' + (G.CI + 1) + ': ' + G.TH.pl);
  toast(G.TH.n);
  notifyFlow('READY');
}

export function togglePause() {
  if (G.state === 'PLAYING') {
    G.state = 'PAUSED';
    notifyFlow('PAUSED');
  } else if (G.state === 'PAUSED') {
    G.state = 'PLAYING';
    notifyFlow('PLAYING');
  }
}

export function toMenu() {
  G.state = 'MAIN_MENU';
  hudEl.hidden = true;
  reset(false);
  notifyFlow('MAIN_MENU');
}

export function over() {
  G.state = 'GAME_OVER';
  G.speed = 0;
  setWarn('');
  beep(200, 0.4, 'sawtooth', 0.06, 70);
  notifyFlow('GAME_OVER');
}

export function complete() {
  G.state = 'LEVEL_COMPLETE';
  setWarn('');
  const tot = total();
  const caught = G.gapF <= 16;
  const S = G.stats;
  const medal = S.hits <= 1 && caught ? 'Ouro' : S.hits <= 4 ? 'Prata' : 'Bronze';
  const nb = tot > (G.bests[G.CI] || 0);
  if (nb) {
    G.bests[G.CI] = tot;
    LS.set('fpp-b2', G.bests);
  }
  G.unl = Math.max(G.unl, G.CI + 1);
  LS.set('fpp-unl', G.unl);
  beep(520, 0.3, 'square', 0.06, 780);
  const rows = parts();
  const best = G.bests[G.CI];
  const completeData: CompleteData = { caught, rows, tot, medal, nb, best, runT: G.runT };
  G.completeData = completeData;
  notifyFlow('LEVEL_COMPLETE', completeData);
}

/** Ações dos botões de tela, ligadas pelo data-a dos elementos. */
export const actions: Record<string, (v?: string) => void> = {
  start: () => start(false),
  cp: () => start(true),
  resume: () => togglePause(),
  next: () => {
    G.CI++;
    start(false);
  },
  menu: () => toMenu(),
  ch: (v) => {
    G.CI = Number(v);
    loadChapter(G.CI);
    reset(false);
    notifyFlow(G.state);
  },
  comfort: () => {
    cfg.comfort = !cfg.comfort;
    saveCfg();
    notifyFlow(G.state);
  },
  sound: () => {
    cfg.sound = !cfg.sound;
    saveCfg();
    notifyFlow(G.state);
  },
  pix: (v) => {
    cfg.pix = Number(v);
    saveCfg();
    resize();
    notifyFlow(G.state);
  },
  bodyTrack: () => {
    cfg.bodyTrack = !cfg.bodyTrack;
    saveCfg();
    if (cfg.bodyTrack) {
      G.stam = 100;
      G.lock = false;
      BodyTrackingProvider.start();
    } else {
      BodyTrackingProvider.stop();
    }
    resize();
    notifyFlow(G.state);
  },
  calibrate: async () => {
    if (!cfg.bodyTrack) {
      cfg.bodyTrack = true;
      saveCfg();
      G.stam = 100;
      G.lock = false;
      await BodyTrackingProvider.start();
      resize();
    }
    cameraModal.open();
    notifyFlow(G.state);
  },
  testCamera: () => {
    cameraModal.open();
  },
};
