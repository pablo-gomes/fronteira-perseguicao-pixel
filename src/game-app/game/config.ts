import { LS } from './storage';

export interface Config {
  comfort: boolean; // câmera confortável (menos balanço)
  pix: number;      // tamanho do pixel: menor = mais detalhe (1 = ultra nítido HD)
  sound: boolean;
  bodyTrack: boolean; // sensor corporal por câmera
}

export const cfg: Config = Object.assign(
  { comfort: false, pix: 2, sound: true, bodyTrack: false },
  LS.get<Partial<Config>>('fpp-cfg2', {}),
);

export const saveCfg = () => LS.set('fpp-cfg2', cfg);
