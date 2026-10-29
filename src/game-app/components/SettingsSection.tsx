import React from 'react';
import { cfg } from '../game/config';
import { actions } from '../game/flow';
import { beep } from '../audio/sound';

import { cameraModal } from '../game/cameraModalState';

export const SettingsSection: React.FC = () => {
  const handleClick = (actionKey: string, val?: string) => {
    beep(440, 0.05);
    const fn = actions[actionKey];
    if (fn) fn(val);
  };

  const pixelOptions: [number, string][] = [
    [1, 'Ultra'],
    [2, 'Fino'],
    [3, 'Médio'],
    [5, 'Retrô'],
  ];

  return (
    <section className="menu-section settings" aria-labelledby="settings-title">
      <div className="section-heading">
        <span id="settings-title">Ajustes</span>
        <small>personalize a partida</small>
      </div>

      <div className="setting-row">
        <span>Experiência</span>
        <div className="button-group">
          <button
            type="button"
            className="ghost compact"
            data-a="comfort"
            aria-pressed={cfg.comfort}
            onClick={() => handleClick('comfort')}
          >
            Câmera confortável
          </button>
          <button
            type="button"
            className="ghost compact"
            data-a="sound"
            aria-pressed={cfg.sound}
            onClick={() => handleClick('sound')}
          >
            Som
          </button>
        </div>
      </div>

      <div className="setting-row">
        <span>Qualidade</span>
        <div className="button-group pixel-options">
          {pixelOptions.map(([v, n]) => (
            <button
              key={v}
              type="button"
              className="ghost compact"
              data-a="pix"
              data-v={v}
              aria-pressed={cfg.pix === v}
              onClick={() => handleClick('pix', String(v))}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="setting-row sensor-row">
        <span>Sensor de câmera</span>
        <div className="button-group">
          <button
            type="button"
            className="ghost compact"
            data-a="bodyTrack"
            aria-pressed={cfg.bodyTrack}
            onClick={() => handleClick('bodyTrack')}
          >
            {cfg.bodyTrack ? 'Ligado' : 'Desligado'}
          </button>
          <button
            type="button"
            className="ghost compact"
            data-a="calibrate"
            onClick={() => {
              beep(440, 0.05);
              cameraModal.open();
            }}
          >
            🎯 Testar / Calibrar
          </button>
        </div>
      </div>
    </section>
  );
};
