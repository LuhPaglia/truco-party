import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cardToString, parseCard } from './cards';
import { applyAction, createGameWithDeal, IllegalActionError } from './game';
import type { ModeId, TrucoOptions } from './ruleset';
import type { Action, GameState, Seat } from './types';

interface FixtureAction {
  type: Action['type'];
  seat?: Seat;
  card?: string;
  covered?: boolean;
  expectError?: boolean;
}

interface Fixture {
  name: string;
  description: string;
  ruleSet: ModeId;
  options: Partial<TrucoOptions>;
  setup: { dealer: Seat; score: [number, number]; vira: string | null; hands: string[][] };
  actions: FixtureAction[];
  expect: Record<string, unknown>;
}

const ROOT = fileURLToPath(new URL('../../../../spec/conformance', import.meta.url));

function loadFixtures(ruleSet: string): Fixture[] {
  const dir = join(ROOT, ruleSet);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Fixture);
}

function toAction(state: GameState, step: FixtureAction): Action {
  if (step.type !== 'PLAY_CARD') return { type: step.type, seat: step.seat } as Action;
  const seat = step.seat as Seat;
  const cardIndex = state.hand.cards[seat].findIndex((c) => cardToString(c) === step.card);
  return { type: 'PLAY_CARD', seat, cardIndex, covered: step.covered };
}

function snapshot(state: GameState): Record<string, unknown> {
  return {
    phase: state.phase,
    score: state.score,
    gamesWon: state.gamesWon,
    matchWinner: state.matchWinner,
    dealer: state.dealer,
    currentSeat: state.hand.currentSeat,
    value: state.hand.value,
    pendingValue: state.hand.pendingBet?.value ?? null,
    special: state.hand.special,
    roundWinners: state.hand.rounds.filter((r) => r.outcome !== undefined).map((r) => r.outcome),
    result: state.hand.result,
  };
}

describe('conformidade: Truco Paulista', () => {
  for (const fixture of loadFixtures('paulista')) {
    it(`${fixture.name} — ${fixture.description}`, () => {
      let state = createGameWithDeal({
        ruleSetId: fixture.ruleSet,
        options: fixture.options,
        seed: 1,
        firstDealer: fixture.setup.dealer,
        score: fixture.setup.score,
        vira: fixture.setup.vira ? parseCard(fixture.setup.vira) : null,
        cards: fixture.setup.hands.map((h) => h.map(parseCard)),
      });

      for (const step of fixture.actions) {
        const action = toAction(state, step);
        if (step.expectError) {
          expect(() => applyAction(state, action), JSON.stringify(step)).toThrow(IllegalActionError);
        } else {
          state = applyAction(state, action);
        }
      }

      const actual = snapshot(state);
      for (const [key, expected] of Object.entries(fixture.expect)) {
        if (key === 'result') {
          expect(actual[key], key).toMatchObject(expected as object);
        } else {
          expect(actual[key], key).toEqual(expected);
        }
      }
    });
  }
});
