import type { Card } from './cards';
import { legalActions } from './game';
import type { ModeId, TrucoOptions } from './ruleset';
import {
  partnerOf,
  teamOf,
  type Action,
  type GameState,
  type HandResult,
  type PendingBet,
  type Phase,
  type RoundOutcome,
  type Seat,
  type SpecialHand,
  type Team,
} from './types';

export interface PlayView {
  readonly seat: Seat;
  /** null quando a carta foi jogada coberta por outro jogador. */
  readonly card: Card | null;
  readonly covered: boolean;
}

export interface RoundView {
  readonly leader: Seat;
  readonly plays: PlayView[];
  readonly outcome?: RoundOutcome;
}

/**
 * O que um assento pode saber da mesa. É a única entrada da IA (garante que os NPCs não trapaceiam)
 * e o formato que o servidor vai enviar a cada cliente no multiplayer.
 */
export interface PlayerView {
  readonly seat: Seat;
  readonly ruleSetId: ModeId;
  readonly options: TrucoOptions;
  readonly phase: Phase;
  readonly score: [number, number];
  readonly gamesWon: [number, number];
  readonly dealer: Seat;
  readonly matchWinner: Team | null;
  readonly handNumber: number;
  readonly vira: Card | null;
  readonly value: number;
  readonly pendingBet: PendingBet | null;
  readonly lastRaiserTeam: Team | null;
  readonly special: SpecialHand;
  readonly elevenTeam: Team | null;
  readonly currentSeat: Seat;
  /** Cartas do próprio jogador; null para cada carta na mão de ferro (ninguém vê a própria mão). */
  readonly myCards: (Card | null)[];
  /** Só na decisão da mão de onze, se a regra permitir ver o parceiro. */
  readonly partnerCards: Card[] | null;
  readonly cardsInHand: [number, number, number, number];
  readonly rounds: RoundView[];
  readonly result: HandResult | null;
  readonly legalActions: Action[];
}

export function getPlayerView(state: GameState, seat: Seat): PlayerView {
  const { hand } = state;
  const showPartner =
    state.phase === 'elevenDecision' && state.options.elevenHandSeePartner && teamOf(seat) === hand.elevenTeam;

  return {
    seat,
    ruleSetId: state.ruleSetId,
    options: state.options,
    phase: state.phase,
    score: [...state.score],
    gamesWon: [...state.gamesWon],
    dealer: state.dealer,
    matchWinner: state.matchWinner,
    handNumber: hand.number,
    vira: hand.vira,
    value: hand.value,
    pendingBet: hand.pendingBet,
    lastRaiserTeam: hand.lastRaiserTeam,
    special: hand.special,
    elevenTeam: hand.elevenTeam,
    currentSeat: hand.currentSeat,
    myCards: hand.cards[seat].map((card) => (hand.special === 'ironHand' ? null : card)),
    partnerCards: showPartner ? [...hand.cards[partnerOf(seat)]] : null,
    cardsInHand: hand.cards.map((c) => c.length) as [number, number, number, number],
    rounds: hand.rounds.map((round) => ({
      leader: round.leader,
      outcome: round.outcome,
      plays: round.plays.map((play) => ({
        seat: play.seat,
        covered: play.covered,
        card: play.covered && play.seat !== seat ? null : play.card,
      })),
    })),
    result: hand.result,
    legalActions: legalActions(state, seat),
  };
}
