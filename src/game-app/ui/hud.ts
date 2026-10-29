// @ts-nocheck -- imported game was written for non-strict TypeScript; kept as-is.
import { G } from '../game/state';
import { cfg } from '../game/config';
import { total } from '../game/score';

export const $ = (s: string) => (typeof document !== 'undefined' ? document.querySelector(s) as HTMLElement : null);

export const hudEl = {
  get hidden(): boolean {
    const el = typeof document !== 'undefined' ? document.getElementById('hud') : null;
    return el ? el.hidden : true;
  },
  set hidden(v: boolean) {
    const el = typeof document !== 'undefined' ? document.getElementById('hud') : null;
    if (el) el.hidden = v;
  },
};

const getFx = () => (typeof document !== 'undefined' ? document.getElementById('fx') : null);

export function setWarn(t: string | number) {
  const el = $('#warn');
  if (el) el.textContent = String(t);
}

export function setObjective(text: string) {
  const el = $('#obj');
  if (el) el.textContent = text;
}

let toastTimer = 0;
export function toast(m: string) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = m;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (t.textContent = ''), 2400);
}

let shakeTimer = 0;
/** Chacoalha a tela (DOM + Canvas) com animação de impacto realista. */
export function triggerScreenShake() {
  document.body.classList.remove('screen-shaking');
  // Força reflow para reiniciar animação se ocorrerem impactos seguidos
  void document.body.offsetWidth;
  document.body.classList.add('screen-shaking');

  const hpBarEl = document.querySelector('.bar-hp');
  if (hpBarEl) {
    hpBarEl.classList.remove('hit-shake');
    void (hpBarEl as HTMLElement).offsetWidth;
    hpBarEl.classList.add('hit-shake');
  }

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate([30, 20, 35]); } catch {}
  }

  clearTimeout(shakeTimer);
  shakeTimer = window.setTimeout(() => {
    document.body.classList.remove('screen-shaking');
  }, 440);
}

/** Flash cinematográfico de impacto e vinheta vermelha suave. */
export function flashHit() {
  const fx = getFx();
  if (!fx) return;
  fx.classList.remove('on');
  void fx.offsetWidth;
  fx.classList.add('on');
  setTimeout(() => fx.classList.remove('on'), 75);
}

// ── Cache de elementos DOM e valores para eliminar travamentos e reflows desnecessários ──
let elGap: HTMLElement | null = null;
let elProg: HTMLElement | null = null;
let elPgb: HTMLElement | null = null;
let elHpBar: HTMLElement | null = null;
let elHpBox: HTMLElement | null = null;
let elHpVal: HTMLElement | null = null;
let elStam: HTMLElement | null = null;
let elStamBox: HTMLElement | null = null;
let elStamVal: HTMLElement | null = null;
let elSc: HTMLElement | null = null;
let elCpl: HTMLElement | null = null;

let lastGap = -999;
let lastProg = -999;
let lastHpRound = -999;
let lastStamRound = -999;
let lastClues = -999;
let lastTot = -999;
let lastCpState: boolean | null = null;
let lastBodyTrackState: boolean | null = null;

export function updateHud() {
  if (!elGap) {
    elGap = $('#gap');
    elProg = $('#prog');
    elPgb = $('#pgb');
    elHpBar = $('#hp-bar');
    elHpBox = elHpBar ? elHpBar.parentElement : null;
    elHpVal = $('#hp-val');
    elStam = $('#stam');
    elStamBox = elStam ? (elStam.closest('.stat-box') as HTMLElement | null) : null;
    elStamVal = $('#stam-val');
    elSc = $('#sc');
    elCpl = $('#cpl');
  }

  // 1. Distância até o suspeito
  const gap = Math.max(0, Math.round(G.pz - G.fz));
  if (gap !== lastGap && elGap) {
    lastGap = gap;
    elGap.textContent = gap + ' m';
    elGap.style.color = gap > 45 ? '#ff7a6e' : '';
  }

  // 2. Progresso da fase
  const prog = Math.min(100, Math.max(0, Math.floor((-G.pz / G.LEN) * 100)));
  if (prog !== lastProg) {
    lastProg = prog;
    if (elProg) elProg.textContent = prog + '%';
    if (elPgb) elPgb.style.width = prog + '%';
  }

  // 3. Barra e valor de Vida
  const hpRound = Math.round(G.hp);
  if (hpRound !== lastHpRound) {
    lastHpRound = hpRound;
    if (elHpBar) {
      const hpPct = Math.max(0, Math.min(100, (G.hp / G.maxHp) * 100));
      elHpBar.style.width = hpPct + '%';
      if (elHpBox) {
        elHpBox.classList.toggle('mid', hpPct <= 60 && hpPct > 25);
        elHpBox.classList.toggle('low', hpPct <= 25);
      }
    }
    if (elHpVal) {
      elHpVal.textContent = hpRound + '%';
      elHpVal.style.color = hpRound <= 25 ? '#ff7a6e' : hpRound <= 60 ? '#ffc533' : '';
    }
  }

  // 4. Barra e valor de Fôlego: REMOVIDA totalmente no modo câmera ligado
  if (cfg.bodyTrack !== lastBodyTrackState) {
    lastBodyTrackState = cfg.bodyTrack;
    if (elStamBox) {
      elStamBox.style.display = cfg.bodyTrack ? 'none' : '';
    }
  }

  if (!cfg.bodyTrack) {
    const stamRound = Math.round(G.stam);
    const isStamLow = G.lock || G.stam < 22;
    if (stamRound !== lastStamRound) {
      lastStamRound = stamRound;
      if (elStam) {
        elStam.style.width = G.stam + '%';
        elStam.style.background = isStamLow ? '#d9261c' : '';
      }
      if (elStamVal) {
        elStamVal.textContent = stamRound + '%' + (isStamLow ? ' (Fraco!)' : '');
        elStamVal.style.color = isStamLow ? '#ff7a6e' : '';
      }
    }
  }

  // 5. Pontuação e pistas
  const currentTot = total();
  if (G.stats.clues !== lastClues || currentTot !== lastTot) {
    lastClues = G.stats.clues;
    lastTot = currentTot;
    if (elSc) {
      elSc.innerHTML = '<span style="color:#ffd700">🪙 ' + G.stats.clues + '</span> &nbsp; ' + currentTot + ' pts';
    }
  }

  // 6. Checkpoint
  const cpActive = !!G.cp;
  if (cpActive !== lastCpState) {
    lastCpState = cpActive;
    if (elCpl) {
      elCpl.textContent = cpActive ? 'Checkpoint salvo' : 'Checkpoint aos ' + -G.CPZ + ' m';
    }
  }
}
