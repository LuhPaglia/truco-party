import { getRuleSet, type Card, type PlayerView, type Suit } from '@truco-party/engine';

/** Sinais clássicos do truco 2x2: o parceiro avisa a melhor carta que tem. */
export type PartnerSignal = 'zap' | 'copas' | 'espadilha' | 'pica-fumo' | 'tres';

const MANILHA_SIGNAL: Record<Suit, PartnerSignal> = {
  paus: 'zap',
  copas: 'copas',
  espadas: 'espadilha',
  ouros: 'pica-fumo',
};

/** Qual sinal um NPC faria para o parceiro com a mão que tem (null = nada que valha sinal). */
export function chooseSignal(view: PlayerView): PartnerSignal | null {
  if (!view.options.partnerSignals || view.special === 'ironHand') return null;
  const ruleSet = getRuleSet(view.ruleSetId);
  const cards = view.myCards.filter((c): c is Card => c !== null);
  const best = [...cards].sort((a, b) => ruleSet.strength(b, view.vira) - ruleSet.strength(a, view.vira))[0];
  if (!best) return null;
  if (ruleSet.isManilha(best, view.vira)) return MANILHA_SIGNAL[best.suit];
  return best.rank === '3' ? 'tres' : null;
}
