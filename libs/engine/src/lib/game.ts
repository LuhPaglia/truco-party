import type { Card } from './cards';
import { shuffle } from './rng';
import type { ModeId, RuleSet, TrucoOptions } from './ruleset';
import { getRuleSet } from './rulesets/registry';
import {
  nextSeat,
  otherTeam,
  teamOf,
  type Action,
  type GameState,
  type HandEndReason,
  type HandState,
  type RoundOutcome,
  type RoundState,
  type Seat,
  type SpecialHand,
  type Team,
} from './types';

export class IllegalActionError extends Error {
  constructor(
    readonly action: Action,
    reason: string,
  ) {
    super(`Ação ilegal ${JSON.stringify(action)}: ${reason}`);
    this.name = 'IllegalActionError';
  }
}

export interface CreateGameConfig {
  ruleSetId?: ModeId;
  options?: Partial<TrucoOptions>;
  seed: number;
  /** Quem dá as cartas na primeira mão. Padrão 3, para que o assento 0 (jogador) seja "mão". */
  firstDealer?: Seat;
}

export interface DealConfig extends CreateGameConfig {
  score?: [number, number];
  cards: Card[][];
  vira: Card | null;
}

type TableState = Omit<GameState, 'hand' | 'phase'>;

export function createGame(config: CreateGameConfig): GameState {
  return dealHand(createTable(config), 1);
}

/** Cria o jogo com cartas definidas (fixtures, tutorial, replays). As mãos seguintes voltam a ser embaralhadas. */
export function createGameWithDeal(config: DealConfig): GameState {
  const table = createTable(config);
  return startHand(
    { ...table, score: config.score ?? [0, 0] },
    1,
    config.cards.map((c) => [...c]),
    config.vira,
  );
}

function createTable(config: CreateGameConfig): TableState {
  const ruleSetId = config.ruleSetId ?? 'paulista';
  const ruleSet = getRuleSet(ruleSetId);
  return {
    ruleSetId,
    options: { ...ruleSet.defaultOptions, ...config.options },
    rngState: config.seed | 0,
    score: [0, 0],
    gamesWon: [0, 0],
    dealer: config.firstDealer ?? 3,
    matchWinner: null,
  };
}

function dealHand(table: TableState, handNumber: number): GameState {
  const ruleSet = getRuleSet(table.ruleSetId);
  const [deck, rngState] = shuffle(ruleSet.createDeck(), table.rngState);
  const first = nextSeat(table.dealer);
  const cards: Card[][] = [[], [], [], []];
  for (let i = 0; i < 12; i++) {
    cards[(first + i) % 4].push(deck[i]);
  }
  const vira = ruleSet.usesVira ? deck[12] : null;
  return startHand({ ...table, rngState }, handNumber, cards, vira);
}

function startHand(table: TableState, handNumber: number, cards: Card[][], vira: Card | null): GameState {
  const ruleSet = getRuleSet(table.ruleSetId);
  const onEleven = table.score.map((s) => s === ruleSet.specialHandScore);
  let special: SpecialHand = 'normal';
  let elevenTeam: Team | null = null;
  if (onEleven[0] && onEleven[1]) {
    special = table.options.ironHand ? 'ironHand' : 'normal';
  } else if (onEleven[0] || onEleven[1]) {
    special = 'elevenHand';
    elevenTeam = onEleven[0] ? 0 : 1;
  }

  const leader = nextSeat(table.dealer);
  const hand: HandState = {
    number: handNumber,
    cards,
    vira,
    value: ruleSet.betLadder[0],
    lastRaiserTeam: null,
    pendingBet: null,
    rounds: [{ leader, plays: [] }],
    currentSeat: leader,
    special,
    elevenTeam,
    result: null,
  };
  return { ...table, phase: special === 'elevenHand' ? 'elevenDecision' : 'playing', hand };
}

export function nextBetValue(ruleSet: RuleSet, value: number): number | null {
  return ruleSet.betLadder.find((v) => v > value) ?? null;
}

function canRaise(state: GameState, seat: Seat): boolean {
  const { hand, options } = state;
  if (hand.special === 'ironHand') return false;
  if (hand.special === 'elevenHand' && options.elevenHandTruco === 'forbidden') return false;
  if (hand.lastRaiserTeam === teamOf(seat)) return false;
  return nextBetValue(getRuleSet(state.ruleSetId), hand.value) !== null;
}

