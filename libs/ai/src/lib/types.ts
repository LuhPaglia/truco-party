import type { Action, PlayerView } from '@truco-party/engine';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type Personality = 'cautious' | 'bluffer' | 'aggressive';

export interface BotConfig {
  difficulty: Difficulty;
  personality: Personality;
  seed: number;
}

/** Um NPC decide só a partir da PlayerView — nunca enxerga o GameState completo. */
export interface Bot {
  readonly config: BotConfig;
  decide(view: PlayerView): Action;
}

/** Estratégia por modalidade (PaulistaStrategy, futuramente MineiroStrategy, GauchoStrategy). */
export interface TrucoStrategy {
  decide(view: PlayerView, ctx: DecisionContext): Action;
}

export interface DecisionContext {
  readonly config: BotConfig;
  /** Número em [0, 1) do RNG próprio do bot. */
  random(): number;
}
