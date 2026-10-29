import { LS } from './storage';
import type { Chapter } from '../world/chapters';

export type GameStateName = 'MAIN_MENU' | 'READY' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'LEVEL_COMPLETE';

export interface Stats {
  cleared: number;
  hits: number;
  clues: number;
  streak: number;
  best: number;
}

export interface Checkpoint {
  z: number;
  S: Stats;
  t: number;
  hp?: number;
}

export interface CompleteData {
  caught: boolean;
  rows: [string, number][];
  tot: number;
  medal: string;
  nb: boolean;
  best: number;
  runT: number;
}

/** Estado global mutável do jogo. Todos os módulos leem e alteram este objeto. */
export const G = {
  state: 'MAIN_MENU' as GameStateName,
  completeData: null as CompleteData | null,

  // jogador
  px: 0, py: 0, pz: 0, vy: 0, speed: 0, lane: 0, eye: 1.7,
  bobP: 0, dip: 0, shake: 0, hitCd: 0, stam: 100, lock: false, crouch: false,
  hp: 100, maxHp: 100, failReason: 'escaped' as 'escaped' | 'health',

  // suspeito
  fz: 0, fx: 0, fy: 0, fcr: 1, ftl: 0,
  fi: 0, // índice do próximo obstáculo que o suspeito encara
  ni: 0, // índice do próximo obstáculo que o jogador encara

  // tempo e fim de fase
  fin: false, finT: 0, gapF: 0, runT: 0, readyT: 0,
  lp: 0, tm: 0, last: 0, lastSt: 0, dustT: 0,

  // pontuação e checkpoint
  stats: { cleared: 0, hits: 0, clues: 0, streak: 0, best: 0 } as Stats,
  cp: null as Checkpoint | null,

  // capítulo atual
  CI: 0,
  TH: undefined as unknown as Chapter,
  LEN: 1200,
  CPZ: -600,

  // progresso salvo (todas as fases desbloqueadas)
  unl: Math.max(4, LS.get<number>('fpp-unl', 4)),
  bests: LS.get<Record<number, number>>('fpp-b2', {}),
};
