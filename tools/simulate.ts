/**
 * Simula disputas 2x2 entre bots para validar o motor e calibrar a IA.
 *   npm run simulate -- 500                 (estatísticas de 500 disputas)
 *   npm run simulate -- 1 --verbose         (narra uma disputa jogada a jogada)
 *   npm run simulate -- 500 --vs=easy:medium
 */
import { simulateMatch, type Difficulty } from '@truco-party/ai';
import { cardToString, type Action, type GameState } from '@truco-party/engine';

const args = process.argv.slice(2);
const matches = Number(args.find((a) => /^\d+$/.test(a)) ?? 200);
const verbose = args.includes('--verbose');
const [d0, d1] = (args.find((a) => a.startsWith('--vs='))?.slice(5) ?? 'easy:easy').split(':') as Difficulty[];

const SEAT_NAMES = ['Você', 'Direita', 'Parceiro', 'Esquerda'];
const BET_NAMES: Record<number, string> = { 3: 'TRUCO', 6: 'SEIS', 9: 'NOVE', 12: 'DOZE' };

function narrate(action: Action, before: GameState, after: GameState) {
  const who = 'seat' in action ? SEAT_NAMES[action.seat] : '';
  switch (action.type) {
    case 'PLAY_CARD': {
      const card = before.hand.cards[action.seat][action.cardIndex];
      console.log(`  ${who.padEnd(9)} joga ${action.covered ? '[coberta]' : cardToString(card)}`);
      const round = after.hand.rounds[before.hand.rounds.length - 1];
      if (round?.outcome !== undefined) {
        console.log(`  → rodada: ${round.outcome === 'tie' ? 'empate' : `dupla ${round.outcome}`}`);
      }
      break;
    }
    case 'RAISE':
      console.log(`  ${who.padEnd(9)} pede ${BET_NAMES[after.hand.pendingBet?.value ?? 0]}!`);
      break;
    default:
      if (!action.type.startsWith('NEXT')) console.log(`  ${who.padEnd(9)} ${action.type}`);
  }
  if (after.hand.result && !before.hand.result) {
    const r = after.hand.result;
    console.log(`  ✔ mão para ${r.winner === null ? 'ninguém' : `dupla ${r.winner}`} (+${r.points}, ${r.reason}) — placar ${after.score.join(' x ')}`);
  }
  if (action.type === 'NEXT_HAND' || action.type === 'NEXT_GAME') {
    const h = after.hand;
    console.log(`\nMão ${h.number} · vira ${h.vira ? cardToString(h.vira) : '-'} · dá: ${SEAT_NAMES[after.dealer]} · ${h.special}`);
  }
}

const totals = { wins: [0, 0], hands: 0, raises: 0, runs: 0, elevenHands: 0, ironHands: 0 };
const started = performance.now();
for (let seed = 1; seed <= matches; seed++) {
  if (verbose) console.log(`\n=== Disputa seed ${seed} (dupla 0: ${d0} · dupla 1: ${d1}) ===`);
  const stats = simulateMatch({
    seed,
    seats: [
      { difficulty: d0, personality: 'cautious' },
      { difficulty: d1, personality: 'bluffer' },
      { difficulty: d0, personality: 'aggressive' },
      { difficulty: d1, personality: 'aggressive' },
    ],
    onAction: verbose ? narrate : undefined,
  });
  totals.wins[stats.winner]++;
  totals.hands += stats.hands;
  totals.raises += stats.raises;
  totals.runs += stats.runs;
  totals.elevenHands += stats.elevenHands;
  totals.ironHands += stats.ironHands;
  if (verbose) console.log(`\nVencedor: dupla ${stats.winner} (${stats.finalScore.join(' x ')})`);
}

const ms = performance.now() - started;
console.log(`\n${matches} disputas em ${ms.toFixed(0)} ms (dupla 0: ${d0}, dupla 1: ${d1})`);
console.log(`Vitórias: dupla 0 = ${totals.wins[0]} · dupla 1 = ${totals.wins[1]}`);
console.log(`Mãos por disputa: ${(totals.hands / matches).toFixed(1)}`);
console.log(`Pedidos de truco/aumento por mão: ${(totals.raises / totals.hands).toFixed(2)} · corridas por mão: ${(totals.runs / totals.hands).toFixed(2)}`);
console.log(`Mãos de onze: ${totals.elevenHands} · mãos de ferro: ${totals.ironHands}`);
