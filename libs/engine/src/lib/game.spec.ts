import { createFrenchDeck40, parseCard } from './cards';
import { applyAction, createGame, createGameWithDeal, decideHand, defaultActor, legalActions } from './game';
import { nextRandom } from './rng';
import { manilhaRankFor, paulista } from './rulesets/paulista';
import { SEATS, type GameState } from './types';
import { getPlayerView } from './view';

const cards = (...list: string[]) => list.map(parseCard);

describe('Paulista: cartas', () => {
  it('a manilha dá a volta no baralho (vira 3 → 4)', () => {
    expect(manilhaRankFor(parseCard('3o'))).toBe('4');
    expect(manilhaRankFor(parseCard('7o'))).toBe('Q');
  });

  it('as 4 manilhas são as cartas mais fortes do baralho', () => {
    const vira = parseCard('Ko');
    const sorted = [...createFrenchDeck40()].sort((a, b) => paulista.strength(b, vira) - paulista.strength(a, vira));
    expect(sorted.slice(0, 4).map((c) => c.rank + c.suit)).toEqual(['Apaus', 'Acopas', 'Aespadas', 'Aouros']);
  });
});

describe('decideHand', () => {
  it.each([
    [[0, 0], 0],
    [[0, 'tie'], 0],
    [['tie', 1], 1],
    [[0, 1, 'tie'], 0],
    [['tie', 'tie', 1], 1],
    [['tie', 'tie', 'tie'], null],
  ] as const)('%j → %s', (outcomes, winner) => {
    expect(decideHand(outcomes, 'nobodyScores', 0)?.winner).toBe(winner);
  });

  it('continua enquanto não há decisão', () => {
    expect(decideHand([0], 'nobodyScores', 0)).toBeNull();
    expect(decideHand([0, 1], 'nobodyScores', 0)).toBeNull();
    expect(decideHand(['tie', 'tie'], 'nobodyScores', 0)).toBeNull();
  });
});

describe('PlayerView', () => {
  const hands = [cards('4p', '5o', '6o'), cards('3c', '2c', 'Ac'), cards('5e', '6e', '7e'), cards('3e', '2e', 'Ae')];

  it('esconde as cartas dos outros jogadores e a seed', () => {
    const state = createGameWithDeal({ seed: 1, cards: hands, vira: parseCard('3o') });
    const view = getPlayerView(state, 0);
    expect(view.myCards).toEqual(hands[0]);
    expect(view.partnerCards).toBeNull();
    expect(view.cardsInHand).toEqual([3, 3, 3, 3]);
    expect(JSON.stringify(view)).not.toContain('rngState');
  });

  it('na mão de onze mostra as cartas do parceiro só para a dupla com 11', () => {
    const state = createGameWithDeal({ seed: 1, score: [11, 4], cards: hands, vira: parseCard('3o') });
    expect(getPlayerView(state, 0).partnerCards).toEqual(hands[2]);
    expect(getPlayerView(state, 1).partnerCards).toBeNull();
  });

  it('na mão de ferro ninguém vê a própria mão', () => {
    const state = createGameWithDeal({ seed: 1, score: [11, 11], cards: hands, vira: parseCard('3o') });
    expect(getPlayerView(state, 0).myCards).toEqual([null, null, null]);
  });
});

describe('partidas completas com jogadas aleatórias legais', () => {
  function playRandomMatch(seed: number): GameState {
    let state = createGame({ seed, options: { format: 'bestOf3' } });
    let rng = seed ^ 0x9e3779b9;
    for (let steps = 0; state.phase !== 'matchOver'; steps++) {
      expect(steps).toBeLessThan(5000);
      const seat = defaultActor(state) ?? 0;
      const actions = legalActions(state, seat);
      const [value, next] = nextRandom(rng);
      rng = next;
      const before = state.score[0] + state.score[1];
      state = applyAction(state, actions[Math.floor(value * actions.length)]);
      if (state.phase !== 'playing' && state.phase !== 'betPending' && state.phase !== 'elevenDecision') {
        // placar só cresce dentro de uma partida
        if (state.phase !== 'matchOver' && state.hand.result) {
          expect(state.score[0] + state.score[1]).toBeGreaterThanOrEqual(before);
        }
      }
      const cardsLeft = state.hand.cards.flat().length;
      const played = state.hand.rounds.flatMap((r) => r.plays).length;
      expect(cardsLeft + played).toBe(12);
    }
    return state;
  }

  it('sempre termina com um vencedor', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const end = playRandomMatch(seed);
      expect(end.matchWinner).not.toBeNull();
      expect(end.gamesWon[end.matchWinner as 0 | 1]).toBe(2);
    }
  });

  it('é determinístico para a mesma seed', () => {
    expect(playRandomMatch(42)).toEqual(playRandomMatch(42));
  });

  it('só um assento por vez tem ações de jogada', () => {
    const state = createGame({ seed: 7 });
    const acting = SEATS.filter((s) => legalActions(state, s).length > 0);
    expect(acting).toEqual([0]);
  });
});
