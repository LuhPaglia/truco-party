import type { ModeId, RuleSet } from '../ruleset';
import { paulista } from './paulista';

export interface ModeEntry {
  readonly id: ModeId;
  readonly label: string;
  readonly available: boolean;
}

/** Lista exibida na tela de escolha de modalidade. Para liberar uma modalidade: RuleSet + Strategy de IA + fixtures. */
export const MODES: readonly ModeEntry[] = [
  { id: 'paulista', label: 'Truco Paulista', available: true },
  { id: 'mineiro', label: 'Truco Mineiro', available: false },
  { id: 'gaucho', label: 'Truco Gaúcho', available: false },
];

const RULESETS: Partial<Record<ModeId, RuleSet>> = { paulista };

export function getRuleSet(id: ModeId): RuleSet {
  const ruleSet = RULESETS[id];
  if (!ruleSet) {
    throw new Error(`Modalidade "${id}" ainda não está disponível`);
  }
  return ruleSet;
}
