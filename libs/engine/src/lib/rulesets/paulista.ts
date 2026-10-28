import { createFrenchDeck40, RANKS, SUITS, type Card, type Rank } from '../cards';
import type { RuleSet, TrucoOptions } from '../ruleset';

export const PAULISTA_DEFAULT_OPTIONS: TrucoOptions = {
  ironHand: true,
  elevenHandSeePartner: true,
  elevenHandTruco: 'forbidden',
  coveredCards: 'fromSecondRound',
  allRoundsTied: 'nobodyScores',
  partnerSignals: true,
  format: 'single',
};

/** A manilha é a carta logo acima da vira, de forma circular (vira 3 → manilha 4). */
export function manilhaRankFor(vira: Card): Rank {
  return RANKS[(RANKS.indexOf(vira.rank) + 1) % RANKS.length];
}

const MANILHA_BASE = RANKS.length;

export const paulista: RuleSet = {
  id: 'paulista',
  name: 'Truco Paulista',
  createDeck: createFrenchDeck40,
  usesVira: true,
  isManilha(card, vira) {
    return vira !== null && card.rank === manilhaRankFor(vira);
  },
  strength(card, vira) {
    // Comuns: 0 (4) … 9 (3). Manilhas: 10 (ouros) … 13 (paus, o zap); o naipe só desempata manilhas.
    if (this.isManilha(card, vira)) {
      return MANILHA_BASE + SUITS.indexOf(card.suit);
    }
    return RANKS.indexOf(card.rank);
  },
  betLadder: [1, 3, 6, 9, 12],
  winScore: 12,
  specialHandScore: 11,
  specialHandValue: 3,
  specialHandRunPoints: 1,
  defaultOptions: PAULISTA_DEFAULT_OPTIONS,
};
