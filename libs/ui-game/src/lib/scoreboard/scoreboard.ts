import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { RoundOutcome } from '@truco-party/engine';

/** Placar do ponto de vista da dupla do jogador (dupla 0 = "Nós"). */
@Component({
  selector: 'truco-scoreboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="team us">
      <span class="name">Nós</span>
      <strong class="points">{{ score()[0] }}</strong>
      @if (bestOf3()) {
        <span class="games" aria-label="partidas vencidas">{{ '●'.repeat(gamesWon()[0]) }}</span>
      }
    </div>
    <div class="hand">
      <span class="value">
        Vale {{ value() }}
        @if (manilha(); as m) {
          · Manilha {{ m }}
        }
      </span>
      <span class="rounds" aria-label="rodadas">
        @for (slot of [0, 1, 2]; track slot) {
          <span class="dot" [class]="dotClass(slot)"></span>
        }
      </span>
    </div>
    <div class="team them">
      <span class="name">Eles</span>
      <strong class="points">{{ score()[1] }}</strong>
      @if (bestOf3()) {
        <span class="games" aria-label="partidas vencidas">{{ '●'.repeat(gamesWon()[1]) }}</span>
      }
    </div>
  `,
  styleUrl: './scoreboard.scss',
})
export class Scoreboard {
  readonly score = input.required<[number, number]>();
  readonly gamesWon = input<[number, number]>([0, 0]);
  readonly bestOf3 = input(false);
  readonly value = input(1);
  readonly rounds = input<readonly (RoundOutcome | undefined)[]>([]);
  /** Rank da manilha da mão (Paulista); null quando a modalidade não usa vira. */
  readonly manilha = input<string | null>(null);

  protected dotClass(slot: number): string {
    const outcome = this.rounds()[slot];
    if (outcome === undefined) return 'dot';
    return 'dot ' + (outcome === 'tie' ? 'tie' : outcome === 0 ? 'won' : 'lost');
  }
}