function canCover(state: GameState): boolean {
  return (
    state.options.coveredCards === 'fromSecondRound' &&
    state.hand.rounds.length > 1 &&
    state.hand.special !== 'ironHand'
  );
}

export function legalActions(state: GameState, seat: Seat): Action[] {
  const { hand } = state;
  switch (state.phase) {
    case 'elevenDecision':
      return teamOf(seat) === hand.elevenTeam
        ? [
            { type: 'ELEVEN_PLAY', seat },
            { type: 'ELEVEN_RUN', seat },
          ]
        : [];
    case 'playing': {
      if (hand.currentSeat !== seat) return [];
      const actions: Action[] = hand.cards[seat].map((_, cardIndex) => ({ type: 'PLAY_CARD', seat, cardIndex }));
      if (canCover(state)) {
        hand.cards[seat].forEach((_, cardIndex) => actions.push({ type: 'PLAY_CARD', seat, cardIndex, covered: true }));
      }
      if (canRaise(state, seat)) actions.push({ type: 'RAISE', seat });
      return actions;
    }
    case 'betPending': {
      const pending = hand.pendingBet;
      if (!pending || teamOf(seat) !== pending.respondingTeam) return [];
      const actions: Action[] = [
        { type: 'ACCEPT', seat },
        { type: 'RUN', seat },
      ];
      if (nextBetValue(getRuleSet(state.ruleSetId), pending.value) !== null) {
        actions.push({ type: 'RAISE', seat });
      }
      return actions;
    }
    case 'handOver':
      return [{ type: 'NEXT_HAND' }];
    case 'gameOver':
      return [{ type: 'NEXT_GAME' }];
    case 'matchOver':
      return [];
  }
}

export function isSameAction(a: Action, b: Action): boolean {
  if (a.type !== b.type) return false;
  if ('seat' in a && 'seat' in b && a.seat !== b.seat) return false;
  if (a.type === 'PLAY_CARD' && b.type === 'PLAY_CARD') {
    return a.cardIndex === b.cardIndex && !!a.covered === !!b.covered;
  }
  return true;
}

/**
 * Seat que deve agir agora num loop de jogo (UI/simulação). Em pedidos de truco qualquer assento
 * da dupla pode responder; por padrão responde o próximo depois de quem pediu.
 */
export function defaultActor(state: GameState): Seat | null {
  const { hand } = state;
  switch (state.phase) {
    case 'playing':
      return hand.currentSeat;
    case 'betPending':
      return hand.pendingBet ? nextSeat(hand.pendingBet.requestedBy) : null;
    case 'elevenDecision': {
      const first = nextSeat(state.dealer);
      return teamOf(first) === hand.elevenTeam ? first : nextSeat(first);
    }
    default:
      return null;
  }
}

export function applyAction(state: GameState, action: Action): GameState {
  const seat: Seat = 'seat' in action ? action.seat : 0;
  if (!legalActions(state, seat).some((legal) => isSameAction(legal, action))) {
    throw new IllegalActionError(action, `não permitida na fase "${state.phase}"`);
  }

  const next = structuredClone(state);
  const ruleSet = getRuleSet(next.ruleSetId);
  const { hand } = next;

  switch (action.type) {
    case 'PLAY_CARD':
      return playCard(next, ruleSet, action.seat, action.cardIndex, !!action.covered);

    case 'RAISE': {
      const team = teamOf(action.seat);
      if (next.phase === 'betPending' && hand.pendingBet) {
        // Aumentar = aceitar o pedido atual e pedir o próximo degrau.
        hand.value = hand.pendingBet.value;
      }
      hand.pendingBet = {
        requestedBy: action.seat,
        respondingTeam: otherTeam(team),
        value: nextBetValue(ruleSet, hand.value) as number,
      };
      hand.lastRaiserTeam = team;
      next.phase = 'betPending';
      return next;
    }

    case 'ACCEPT':
      hand.value = (hand.pendingBet as NonNullable<HandState['pendingBet']>).value;
      hand.pendingBet = null;
      next.phase = 'playing';
      return next;

    case 'RUN':
      return finishHand(next, ruleSet, otherTeam(teamOf(action.seat)), hand.value, 'run');

    case 'ELEVEN_PLAY':
      hand.value = ruleSet.specialHandValue;
      next.phase = 'playing';
      return next;

    case 'ELEVEN_RUN':
      return finishHand(next, ruleSet, otherTeam(hand.elevenTeam as Team), ruleSet.specialHandRunPoints, 'elevenRun');

    case 'NEXT_HAND':
      return dealHand({ ...next, dealer: nextSeat(next.dealer) }, hand.number + 1);

    case 'NEXT_GAME':
      return dealHand({ ...next, score: [0, 0], dealer: nextSeat(next.dealer) }, hand.number + 1);
  }
}

