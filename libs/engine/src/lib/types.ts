import type { Card } from './cards';
import type { ModeId, TrucoOptions } from './ruleset';

/** Mesa 2x2: 0 = jogador (baixo), 1 = direita, 2 = parceiro (cima), 3 = esquerda. Dupla = assento % 2. */
export type Seat = 0 | 1 | 2 | 3;
export type Team = 0 | 1;

export const SEATS: readonly Seat[] = [0, 1, 2, 3];
export const teamOf = (seat: Seat): Team => (seat % 2) as Team;
export const otherTeam = (team: Team): Team => (1 - team) as Team;
export const nextSeat = (seat: Seat): Seat => ((seat + 1) % 4) as Seat;
export const partnerOf = (seat: Seat): Seat => ((seat + 2) % 4) as Seat;

export type Action =
  /** `cardIndex` é a posição na mão atual do jogador. `covered` = jogar a carta virada (escondida). */
  | { type: 'PLAY_CARD'; seat: Seat; cardIndex: number; covered?: boolean }
  /** Pedir truco na sua vez, ou aumentar (seis, nove, doze) ao responder um pedido. */
  | { type: 'RAISE'; seat: Seat }
  | { type: 'ACCEPT'; seat: Seat }
  | { type: 'RUN'; seat: Seat }
  /** Mão de onze: a dupla com 11 pontos decide jogar ou correr. */
  | { type: 'ELEVEN_PLAY'; seat: Seat }
  | { type: 'ELEVEN_RUN'; seat: Seat }
  | { type: 'NEXT_HAND' }
  | { type: 'NEXT_GAME' };

export type Phase =
  | 'elevenDecision'
  | 'playing'
  | 'betPending'
  | 'handOver'
  /** Fim de uma partida numa melhor de 3 que ainda não acabou. */
  | 'gameOver'
  | 'matchOver';

/** normal | mão de onze (uma dupla com 11) | mão de ferro (11 a 11). */
export type SpecialHand = 'normal' | 'elevenHand' | 'ironHand';

export type RoundOutcome = Team | 'tie';

export interface Play {
  readonly seat: Seat;
  readonly card: Card;
  readonly covered: boolean;
}

export interface RoundState {
  readonly leader: Seat;
  readonly plays: Play[];
  outcome?: RoundOutcome;
}

export interface PendingBet {
  readonly requestedBy: Seat;
  readonly respondingTeam: Team;
  /** Valor que passa a valer a mão se o pedido for aceito. */
  readonly value: number;
}

export type HandEndReason = 'rounds' | 'run' | 'elevenRun' | 'allTied';

export interface HandResult {
  readonly winner: Team | null;
  readonly points: number;
  readonly reason: HandEndReason;
}

export interface HandState {
  readonly number: number;
  /** Cartas restantes na mão de cada assento. */
  cards: Card[][];
  readonly vira: Card | null;
  /** Valor já aceito da mão. */
  value: number;
  lastRaiserTeam: Team | null;
  pendingBet: PendingBet | null;
  rounds: RoundState[];
  /** De quem é a vez de jogar (mantido durante um pedido de truco). */
  currentSeat: Seat;
  readonly special: SpecialHand;
  readonly elevenTeam: Team | null;
  result: HandResult | null;
}

export interface GameState {
  readonly ruleSetId: ModeId;
  readonly options: TrucoOptions;
  rngState: number;
  score: [number, number];
  gamesWon: [number, number];
  phase: Phase;
  dealer: Seat;
  hand: HandState;
  matchWinner: Team | null;
}
