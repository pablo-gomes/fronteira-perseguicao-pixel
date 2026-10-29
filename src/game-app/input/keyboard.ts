import { Input } from './queue';

interface KeyHandlers {
  pause: () => void;
  isPlaying: () => boolean;
}

let lastLeanTime = 0;

export function initKeyboard(h: KeyHandlers): () => void {
  const onKeyDown = (e: KeyboardEvent) => {
    const c = e.code;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(c)) e.preventDefault();
    if (e.repeat) return;

    if (c === 'Escape' || c === 'KeyP') {
      h.pause();
    } else if (c === 'KeyA' || c === 'ArrowLeft') {
      const now = performance.now();
      if (now - lastLeanTime > 120) {
        lastLeanTime = now;
        Input.push({ type: 'LEAN', dir: -1 });
      }
    } else if (c === 'KeyD' || c === 'ArrowRight') {
      const now = performance.now();
      if (now - lastLeanTime > 120) {
        lastLeanTime = now;
        Input.push({ type: 'LEAN', dir: 1 });
      }
    } else if (c === 'Space' && h.isPlaying()) {
      Input.push({ type: 'JUMP' });
    } else if (c === 'KeyW' || c === 'ArrowUp') {
      Input.run = true;
    } else if (c === 'KeyS' || c === 'ArrowDown' || c === 'ControlLeft' || c === 'ControlRight') {
      Input.crouch = true;
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    const c = e.code;
    if (c === 'KeyW' || c === 'ArrowUp') Input.run = false;
    if (c === 'KeyS' || c === 'ArrowDown' || c === 'ControlLeft' || c === 'ControlRight') Input.crouch = false;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };
}