function playCard(state: GameState, ruleSet: RuleSet, seat: Seat, cardIndex: number, covered: boolean): GameState {
  const { hand } = state;
  const [card] = hand.cards[seat].splice(cardIndex, 1);
  const round = hand.rounds[hand.rounds.length - 1];
  round.plays.push({ seat, card, covered });

  if (round.plays.length < 4) {
    hand.currentSeat = nextSeat(seat);
    return state;
  }

  const leader = resolveRound(round, ruleSet, hand.vira);
  const firstPlayerTeam = teamOf(nextSeat(state.dealer));
  const decision = decideHand(
    hand.rounds.map((r) => r.outcome as RoundOutcome),
    state.options.allRoundsTied,
    firstPlayerTeam,
  );
  if (decision) {
    const points = decision.winner === null ? 0 : hand.value;
    return finishHand(state, ruleSet, decision.winner, points, decision.allTied ? 'allTied' : 'rounds');
  }

  hand.rounds.push({ leader, plays: [] });
  hand.currentSeat = leader;
  return state;
}

/** Define o resultado da rodada e devolve quem começa a próxima ("torna"). */
function resolveRound(round: RoundState, ruleSet: RuleSet, vira: Card | null): Seat {
  const strengths = round.plays.map((p) => (p.covered ? -1 : ruleSet.strength(p.card, vira)));
  const best = Math.max(...strengths);
  const top = round.plays.filter((_, i) => strengths[i] === best);
  const teams = new Set(top.map((p) => teamOf(p.seat)));
  // Empate entre parceiros não é empate: a dupla vence a rodada.
  round.outcome = teams.size === 1 ? teamOf(top[0].seat) : 'tie';
  return top[0].seat;
}

/**
 * Regras de "cangar" do Paulista:
 * - 2 rodadas vencidas ganham a mão;
 * - empatou a 1ª, quem vencer a próxima rodada não empatada leva;
 * - venceu a 1ª e empatou depois, leva quem venceu a 1ª.
 * Retorna null enquanto a mão não está decidida.
 */
export function decideHand(
  outcomes: readonly RoundOutcome[],
  allRoundsTied: TrucoOptions['allRoundsTied'],
  firstPlayerTeam: Team,
): { winner: Team | null; allTied: boolean } | null {
  const wins = [0, 0];
  for (const o of outcomes) if (o !== 'tie') wins[o]++;
  if (wins[0] >= 2) return { winner: 0, allTied: false };
  if (wins[1] >= 2) return { winner: 1, allTied: false };

  const [first, second, third] = outcomes;
  if (outcomes.length === 2) {
    if (first !== 'tie' && second === 'tie') return { winner: first, allTied: false };
    if (first === 'tie' && second !== 'tie') return { winner: second, allTied: false };
  }
  if (outcomes.length === 3) {
    if (third !== 'tie') return { winner: third, allTied: false };
    if (first !== 'tie') return { winner: first, allTied: false };
    return { winner: allRoundsTied === 'firstPlayerTeam' ? firstPlayerTeam : null, allTied: true };
  }
  return null;
}

function finishHand(
  state: GameState,
  ruleSet: RuleSet,
  winner: Team | null,
  points: number,
  reason: HandEndReason,
): GameState {
  const { hand } = state;
  hand.pendingBet = null;
  hand.result = { winner, points, reason };
  if (winner === null) {
    state.phase = 'handOver';
    return state;
  }

  state.score[winner] += points;
  if (state.score[winner] < ruleSet.winScore) {
    state.phase = 'handOver';
    return state;
  }

  state.gamesWon[winner]++;
  const gamesToWin = state.options.format === 'bestOf3' ? 2 : 1;
  if (state.gamesWon[winner] >= gamesToWin) {
    state.phase = 'matchOver';
    state.matchWinner = winner;
  } else {
    state.phase = 'gameOver';
  }
  return state;
}
