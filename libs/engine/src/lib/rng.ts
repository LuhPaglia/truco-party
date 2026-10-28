/**
 * RNG determinístico (mulberry32). O estado é um inteiro de 32 bits guardado no GameState,
 * o que torna qualquer partida reproduzível a partir da seed (útil para bugs e replays).
 */
export function nextRandom(state: number): [value: number, nextState: number] {
  const nextState = (state + 0x6d2b79f5) | 0;
  let t = nextState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, nextState];
}

/** Fisher–Yates com o RNG acima. Não altera o array recebido. */
export function shuffle<T>(items: readonly T[], state: number): [shuffled: T[], nextState: number] {
  const result = [...items];
  let current = state;
  for (let i = result.length - 1; i > 0; i--) {
    const [value, next] = nextRandom(current);
    current = next;
    const j = Math.floor(value * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return [result, current];
}
