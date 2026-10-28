import { createGame, createGameWithDeal, getPlayerView, isSameAction, legalActions, parseCard } from '@truco-party/engine';
import { createBot } from './bot';
import { chooseSignal } from './signals';
import { simulateMatch } from './simulation';
import type { Difficulty } from './types';

const table = (a: Difficulty, b: Difficulty) =>
  [
    { difficulty: a, personality: 'cautious' },
    { difficulty: b, personality: 'bluffer' },
    { difficulty: a, personality: 'aggressive' },
    { difficulty: b, personality: 'cautious' },
  ] as const;

describe('bots do Paulista', () => {
  it('sempre escolhem uma ação legal', () => {
    const state = createGame({ seed: 3 });
    const bot = createBot('paulista', { difficulty: 'easy', personality: 'bluffer', seed: 1 });
    const action = bot.decide(getPlayerView(state, 0));
    expect(legalActions(state, 0).some((a) => isSameAction(a, action))).toBe(true);
  });

  it('jogam 200 disputas completas sem erro', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const stats = simulateMatch({ seed, seats: [...table('easy', 'medium')], options: { format: 'bestOf3' } });
      expect([0, 1]).toContain(stats.winner);
    }
  });

  it('o nível médio vence o fácil na maioria das partidas', () => {
    let mediumWins = 0;
    const total = 400;
    for (let seed = 1; seed <= total; seed++) {
      // dupla 1 (assentos 1 e 3) = médio
      if (simulateMatch({ seed, seats: [...table('easy', 'medium')] }).winner === 1) mediumWins++;
    }
    expect(mediumWins / total).toBeGreaterThan(0.5);
  });
});

describe('sinais do parceiro', () => {
  const hands = (seat2: string[]) => [
    ['5o', '6o', '7o'].map(parseCard),
    ['5e', '6e', '7e'].map(parseCard),
    seat2.map(parseCard),
    ['5p', '6p', '7p'].map(parseCard),
  ];

  it('avisa a manilha mais forte pelo naipe', () => {
    const state = createGameWithDeal({ seed: 1, vira: parseCard('3o'), cards: hands(['4c', '4e', 'Kc']) });
    expect(chooseSignal(getPlayerView(state, 2))).toBe('copas');
  });

  it('avisa o 3 quando não tem manilha, e nada com mão fraca', () => {
    const vira = parseCard('Ko');
    expect(chooseSignal(getPlayerView(createGameWithDeal({ seed: 1, vira, cards: hands(['3c', '4e', 'Kc']) }), 2))).toBe('tres');
    expect(chooseSignal(getPlayerView(createGameWithDeal({ seed: 1, vira, cards: hands(['2c', '4e', 'Kc']) }), 2))).toBeNull();
  });

  it('respeita a regra opcional desligada', () => {
    const state = createGameWithDeal({ seed: 1, vira: parseCard('3o'), options: { partnerSignals: false }, cards: hands(['4p', '4e', 'Kc']) });
    expect(chooseSignal(getPlayerView(state, 2))).toBeNull();
  });
});
