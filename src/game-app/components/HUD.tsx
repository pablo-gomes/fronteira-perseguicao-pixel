import React from 'react';
import { togglePause } from '../game/flow';

interface HUDProps {
  hidden: boolean;
}

export const HUD: React.FC<HUDProps> = ({ hidden }) => {
  return (
    <div id="hud" hidden={hidden}>
      <div className="tl">
        <div id="obj">Alcance o suspeito</div>
        <div id="cpl" style={{ fontSize: '15px' }} />
      </div>

      <div className="tc">
        <span id="gap">26 m</span>
        <div style={{ fontSize: '15px' }}>até o suspeito</div>
      </div>

      <div className="tr">
        <div id="prog">0%</div>
        <div className="bar">
          <i id="pgb" style={{ width: '0%' }} />
        </div>
        <button
          id="pb"
          type="button"
          className="ghost"
          aria-label="Pausar"
          onClick={() => togglePause()}
        >
          Pausa
        </button>
      </div>

      <div id="warn" role="status" />
      <div id="toast" />

      <div className="bl">
        <div className="stat-box">
          <div className="stat-header">
            <span>Vida</span>
            <span id="hp-val">100%</span>
          </div>
          <div className="bar bar-hp">
            <i id="hp-bar" style={{ width: '100%' }} />
          </div>
        </div>

        <div className="stat-box" style={{ marginTop: '6px' }}>
          <div className="stat-header">
            <span>Fôlego</span>
            <span id="stam-val">100%</span>
          </div>
          <div className="bar bar-stam">
            <i id="stam" style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      <div className="bc">Entrada: teclado</div>
      <div className="br" id="sc" />
    </div>
  );
};
