import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { PartnerSignal } from '@truco-party/ai';
import { cardToString, getRuleSet, manilhaRankFor, nextBetValue, type Card, type Seat } from '@truco-party/engine';
import { betName, CardView, Scoreboard } from '@truco-party/ui-game';
import { GameController } from '../game/game-controller';

const SEAT_NAMES: Record<Seat, string> = { 0: 'Você', 1: 'Direita', 2: 'Parceiro', 3: 'Esquerda' };

const SIGNAL_TEXT: Record<PartnerSignal, string> = {
  zap: '😉 Tenho o Zap',
  copas: '🤨 Tenho Copas',
  espadilha: '😗 Tenho Espadilha',
  'pica-fumo': '😮‍💨 Tenho Pica-fumo',
  tres: '🤞 Tenho um 3',
};

@Component({
  selector: 'truco-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CardView, Scoreboard],
  providers: [GameController],
  templateUrl: './table.html',
  styleUrl: './table.scss',
})
export class TablePage {
  protected readonly game = inject(GameController);
  protected readonly seatNames = SEAT_NAMES;
  protected readonly opponents = [
    { seat: 2 as Seat, area: 'top' },
    { seat: 3 as Seat, area: 'left' },
    { seat: 1 as Seat, area: 'right' },
  ];
  /** Próximo toque numa carta a joga coberta. */
  protected readonly coverNext = signal(false);

  private readonly ruleSet = computed(() => getRuleSet(this.game.view().ruleSetId));

  protected readonly manilhaRank = computed(() => {
    const vira = this.game.view().vira;
    return vira ? manilhaRankFor(vira) : null;
  });

  protected readonly roundOutcomes = computed(() => this.game.view().rounds.map((r) => r.outcome));

  protected readonly myTurn = computed(() => {
    const v = this.game.view();
    return v.phase === 'playing' && v.currentSeat === 0 && !this.game.busy();
  });

  protected readonly canCover = computed(() =>
    this.game.view().legalActions.some((a) => a.type === 'PLAY_CARD' && a.covered),
  );

  /** Nome do pedido disponível agora (Truco/Seis/Nove/Doze), ou null. */
  protected readonly raiseLabel = computed(() => {
    const v = this.game.view();
    if (!v.legalActions.some((a) => a.type === 'RAISE')) return null;
    const base = v.phase === 'betPending' && v.pendingBet ? v.pendingBet.value : v.value;
    const next = nextBetValue(this.ruleSet(), base);
    return next ? betName(next) : null;
  });

  protected readonly mustAnswerBet = computed(() => {
    const v = this.game.view();
    return v.phase === 'betPending' && v.pendingBet?.respondingTeam === 0 && !this.game.busy();
  });

  protected readonly signalText = computed(() => {
    const s = this.game.partnerSignal();
    return s && this.game.view().phase !== 'handOver' ? SIGNAL_TEXT[s] : null;
  });

  protected readonly status = computed(() => {
    const v = this.game.view();
    if (this.game.busy()) return '';
    switch (v.phase) {
      case 'betPending': {
        const bet = v.pendingBet;
        if (!bet) return '';
        return bet.respondingTeam === 0
          ? `${SEAT_NAMES[bet.requestedBy]} pediu ${betName(bet.value)}!`
          : `Pedimos ${betName(bet.value)}… esperando resposta`;
      }
      case 'elevenDecision':
        return v.elevenTeam === 1 ? 'Mão de onze: eles estão decidindo…' : '';
      case 'playing':
        if (v.currentSeat === 0) return v.special === 'ironHand' ? 'Mão de ferro: jogue no escuro' : 'Sua vez';
        return `Vez de ${SEAT_NAMES[v.currentSeat]}`;
      default:
        return '';
    }
  });

  protected readonly resultText = computed(() => {
    const r = this.game.view().result;
    if (!r) return null;
    if (r.winner === null) return { title: 'Empate', detail: 'Três rodadas empatadas: ninguém pontua.' };
    const us = r.winner === 0;
    const title = `${us ? 'Vocês ganharam' : 'Eles ganharam'} +${r.points}`;
    const detail = {
      rounds: us ? 'Boa mão!' : 'Fica para a próxima.',
      run: us ? 'Eles correram.' : 'Vocês correram.',
      elevenRun: us ? 'Eles correram da mão de onze.' : 'Vocês correram da mão de onze.',
      allTied: 'Três empates: ponto para quem é mão.',
    }[r.reason];
    return { title, detail };
  });

  protected range(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i);
  }

  protected isManilha(card: Card | null): boolean {
    return !!card && this.ruleSet().isManilha(card, this.game.view().vira);
  }

  protected cardKey(card: Card | null, index: number): string {
    return card ? cardToString(card) : `hidden-${index}`;
  }

  protected isTurn(seat: Seat): boolean {
    const v = this.game.view();
    return v.phase === 'playing' && v.currentSeat === seat && !this.game.busy();
  }

  protected play(index: number): void {
    if (!this.myTurn()) return;
    const covered = this.coverNext() && this.canCover();
    this.coverNext.set(false);
    this.game.play(index, covered);
  }
}
