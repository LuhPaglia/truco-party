import {
  applyAction,
  createGame,
  defaultActor,
  getPlayerView,
  SEATS,
  type Action,
  type GameState,
  type ModeId,
  type Seat,
  type Team,
  type TrucoOptions,
} from '@truco-party/engine';
import { createBot } from './bot';
import type { Bot, BotConfig } from './types';

export interface MatchStats {
  winner: Team;
  hands: number;
  raises: number;
  runs: number;
  elevenHands: number;
  ironHands: number;
  finalScore: [number, number];
}

export interface SimulateConfig {
  ruleSetId?: ModeId;
  seed: number;
  options?: Partial<TrucoOptions>;
  /** Configuração de cada assento (0 e 2 = dupla 0; 1 e 3 = dupla 1). */
  seats: [Omit<BotConfig, 'seed'>, Omit<BotConfig, 'seed'>, Omit<BotConfig, 'seed'>, Omit<BotConfig, 'seed'>];
  onAction?: (action: Action, before: GameState, after: GameState) => void;
}

const MAX_STEPS = 10_000;

/** Joga uma disputa completa só com bots. Base do `npm run simulate` e dos testes de sanidade da IA. */
export function simulateMatch(config: SimulateConfig): MatchStats {
  const ruleSetId = config.ruleSetId ?? 'paulista';
  const bots: Bot[] = SEATS.map((seat) => createBot(ruleSetId, { ...config.seats[seat], seed: config.seed * 31 + seat }));
  let state = createGame({ ruleSetId, seed: config.seed, options: config.options });
  const stats = { hands: 1, raises: 0, runs: 0, elevenHands: 0, ironHands: 0 };
  countSpecial(state, stats);

  for (let steps = 0; state.phase !== 'matchOver'; steps++) {
    if (steps > MAX_STEPS) throw new Error(`Disputa não terminou (seed ${config.seed})`);
    const seat: Seat = defaultActor(state) ?? 0;
    const action = bots[seat].decide(getPlayerView(state, seat));
    const before = state;
    state = applyAction(state, action);
    config.onAction?.(action, before, state);

    if (action.type === 'RAISE') stats.raises++;
    if (action.type === 'RUN') stats.runs++;
    if (action.type === 'NEXT_HAND' || action.type === 'NEXT_GAME') {
      stats.hands++;
      countSpecial(state, stats);
    }
  }

  return { ...stats, winner: state.matchWinner as Team, finalScore: [...state.score] };
}

function countSpecial(state: GameState, stats: { elevenHands: number; ironHands: number }) {
  if (state.hand.special === 'elevenHand') stats.elevenHands++;
  if (state.hand.special === 'ironHand') stats.ironHands++;
}
