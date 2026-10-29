import type { Command } from './queue';

/**
 * Contrato de qualquer fonte de comandos. Teclado e toque já seguem este modelo
 * de forma implícita; um sensor corporal deve implementar esta interface.
 */
export interface CommandSource {
  name: string;
  start(emit?: (c: Command) => void): void;
  stop(): void;
}
