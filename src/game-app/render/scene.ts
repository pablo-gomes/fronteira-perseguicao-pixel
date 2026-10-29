import * as THREE from 'three';
import { cfg } from '../game/config';

export let R: THREE.WebGLRenderer | null = null;

export function initRenderer(canvas: HTMLCanvasElement) {
  if (R) return R;
  try {
    R = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    R.shadowMap.enabled = true;
    R.shadowMap.type = THREE.PCFShadowMap;
    R.outputEncoding = THREE.sRGBEncoding;
    R.toneMapping = THREE.ACESFilmicToneMapping;
    R.toneMappingExposure = 1.05;
    resize();
    return R;
  } catch (e) {
    if (typeof document !== 'undefined') {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<div class="pn" style="margin:5vw;position:fixed">WebGL indisponível. Use um navegador desktop atualizado com aceleração de hardware.</div>',
      );
    }
    throw e;
  }
}

if (typeof document !== 'undefined') {
  const existing = document.getElementById('c') as HTMLCanvasElement | null;
  if (existing) {
    initRenderer(existing);
  }
}

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeeb66f);
scene.fog = new THREE.Fog(0xeeb66f, 22, 115);

export const cam = new THREE.PerspectiveCamera(72, 1, 0.1, 200);
scene.add(cam);

/** Tamanho do canvas baseado no pixel escolhido: menor pixel = mais detalhe. */
export function resize() {
  if (!R) return;
  // Com o sensor de câmera ligado, reduz a carga de renderização para liberar a detecção
  const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, cfg.bodyTrack ? 1 : 1.5);
  const pixScale = Math.max(cfg.bodyTrack ? 2 : 1, cfg.pix);
  R.shadowMap.enabled = !cfg.bodyTrack;
  const w = Math.max(160, Math.floor((innerWidth * dpr) / pixScale));
  const h = Math.max(90, Math.floor((innerHeight * dpr) / pixScale));
  R.setSize(w, h, false);
  cam.aspect = innerWidth / innerHeight;
  cam.updateProjectionMatrix();
}
if (typeof window !== 'undefined') {
  addEventListener('resize', resize);
}

export const hemi = new THREE.HemisphereLight(0xfff5e4, 0x4e465a, 0.75);
scene.add(hemi);

export const dl = new THREE.DirectionalLight(0xffecd0, 1.15);
dl.position.set(-14, 20, -24);
dl.castShadow = true;
dl.shadow.mapSize.set(1024, 1024);
Object.assign(dl.shadow.camera, { left: -14, right: 14, top: 18, bottom: -18, near: 1, far: 55 });
dl.shadow.camera.updateProjectionMatrix();
dl.shadow.bias = -0.0005;
dl.shadow.normalBias = 0.02;
scene.add(dl, dl.target);

/** Sol cinematográfico no horizonte com halo coronal atmosférico. */
export const sun = new THREE.Mesh(
  new THREE.CircleGeometry(11, 20),
  new THREE.MeshBasicMaterial({ color: 0xffe08a, fog: false }),
);
sun.position.set(-25, 24, -170);

export const sunCorona = new THREE.Mesh(
  new THREE.RingGeometry(11, 22, 20),
  new THREE.MeshBasicMaterial({
    color: 0xffcb52,
    transparent: true,
    opacity: 0.38,
    fog: false,
    side: THREE.DoubleSide,
  }),
);
sun.add(sunCorona);
cam.add(sun);

