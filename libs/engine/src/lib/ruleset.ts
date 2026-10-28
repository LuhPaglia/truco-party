import type { Card } from './cards';

export type ModeId = 'paulista' | 'mineiro' | 'gaucho';

/**
 * Regras opcionais ("house rules") da família brasileira (Paulista/Mineiro).
 * Fazem parte das fixtures de conformidade: o futuro motor em Java precisa respeitá-las igual.
 */
export interface TrucoOptions {
  /** Mão de ferro: em 11 a 11 as cartas vêm escondidas para todos e não há truco. */
  ironHand: boolean;
  /** Na mão de onze, a dupla com 11 vê as cartas do parceiro antes de decidir. */
  elevenHandSeePartner: boolean;
  elevenHandTruco: 'forbidden' | 'allowed';
  /** Jogar carta virada (vale menos que qualquer carta). */
  coveredCards: 'fromSecondRound' | 'never';
  /** Três rodadas empatadas: ninguém pontua, ou ponto para a dupla de quem é "mão". */
  allRoundsTied: 'nobodyScores' | 'firstPlayerTeam';
  /** Sinais entre parceiros. Não afeta o motor; é lido pela IA e pela interface. */
  partnerSignals: boolean;
  format: 'single' | 'bestOf3';
}

export interface RuleSet {
  readonly id: ModeId;
  readonly name: string;
  createDeck(): Card[];
  /** Paulista vira uma carta para definir a manilha; Mineiro tem manilhas fixas. */
  readonly usesVira: boolean;
  /** Força da carta: maior vence, igual empata. */
  strength(card: Card, vira: Card | null): number;
  isManilha(card: Card, vira: Card | null): boolean;
  /** Degraus de valor da mão: [valor base, truco, seis, nove, doze]. */
  readonly betLadder: readonly number[];
  readonly winScore: number;
  /** Placar que dispara a mão de onze (Paulista: 11; Mineiro: mão de dez). */
  readonly specialHandScore: number;
  /** Quanto vale a mão de onze quando a dupla decide jogar. */
  readonly specialHandValue: number;
  /** Pontos dados aos adversários quando a dupla corre da mão de onze. */
  readonly specialHandRunPoints: number;
  readonly defaultOptions: TrucoOptions;
  // Futuro (Gaúcho/Argentino): `sideBets: SideBet[]` para Envido, Real Envido, Falta Envido e Flor.
}
