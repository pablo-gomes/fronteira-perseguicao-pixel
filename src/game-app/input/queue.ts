/** Comandos abstratos. Teclado, toque e sensor corporal enviam estes mesmos comandos. */
export type Command =
  | { type: 'LEAN'; dir: number }
  | { type: 'SET_LANE'; lane: number }
  | { type: 'JUMP' };

export const Input = {
  q: [] as Command[],
  run: false,      // correr (segurando)
  crouch: false,   // agachar (segurando)
  ru: 0,           // tempo limite de corrida por toque
  cu: 0,           // tempo limite de agachar por toque
  push(c: Command) {
    this.q.push(c);
  },
  drain() {
    const a = this.q;
    this.q = [];
    return a;
  },
};
