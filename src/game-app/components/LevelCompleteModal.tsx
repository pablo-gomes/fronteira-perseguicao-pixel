import React from 'react';
import { G } from '../game/state';
import { CH } from '../world/chapters';
import { actions } from '../game/flow';
import { beep } from '../audio/sound';

export const LevelCompleteModal: React.FC = () => {
  const d = G.completeData;
  if (!d) return null;

  const handleClick = (actionKey: string) => {
    beep(440, 0.05);
    const fn = actions[actionKey];
    if (fn) fn();
  };

  const isLastChapter = G.CI === CH.length - 1;

  return (
    <div className="pn">
      <div className="flag" />
      <h2>{d.caught ? 'Suspeito alcançado' : 'Suspeito rastreado'}</h2>
      <p>
        {d.caught
          ? 'Você fechou a distância antes da meta.'
          : 'Ele sumiu de vista, mas você completou a rota.'}
      </p>

      <table>
        <tbody>
          {d.rows.map(([n, v]) => (
            <tr key={n}>
              <td>{n}</td>
              <td>{v > 0 ? '+' : ''}{v}</td>
            </tr>
          ))}
          <tr className="t">
            <td>Total</td>
            <td>{d.tot}</td>
          </tr>
        </tbody>
      </table>

      <p style={{ marginTop: '10px' }}>
        {G.TH?.pl}
        {isLastChapter ? ' (campanha concluída)' : ''}. Tempo: {Math.round(d.runT)} s. Medalha:{' '}
        {d.medal}.
        {d.nb ? ' Novo melhor resultado!' : ` Melhor: ${d.best}.`}
      </p>

      <div className="row">
        {G.CI < CH.length - 1 && (
          <button type="button" data-a="next" onClick={() => handleClick('next')}>
            Próximo capítulo
          </button>
        )}
        <button
          type="button"
          className="ghost"
          data-a="start"
          onClick={() => handleClick('start')}
        >
          Jogar de novo
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
