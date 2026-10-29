// @ts-nocheck -- imported game was written for non-strict TypeScript; kept as-is.
import { Input } from './queue';

let lastTouchLean = 0;

/** Deslizar: lateral troca de faixa, para cima pula, para baixo agacha. Toque: corre. */
export function initTouch(isPlaying: () => boolean): () => void {
  let t0: Touch | null = null;

  const onTouchStart = (e: TouchEvent) => {
    t0 = e.touches[0];
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (!t0 || !isPlaying()) return;
    const start = t0;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.clientX;
    const dy = t.clientY - start.clientY;
    const n = performance.now();

    if (Math.hypot(dx, dy) < 24) {
      Input.ru = n + 900;
    } else if (Math.abs(dx) > Math.abs(dy)) {
      if (n - lastTouchLean > 120) {
        lastTouchLean = n;
        Input.push({ type: 'LEAN', dir: dx > 0 ? 1 : -1 });
      }
    } else if (dy < 0) {
      Input.push({ type: 'JUMP' });
    } else {
      Input.cu = n + 700;
    }
    t0 = null;
  };

  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchend', onTouchEnd);

  return () => {
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchend', onTouchEnd);
  };
}
