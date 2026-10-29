import { cfg } from '../game/config';

let ac: AudioContext | undefined;

/** Bipe sintetizado com Web Audio. Não usa arquivos de áudio. */
export function beep(f: number, d = 0.08, t: OscillatorType = 'square', v = 0.05, f2?: number) {
  if (!cfg.sound) return;
  try {
    ac = ac || new AudioContext();
    if (ac.state === 'suspended') ac.resume();
    const o = ac.createOscillator(), gn = ac.createGain(), n = ac.currentTime;
    o.type = t;
    o.frequency.setValueAtTime(f, n);
    if (f2) o.frequency.linearRampToValueAtTime(f2, n + d);
    gn.gain.setValueAtTime(v, n);
    gn.gain.exponentialRampToValueAtTime(0.0001, n + d);
    o.connect(gn).connect(ac.destination);
    o.start();
    o.stop(n + d);
  } catch (e) {
    /* áudio indisponível */
  }
}

/** Som de impacto equilibrado e suave de colisão. */
export function impactSound() {
  if (!cfg.sound) return;
  // Baque moderado
  beep(90, 0.28, 'triangle', 0.14, 35);
  // Estalo suave de impacto
  beep(170, 0.18, 'sawtooth', 0.09, 50);
}
