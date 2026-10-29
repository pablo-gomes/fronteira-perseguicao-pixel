// @ts-nocheck -- imported game was written for non-strict TypeScript; kept as-is.
import React, { useEffect, useRef, useState } from 'react';
import { cfg, saveCfg } from '../game/config';
import { actions } from '../game/flow';
import { G } from '../game/state';
import { beep } from '../audio/sound';
import { cameraModal } from '../game/cameraModalState';
import {
  setTestCanvas,
  subscribeSensorState,
  startBodySensor,
  recalibrate,
  calibrateCenterNow,
  getMirrorCamera,
  setMirrorCamera,
  getShowGrid,
  setShowGrid,
  SensorLiveState,
} from '../input/body-sensor';

export const CameraTestModal: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [sensorState, setSensorState] = useState<SensorLiveState>({
    isRunning: false,
    isInitializing: false,
    hasError: false,
    errorMessage: '',
    lane: 0,
    vertical: 'NORMAL',
    isPumpingArms: false,
    confidence: null,
    isCalibrating: false,
    isQuickCalibrating: false,
    calibrationStepIndex: 0,
    calibrationTotalSteps: 5,
    calibrationPrompt: '',
    calibrationCountdown: 0,
    hasBody: false,
    mirrorCamera: getMirrorCamera(),
    showGrid: getShowGrid(),
    calibOffsetX: 0,
    calibOffsetY: 0,
  });

  const [calibSuccessNotice, setCalibSuccessNotice] = useState(false);

  useEffect(() => {
    // 1. Conecta o canvas de alta visibilidade ao pipeline de renderização
    if (canvasRef.current) {
      setTestCanvas(canvasRef.current);
    }

    // 2. Se o sensor ainda não estiver ligado, ativa automaticamente
    if (!cfg.bodyTrack) {
      cfg.bodyTrack = true;
      saveCfg();
    }
    startBodySensor();

    // 3. Inscreve ouvinte de estado em tempo real
    const unsubscribe = subscribeSensorState((state) => {
      setSensorState(state);
    });

    return () => {
      setTestCanvas(null);
      unsubscribe();
    };
  }, []);

  const handleStartGame = () => {
    beep(520, 0.08);
    cameraModal.close();
    if (G.state === 'PAUSED') {
      actions.resume();
    } else {
      actions.start();
    }
  };

  const handleClose = () => {
    beep(380, 0.05);
    cameraModal.close();
  };

  const handleQuickCalibrate = async () => {
    beep(440, 0.08);
    setCalibSuccessNotice(false);
    const success = await calibrateCenterNow(3);
    if (success) {
      beep(660, 0.15);
      setCalibSuccessNotice(true);
      setTimeout(() => setCalibSuccessNotice(false), 4000);
    }
  };

  const handleFullCalibrate = () => {
    beep(440, 0.08);
    setCalibSuccessNotice(false);
    recalibrate();
  };

  const handleToggleMirror = () => {
    beep(400, 0.04);
    setMirrorCamera(!sensorState.mirrorCamera);
  };

  const handleToggleGrid = () => {
    beep(400, 0.04);
    setShowGrid(!sensorState.showGrid);
  };

  const isCalibratingAny = sensorState.isCalibrating || sensorState.isQuickCalibrating;

  return (
    <div className="camera-test-backdrop" role="dialog" aria-modal="true" aria-labelledby="cam-test-title">
      <div className="camera-test-panel">
        <div className="flag" />

        <header className="cam-header">
          <div>
            <span className="eyebrow">VERIFICAÇÃO DE CONTROLE</span>
            <h2 id="cam-test-title" style={{ margin: '2px 0 6px', fontSize: '24px' }}>
              Testar e Calibrar Câmera
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#eeddbb' }}>
              Enquadre seu corpo, teste as 3 colunas e calibre a posição central para que o personagem não desvie.
            </p>
          </div>
          <button
            type="button"
            className="cam-close-x"
            onClick={handleClose}
            aria-label="Fechar verificação de câmera"
          >
            ✕
          </button>
        </header>

        <div className="cam-main-grid">
          {/* LADO ESQUERDO: VIEWPORT DE VÍDEO E GRADE */}
          <div className="cam-video-col">
            <div className="cam-viewport-box">
              <canvas
                ref={canvasRef}
                width={480}
                height={360}
                className="cam-viewport-canvas"
              />

              {/* Status sobreposto caso esteja inicializando ou com erro */}
              {sensorState.isInitializing && (
                <div className="cam-status-overlay">
                  <div className="cam-spinner" />
                  <p>Iniciando câmera e modelo de visão neural...</p>
                  <small>Por favor, autorize o acesso à câmera no navegador.</small>
                </div>
              )}

              {sensorState.hasError && (
                <div className="cam-status-overlay error">
                  <span style={{ fontSize: '30px' }}>⚠️</span>
                  <p style={{ fontWeight: 700, color: '#ff6666' }}>Câmera não autorizada ou indisponível</p>
                  <small>Verifique as permissões de vídeo do seu navegador e recarregue a página.</small>
                </div>
              )}

              {/* Overlay de contagem de calibração */}
              {isCalibratingAny && (
                <div className="cam-calib-banner">
                  <div className="calib-banner-title">🎯 CALIBRANDO POSIÇÃO</div>
                  <div className="calib-banner-prompt">{sensorState.calibrationPrompt}</div>
                  <div className="calib-banner-num">{sensorState.calibrationCountdown || '✓'}</div>
                  <small>Fique parado e relaxe os braços</small>
                </div>
              )}

              {/* Notificação de sucesso de calibração */}
              {calibSuccessNotice && !isCalibratingAny && (
                <div className="cam-success-badge">
                  ✅ Centro calibrado com perfeição!
                </div>
              )}
            </div>

            {/* Informações técnicas e status de conexão */}
            <div className="cam-telemetry-bar">
              <div className="cam-status-pill">
                <span className={`pip-dot ${sensorState.hasBody ? 'active' : 'detecting'}`} />
                <span>
                  {sensorState.hasBody
                    ? 'Silhueta detectada (Pronto)'
                    : 'Aguardando jogador no enquadramento...'}
                </span>
              </div>
              <div className="cam-telemetry-item">
                <span>Offset X:</span>
                <b>{(sensorState.calibOffsetX > 0 ? '+' : '') + sensorState.calibOffsetX.toFixed(3)}</b>
              </div>
              <div className="cam-telemetry-item">
                <span>Confiança:</span>
                <b>
                  {sensorState.confidence !== null
                    ? `${Math.round(sensorState.confidence * 100)}%`
                    : '—'}
                </b>
              </div>
            </div>
          </div>

          {/* LADO DIREITO: TESTES DE GESTOS, CALIBRAÇÃO E AJUSTES */}
          <div className="cam-controls-col">
            {/* PAINEL DE TESTE INTERATIVO DE MOVIMENTO */}
            <div className="cam-test-card">
              <div className="cam-card-title">
                <span>1. Teste de Colunas (Esquerda / Meio / Direita)</span>
                <small>Mova o corpo para os lados</small>
              </div>

              <div className="cam-lane-chips">
                <div className={`cam-chip ${sensorState.lane === -1 ? 'active left' : ''}`}>
                  <span className="cam-chip-icon">⬅</span>
                  <span className="cam-chip-text">ESQUERDA</span>
                  {sensorState.lane === -1 && <span className="cam-chip-badge">ATIVO</span>}
                </div>

                <div className={`cam-chip ${sensorState.lane === 0 ? 'active center' : ''}`}>
                  <span className="cam-chip-icon">⏺</span>
                  <span className="cam-chip-text">CENTRO</span>
                  {sensorState.lane === 0 && <span className="cam-chip-badge">ATIVO</span>}
                </div>

                <div className={`cam-chip ${sensorState.lane === 1 ? 'active right' : ''}`}>
                  <span className="cam-chip-icon">➡</span>
                  <span className="cam-chip-text">DIREITA</span>
                  {sensorState.lane === 1 && <span className="cam-chip-badge">ATIVO</span>}
                </div>
              </div>
            </div>

            <div className="cam-test-card">
              <div className="cam-card-title">
                <span>2. Teste de Ações Verticais e Corrida</span>
                <small>Pule, agache e mova os braços</small>
              </div>

              <div className="cam-actions-chips">
                <div className={`cam-chip ${sensorState.vertical === 'JUMP' ? 'active jump' : ''}`}>
                  <span className="cam-chip-icon">⬆</span>
                  <span className="cam-chip-text">PULO</span>
                  {sensorState.vertical === 'JUMP' && <span className="cam-chip-badge">DETECTADO</span>}
                </div>

                <div className={`cam-chip ${sensorState.vertical === 'CROUCH' ? 'active crouch' : ''}`}>
                  <span className="cam-chip-icon">⬇</span>
                  <span className="cam-chip-text">AGACHAMENTO</span>
                  {sensorState.vertical === 'CROUCH' && <span className="cam-chip-badge">DETECTADO</span>}
                </div>

                <div className={`cam-chip ${sensorState.isPumpingArms ? 'active sprint' : ''}`}>
                  <span className="cam-chip-icon">🏃</span>
                  <span className="cam-chip-text">CORRIDA</span>
                  {sensorState.isPumpingArms && <span className="cam-chip-badge">BOMBEANDO</span>}
                </div>
              </div>
            </div>

            {/* BOTÕES DE CALIBRAÇÃO */}
            <div className="cam-calib-card">
              <div className="cam-card-title">
                <span>3. Calibração da Posição do Jogador</span>
              </div>
              <p className="cam-calib-tip">
                Fique no centro da câmera em sua posição natural e clique abaixo. Isso ajusta o zero para que o personagem não fique na direita ou esquerda por engano.
              </p>

              <div className="cam-calib-buttons">
                <button
                  type="button"
                  className="cam-btn-calib-quick"
                  onClick={handleQuickCalibrate}
                  disabled={isCalibratingAny}
                >
                  🎯 Calibrar Posição Central (3s)
                </button>
                <button
                  type="button"
                  className="ghost compact"
                  onClick={handleFullCalibrate}
                  disabled={isCalibratingAny}
                  title="Calibração completa em 5 etapas para usuários avançados"
                >
                  📋 Calibração Guiada (5 passos)
                </button>
              </div>
            </div>

            {/* OPÇÕES DA CÂMERA */}
            <div className="cam-options-row">
              <label className="cam-checkbox-label">
                <input
                  type="checkbox"
                  checked={sensorState.mirrorCamera}
                  onChange={handleToggleMirror}
                />
                Espelhar câmera (efeito espelho)
              </label>

              <label className="cam-checkbox-label">
                <input
                  type="checkbox"
                  checked={sensorState.showGrid}
                  onChange={handleToggleGrid}
                />
                Exibir grade de 3 faixas
              </label>
            </div>
          </div>
        </div>

        {/* RODAPÉ DO MODAL: AÇÕES PRINCIPAIS */}
        <footer className="cam-footer">
          <div className="cam-footer-info">
            <span>Dica: Mantenha iluminação frontal e fique a cerca de 1,5m a 2m da câmera.</span>
          </div>

          <div className="cam-footer-actions">
            <button
              type="button"
              className="ghost"
              onClick={handleClose}
            >
              Voltar ao Menu
            </button>

            <button
              type="button"
              className="primary-action cam-start-btn"
              onClick={handleStartGame}
            >
              {G.state === 'PAUSED' ? 'Continuar Partida' : '🚀 Iniciar Perseguição!'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
