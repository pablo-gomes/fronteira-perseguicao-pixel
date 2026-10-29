import React from 'react';
import { G } from '../game/state';
import { CH } from '../world/chapters';
import { actions } from '../game/flow';
import { beep } from '../audio/sound';
import { SettingsSection } from './SettingsSection';
import { cameraModal } from '../game/cameraModalState';

export const MainMenu: React.FC = () => {
  const handleClick = (actionKey: string, val?: string) => {
    beep(440, 0.05);
    const fn = actions[actionKey];
    if (fn) fn(val);
  };

  return (
    <main className="pn menu-panel menu-clean">
      <header className="menu-hero">
        <div className="flag" />
        <p className="eyebrow">Operação Fronteira</p>
        <h1>Perseguição Pixel</h1>
        <p className="menu-sub">Alcance o suspeito antes que ele fuja.</p>
      </header>

      <div className="menu-start">
        <button type="button" className="primary-action" onClick={() => handleClick('start')}>
          ▶ Jogar
        </button>
        <button
          type="button"
          className="ghost cam-test-trigger-btn"
          onClick={() => {
            beep(440, 0.05);
            cameraModal.open();
          }}
        >
          Calibrar câmera
        </button>
      </div>

      <section className="menu-section" aria-labelledby="chapters-title">
        <div className="section-heading">
          <span id="chapters-title">Capítulos</span>
        </div>
        <div className="chapter-grid">
          {CH.map((c, i) => {
            const isLocked = i > G.unl;
            return (
              <button
                key={c.n}
                type="button"
                className="chapter-button"
                disabled={isLocked}
                aria-pressed={G.CI === i}
                onClick={() => handleClick('ch', String(i))}
              >
                <b>{i + 1}</b>
                <span>{c.pl}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="menu-section" aria-labelledby="help-title">
        <div className="section-heading">
          <span id="help-title">Controles</span>
        </div>
        <div className="controls-row">
          <span><kbd>W</kbd> correr</span>
          <span><kbd>A D</kbd> faixa</span>
          <span><kbd>Espaço</kbd> pular</span>
          <span><kbd>S</kbd> agachar</span>
          <span><kbd>Esc</kbd> pausar</span>
        </div>
      </section>

      <SettingsSection />
    </main>
  );
};
