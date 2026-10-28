import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Card } from '@truco-party/engine';
import { cardLabel, RED_SUITS, SUIT_SYMBOLS } from '../labels';

/** Carta desenhada em CSS. `card = null` mostra o verso. */
@Component({
  selector: 'truco-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'truco-card',
    '[class.back]': '!card()',
    '[class.red]': 'red()',
    '[class.manilha]': 'manilha()',
    '[class.sm]': "size() === 'sm'",
    '[class.lg]': "size() === 'lg'",
    '[attr.aria-label]': 'ariaLabel()',
    role: 'img',
  },
  template: `
    @if (card(); as c) {
      <span class="corner">{{ c.rank }}<br />{{ symbol() }}</span>
      <span class="pip">{{ symbol() }}</span>
      <span class="corner bottom">{{ c.rank }}<br />{{ symbol() }}</span>
      @if (manilha()) {
        <span class="badge" aria-hidden="true">★</span>
      }
    }
  `,
  styleUrl: './card.scss',
})
export class CardView {
  readonly card = input<Card | null>(null);
  readonly manilha = input(false);
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  protected readonly symbol = computed(() => {
    const c = this.card();
    return c ? SUIT_SYMBOLS[c.suit] : '';
  });
  protected readonly red = computed(() => {
    const c = this.card();
    return !!c && RED_SUITS.includes(c.suit);
  });
  protected readonly ariaLabel = computed(() => {
    const c = this.card();
    if (!c) return 'carta virada';
    return cardLabel(c) + (this.manilha() ? ' (manilha)' : '');
  });
}
