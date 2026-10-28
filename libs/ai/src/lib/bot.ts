import { nextRandom, type ModeId } from '@truco-party/engine';
import { PaulistaStrategy } from './strategies/paulista.strategy';
import type { Bot, BotConfig, Personality, TrucoStrategy } from './types';

const STRATEGIES: Partial<Record<ModeId, () => TrucoStrategy>> = {
  paulista: () => new PaulistaStrategy(),
};

export const PERSONALITY_LIST: readonly Personality[] = ['cautious', 'bluffer', 'aggressive'];

export function createBot(ruleSetId: ModeId, config: BotConfig): Bot {
  const factory = STRATEGIES[ruleSetId];
  if (!factory) throw new Error(`Sem IA para a modalidade "${ruleSetId}"`);
  const strategy = factory();
  let rngState = config.seed | 0;
  const random = () => {
    const [value, next] = nextRandom(rngState);
    rngState = next;
    return value;
  };
  return {
    config,
    decide: (view) => strategy.decide(view, { config, random }),
  };
}
