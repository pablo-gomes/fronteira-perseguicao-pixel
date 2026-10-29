import * as THREE from 'three';

/** Preenche um retângulo no canvas de textura. */
export function F(g: CanvasRenderingContext2D, c: string, x: number, y: number, w = 1, h = 1) {
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
}

/** Preenche com ruído monocromático sutil. */
export function noise(g: CanvasRenderingContext2D, w: number, h: number, baseR: number, baseG: number, baseB: number, spread = 12, alpha = 1) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = ((Math.random() - 0.5) * spread) | 0;
      const r = Math.max(0, Math.min(255, baseR + n));
      const gv = Math.max(0, Math.min(255, baseG + n));
      const b = Math.max(0, Math.min(255, baseB + n));
      g.fillStyle = alpha < 1 ? `rgba(${r},${gv},${b},${alpha})` : `rgb(${r},${gv},${b})`;
      g.fillRect(x, y, 1, 1);
    }
  }
}

/** Cria uma textura pixelada desenhada em canvas. */
export function tex(
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
  rx = 1,
  ry = 1,
) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestMipmapLinearFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  return t;
}

/** Degradê do céu em faixas cinematográficas, uma textura por capítulo. */
export function skyTex(a: string, b: string, c: string, d?: string) {
  return tex(1, 128, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, a);
    gr.addColorStop(0.35, b);
    gr.addColorStop(0.68, c);
    gr.addColorStop(0.85, d || c);
    gr.addColorStop(1, d || c);
    g.fillStyle = gr;
    g.fillRect(0, 0, 1, 128);
  });
}

