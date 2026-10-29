import React from 'react';
import { actions } from '../game/flow';
import { beep } from '../audio/sound';
import { SettingsSection } from './SettingsSection';

import { cameraModal } from '../game/cameraModalState';

export const PauseMenu: React.FC = () => {
  const handleClick = (actionKey: string) => {
    beep(440, 0.05);
    const fn = actions[actionKey];
    if (fn) fn();
  };

  return (
    <div className="pn">
      <h2>Pausado</h2>
      <SettingsSection />
      <div className="row" style={{ marginTop: '8px', marginBottom: '8px' }}>
        <button
          type="button"
          className="ghost"
          style={{ width: '100%', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)', fontSize: '13px', padding: '8px 12px' }}
          onClick={() => {
            beep(440, 0.05);
            cameraModal.open();
          }}
        >
          📹 Testar e Calibrar Câmera
        </button>
      </div>
      <div className="row">
        <button type="button" data-a="resume" onClick={() => handleClick('resume')}>
          Continuar
        </button>
        <button type="button" className="ghost" data-a="start" onClick={() => handleClick('start')}>
          Recomeçar
        </button>
        <button type="button" className="ghost" data-a="menu" onClick={() => handleClick('menu')}>
          Menu
        </button>
      </div>
    </div>
  );
};
