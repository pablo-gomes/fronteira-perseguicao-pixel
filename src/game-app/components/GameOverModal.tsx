import React from 'react';
import { G } from '../game/state';
import { GAPMAX } from '../game/constants';
import { actions } from '../game/flow';
import { beep } from '../audio/sound';

export const GameOverModal: React.FC = () => {
  const isHealth = G.failReason === 'health';
  const title = isHealth ? 'Você foi derrubado' : 'O suspeito escapou';
  const desc = isHealth
    ? 'Sua vida foi esgotada pelas colisões ou pelo esforço físico sem fôlego. Gerencie sua energia e desvie com atenção!'
    : `Ele abriu mais de ${GAPMAX} m de vantagem. Segure W para recuperar terreno e use os trechos livres para respirar.`;

  const handleClick = (actionKey: string) => {
    beep(440, 0.05);
    const fn = actions[actionKey];
    if (fn) fn();
  };

  return (
    <div className="pn">
      <h2>{title}</h2>
      <p>{desc}</p>
      <div className="row">
        {G.cp && (
          <button type="button" data-a="cp" onClick={() => handleClick('cp')}>
            Voltar ao checkpoint
          </button>
        )}
        <button
          type="button"
          className={G.cp ? 'ghost' : ''}
          data-a="start"
          onClick={() => handleClick('start')}
        >
          Recomeçar
        </button>
        <button
          type="button"
          className="ghost"
          data-a="menu"
          onClick={() => handleClick('menu')}
        >
          Menu
        </button>
      </div>
    </div>
  );
};
