import { G } from './state';

export type Part = [string, number];

/** Linhas da pontuação mostradas na tela de resultado. */
export function parts(): Part[] {
  const S = G.stats;
  return [
    ['Distância', Math.min(G.LEN, Math.max(0, Math.floor(-G.pz))) * 2],
    ['Obstáculos superados (' + S.cleared + ')', S.cleared * 100],
    ['Precisão', Math.round((500 * S.cleared) / Math.max(1, S.cleared + S.hits))],
    ['Melhor sequência limpa (' + S.best + ')', Math.min(S.best, 12) * 25],
    ['Moedas coletadas (' + S.clues + ')', S.clues * 35],
    ['Colisões (' + S.hits + ')', -Math.min(S.hits * 60, 600)],
  ];
}

export const total = () => Math.max(0, parts().reduce((a, p) => a + p[1], 0));
