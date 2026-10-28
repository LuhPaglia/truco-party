import type { Card, Suit } from '@truco-party/engine';

export const SUIT_SYMBOLS: Record<Suit, string> = { ouros: '♦', espadas: '♠', copas: '♥', paus: '♣' };
export const RED_SUITS: readonly Suit[] = ['ouros', 'copas'];

const BET_NAMES: Record<number, string> = { 3: 'Truco', 6: 'Seis', 9: 'Nove', 12: 'Doze' };

/** Nome do pedido que leva a mão até `value` (3 → "Truco", 6 → "Seis"…). */
export function betName(value: number): string {
  return BET_NAMES[value] ?? String(value);
}

export function cardLabel(card: Card): string {
  return `${card.rank}${SUIT_SYMBOLS[card.suit]}`;
}
