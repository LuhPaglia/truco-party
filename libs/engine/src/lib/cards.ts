/**
 * Baralho francês de 40 cartas (sem 8, 9, 10 e coringas), usado pelo Paulista e pelo Mineiro.
 * O Gaúcho/Argentino usa o baralho espanhol: quando entrar, `Rank`/`Suit` viram uniões por baralho.
 */
export const SUITS = ['ouros', 'espadas', 'copas', 'paus'] as const;
export type Suit = (typeof SUITS)[number];

/** Da mais fraca para a mais forte (ordem das cartas comuns no truco brasileiro). */
export const RANKS = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'] as const;
export type Rank = (typeof RANKS)[number];

export interface Card {
  readonly rank: Rank;
  readonly suit: Suit;
}

const SUIT_CODES: Record<Suit, string> = { ouros: 'o', espadas: 'e', copas: 'c', paus: 'p' };
const CODE_SUITS: Record<string, Suit> = { o: 'ouros', e: 'espadas', c: 'copas', p: 'paus' };

/** Notação curta usada nas fixtures de conformidade: rank + naipe, ex. "4p" (zap), "7c", "Ae", "3o". */
export function cardToString(card: Card): string {
  return card.rank + SUIT_CODES[card.suit];
}

export function parseCard(text: string): Card {
  const rank = text.slice(0, -1) as Rank;
  const suit = CODE_SUITS[text.slice(-1)];
  if (!RANKS.includes(rank) || !suit) {
    throw new Error(`Carta inválida: "${text}"`);
  }
  return { rank, suit };
}

export function sameCard(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}

export function createFrenchDeck40(): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })));
}
