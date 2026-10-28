import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { chooseSignal, createBot, PERSONALITY_LIST, type Bot, type PartnerSignal } from '@truco-party/ai';
import {
  applyAction,
  createGame,
  getPlayerView,
  isSameAction,
  nextSeat,
  partnerOf,
  type Action,
  type GameState,
  type Seat,
} from '@truco-party/engine';
import { betName } from '@truco-party/ui-game';
import { AD_PROVIDER } from './ads';
import { SettingsStore } from './settings.store';

export const HUMAN: Seat = 0;
const PARTNER = partnerOf(HUMAN);

/** Ritmo da mesa (ms). */
export const PACE = { bot: 750, roundPause: 1300, callout: 1800 };

/**
 * Liga o motor, os bots e a interface. O jogador humano é sempre o assento 0; os assentos 1–3 são NPCs.
 * Fornecido pela página da mesa, então cada partida tem o seu controlador (e seus timers).
 */
@Injectable()
export class GameController {
  private readonly settings = inject(SettingsStore).settings();
  private readonly ads = inject(AD_PROVIDER);
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private bots = new Map<Seat, Bot>();

  private readonly state = signal<GameState>(this.newState());
  /** Segura a rodada recém-fechada na mesa por um instante antes de limpar. */
  private readonly holdingRound = signal(false);

  readonly view = computed(() => getPlayerView(this.state(), HUMAN));
  readonly callouts = signal<Partial<Record<Seat, string>>>({});
  readonly partnerSignal = signal<PartnerSignal | null>(null);
  readonly busy = computed(() => this.holdingRound());

  /** Rodada exibida no centro: a anterior durante a pausa, senão a atual. */
  readonly displayedRound = computed(() => {
    const rounds = this.view().rounds;
    const current = rounds[rounds.length - 1];
    if (this.holdingRound() && current.plays.length === 0 && rounds.length > 1) return rounds[rounds.length - 2];
    return current;
  });

  readonly canAct = computed(() => !this.busy() && this.view().legalActions.length > 0);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearTimers());
    this.onHandStart();
    this.step();
  }

  // ——— ações do jogador ———

  play(cardIndex: number, covered = false): void {
    this.human({ type: 'PLAY_CARD', seat: HUMAN, cardIndex, covered });
  }

  raise(): void {
    this.human({ type: 'RAISE', seat: HUMAN });
  }

  accept(): void {
    this.human({ type: 'ACCEPT', seat: HUMAN });
  }

  run(): void {
    this.human({ type: 'RUN', seat: HUMAN });
  }

  elevenPlay(): void {
    this.human({ type: 'ELEVEN_PLAY', seat: HUMAN });
  }

  elevenRun(): void {
    this.human({ type: 'ELEVEN_RUN', seat: HUMAN });
  }

  nextHand(): void {
    this.human({ type: 'NEXT_HAND' });
  }

  async nextGame(): Promise<void> {
    await this.ads.showInterstitial('between-games');
    this.human({ type: 'NEXT_GAME' });
  }

  async rematch(): Promise<void> {
    await this.ads.showInterstitial('between-games');
    this.clearTimers();
    this.holdingRound.set(false);
    this.state.set(this.newState());
    this.onHandStart();
    this.step();
  }

  // ——— loop ———

  private human(action: Action): void {
    if (this.busy() || !this.view().legalActions.some((a) => isSameAction(a, action))) return;
    this.dispatch(action);
  }

  private dispatch(action: Action): void {
    const before = this.state();
    const after = applyAction(before, action);
    this.state.set(after);
    this.announce(action, after);

    if (action.type === 'NEXT_HAND' || action.type === 'NEXT_GAME') this.onHandStart();

    const roundClosed = action.type === 'PLAY_CARD' && after.hand.rounds.length > before.hand.rounds.length;
    if (roundClosed) {
      this.holdingRound.set(true);
      this.later(PACE.roundPause, () => {
        this.holdingRound.set(false);
        this.step();
      });
    } else {
      this.step();
    }
  }

  /** Agenda a jogada do próximo NPC, se for a vez de um. */
  private step(): void {
    const seat = this.botToAct(this.state());
    if (seat === null) return;
    this.later(PACE.bot, () => {
      const state = this.state();
      if (this.botToAct(state) !== seat) return;
      const bot = this.bots.get(seat) as Bot;
      this.dispatch(bot.decide(getPlayerView(state, seat)));
    });
  }

  private botToAct(state: GameState): Seat | null {
    const { hand } = state;
    switch (state.phase) {
      case 'playing':
        return hand.currentSeat === HUMAN ? null : hand.currentSeat;
      case 'betPending':
        // Quando a nossa dupla precisa responder, quem decide é o jogador.
        if (!hand.pendingBet || hand.pendingBet.respondingTeam === 0) return null;
        return nextSeat(hand.pendingBet.requestedBy);
      case 'elevenDecision':
        if (hand.elevenTeam === 0) return null;
        return teamFirstSeat(state);
      default:
        return null;
    }
  }

  private onHandStart(): void {
    this.callouts.set({});
    this.partnerSignal.set(chooseSignal(getPlayerView(this.state(), PARTNER)));
  }

  private announce(action: Action, after: GameState): void {
    if (!('seat' in action)) return;
    const text = calloutFor(action, after);
    if (!text) return;
    const seat = action.seat;
    this.callouts.update((c) => ({ ...c, [seat]: text }));
    this.later(PACE.callout, () =>
      this.callouts.update((c) => (c[seat] === text ? { ...c, [seat]: undefined } : c)),
    );
  }

  private newState(): GameState {
    const seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) | 0;
    const { ruleSetId, difficulty, options } = this.settings;
    this.bots = new Map(
      ([1, 2, 3] as Seat[]).map((seat) => [
        seat,
        createBot(ruleSetId, {
          difficulty,
          personality: PERSONALITY_LIST[((seed + seat) >>> 0) % PERSONALITY_LIST.length],
          seed: seed + seat,
        }),
      ]),
    );
    return createGame({ ruleSetId, options, seed });
  }

  private later(ms: number, fn: () => void): void {
    const id = setTimeout(() => {
      this.timers.delete(id);
      fn();
    }, ms);
    this.timers.add(id);
  }

  private clearTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers.clear();
  }
}

function teamFirstSeat(state: GameState): Seat {
  const first = nextSeat(state.dealer);
  return first % 2 === state.hand.elevenTeam ? first : nextSeat(first);
}

function calloutFor(action: Action, after: GameState): string | null {
  switch (action.type) {
    case 'RAISE':
      return `${betName(after.hand.pendingBet?.value ?? 0)}!`;
    case 'ACCEPT':
      return 'Aceito!';
    case 'RUN':
      return 'Corro!';
    case 'ELEVEN_PLAY':
      return 'Vamos jogar!';
    case 'ELEVEN_RUN':
      return 'Corremos.';
    default:
      return null;
  }
}
