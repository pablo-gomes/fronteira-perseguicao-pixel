import React, { useEffect, useRef, useState } from 'react';
import './ui/style.css';
import { cfg } from './game/config';
import { LS } from './game/storage';
import { BodyTrackingProvider } from './input/body-sensor';
import { G, GameStateName } from './game/state';
import { togglePause, subscribeFlow, notifyFlow } from './game/flow';
import { reset } from './game/reset';
import { update } from './game/update';
import { initKeyboard } from './input/keyboard';
import { initTouch } from './input/touch';
import { Input } from './input/queue';
import { R, scene, cam, initRenderer, resize } from './render/scene';
import { camUpdate } from './render/camera';
import { animateScene } from './render/effects';
import { CH, loadChapter } from './world/chapters';
import { initSegments } from './world/segments';
import { setWarn } from './ui/hud';
import { HUD } from './components/HUD';
import { MainMenu } from './components/MainMenu';
import { PauseMenu } from './components/PauseMenu';
import { GameOverModal } from './components/GameOverModal';
import { LevelCompleteModal } from './components/LevelCompleteModal';
import { CameraTestModal } from './components/CameraTestModal';
import { cameraModal } from './game/cameraModalState';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<GameStateName>(G.state);
  const [isCameraTestOpen, setIsCameraTestOpen] = useState<boolean>(cameraModal.isOpen());

  useEffect(() => {
    // Inscrever ouvinte do modal de teste de câmera
    const unsubCameraModal = cameraModal.subscribe((open) => {
      setIsCameraTestOpen(open);
    });

    // Inscrever ouvinte de fluxo do jogo
    const unsubscribe = subscribeFlow((state) => {
      setGameState(state);
    });

    // Inicializar o renderizador Three.js no canvas montado
    if (canvasRef.current) {
      initRenderer(canvasRef.current);
    }

    const isPlaying = () => G.state === 'PLAYING';

    const cleanupKeyboard = initKeyboard({ pause: () => togglePause(), isPlaying });
    const cleanupTouch = initTouch(isPlaying);

    if (cfg.bodyTrack) {
      BodyTrackingProvider.start();
    }

    const handleBlur = () => {
      Input.run = false;
      Input.crouch = false;
      if (G.state === 'PLAYING') togglePause();
    };
    window.addEventListener('blur', handleBlur);

    const handleResize = () => {
      resize();
    };
    window.addEventListener('resize', handleResize);

    initSegments();
    G.unl = Math.max(4, G.unl);
    LS.set('fpp-unl', G.unl);
    const savedCi = LS.get<number>('fpp-last-ci', 0);
    G.CI = savedCi >= 0 && savedCi < CH.length ? savedCi : 0;
    loadChapter(G.CI);
    reset(false);

    // Loop de renderização principal
    let animId = 0;
    let last = performance.now();

    const frame = (now: number) => {
      animId = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      G.tm += dt;

      if (G.state === 'READY') {
        G.readyT -= dt;
        const n = Math.ceil(G.readyT - 0.4);
        setWarn(n > 0 ? n : 'Já!');
        if (G.readyT <= 0) {
          G.state = 'PLAYING';
          setWarn('');
          notifyFlow('PLAYING');
        }
      }

      if (G.state === 'PLAYING') {
        update(dt);
      }

      if (G.state !== 'PAUSED') {
        animateScene(dt);
      }

      camUpdate(dt);
      if (R) {
        R.render(scene, cam);
      }
    };

    animId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('resize', handleResize);
      cleanupKeyboard();
      cleanupTouch();
      unsubscribe();
      unsubCameraModal();
    };
  }, []);

  const showOverlay =
    gameState === 'MAIN_MENU' ||
    gameState === 'PAUSED' ||
    gameState === 'GAME_OVER' ||
    gameState === 'LEVEL_COMPLETE';

  return (
    <>
      <canvas id="c" ref={canvasRef} />
      <div id="fx" />

      <HUD hidden={gameState === 'MAIN_MENU'} />

      {showOverlay && (
        <div id="ov">
          {gameState === 'MAIN_MENU' && <MainMenu />}
          {gameState === 'PAUSED' && <PauseMenu />}
          {gameState === 'GAME_OVER' && <GameOverModal />}
          {gameState === 'LEVEL_COMPLETE' && <LevelCompleteModal />}
        </div>
      )}

      {isCameraTestOpen && <CameraTestModal />}
    </>
  );
};

export default App;
