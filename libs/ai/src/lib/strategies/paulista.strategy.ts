import { getRuleSet, isSameAction, teamOf, type Action, type Card, type PlayerView } from '@truco-party/engine';
import type { DecisionContext, Difficulty, Personality, TrucoStrategy } from '../types';

interface PersonalityProfile {
  /** Força estimada mínima para aceitar um truco. */
  accept: number;
  /** Força estimada mínima para pedir/aumentar. */
  raise: number;
  /** Chance de pedir truco blefando, com mão fraca. */
  bluff: number;
}

const PERSONALITIES: Record<Personality, PersonalityProfile> = {
  cautious: { accept: 0.55, raise: 0.85, bluff: 0.01 },
  bluffer: { accept: 0.48, raise: 0.78, bluff: 0.06 },
  aggressive: { accept: 0.42, raise: 0.72, bluff: 0.03 },
};

interface DifficultyProfile {
  /** Ruído somado à estimativa de força. */
  noise: number;
  /** Chance de jogar uma carta aleatória. */
  mistake: number;
}

// TODO(fase 2): 'hard' com Monte Carlo (ISMCTS) sobre o próprio motor, rodando em Web Worker.
const DIFFICULTIES: Record<Difficulty, DifficultyProfile> = {
  easy: { noise: 0.2, mistake: 0.25 },
  medium: { noise: 0.05, mistake: 0 },
  hard: { noise: 0.02, mistake: 0 },
};

/** Manilhas valem 10..13 e o 3 vale 9 no Paulista. */
const MAX_POWER = 13;
const STRONG = 8;

export class PaulistaStrategy implements TrucoStrategy {
  private readonly ruleSet = getRuleSet('paulista');

  decide(view: PlayerView, ctx: DecisionContext): Action {
    const action = this.choose(view, ctx);
    const legal = view.legalActions.find((a) => isSameAction(a, action));
    return legal ?? view.legalActions[0];
  }

  private choose(view: PlayerView, ctx: DecisionContext): Action {
    const { seat } = view;
    const personality = PERSONALITIES[ctx.config.personality];
    const difficulty = DIFFICULTIES[ctx.config.difficulty];
    const has = (type: Action['type']) => view.legalActions.some((a) => a.type === type);
    const estimate = () => this.estimate(view) + (ctx.random() * 2 - 1) * difficulty.noise;

    switch (view.phase) {
      case 'elevenDecision': {
        const known = [...this.myKnownCards(view), ...(view.partnerCards ?? [])];
        const strong = known.filter((c) => this.power(view, c) >= STRONG).length;
        const play = view.partnerCards ? strong >= 2 : estimate() >= personality.accept;
        return { type: play ? 'ELEVEN_PLAY' : 'ELEVEN_RUN', seat };
      }

      case 'betPending': {
        const rival = 1 - teamOf(seat);
        // Se correr já entrega o jogo, não há o que perder: aceita.
        if (view.score[rival] + view.value >= this.ruleSet.winScore) {
          return { type: 'ACCEPT', seat };
        }
        const e = estimate();
        if (has('RAISE') && e >= personality.raise + 0.1) return { type: 'RAISE', seat };
        return { type: e >= personality.accept ? 'ACCEPT' : 'RUN', seat };
      }

      case 'playing': {
        if (has('RAISE')) {
          const e = estimate();
          if (e >= personality.raise || ctx.random() < personality.bluff) return { type: 'RAISE', seat };
        }
        return this.chooseCard(view, ctx, difficulty);
      }

      default:
        return view.legalActions[0];
    }
  }

  private chooseCard(view: PlayerView, ctx: DecisionContext, difficulty: DifficultyProfile): Action {
    const { seat } = view;
    const play = (cardIndex: number, covered = false): Action => ({ type: 'PLAY_CARD', seat, cardIndex, covered });
    const indexes = view.myCards.map((_, i) => i);

    // Mão de ferro: ninguém vê as cartas, qualquer uma serve.
    if (view.myCards.some((c) => c === null) || ctx.random() < difficulty.mistake) {
      return play(indexes[Math.floor(ctx.random() * indexes.length)]);
    }

    const cards = view.myCards as Card[];
    const byPower = [...indexes].sort((a, b) => this.power(view, cards[a]) - this.power(view, cards[b]));
    const weakest = byPower[0];
    const strongest = byPower[byPower.length - 1];
    const canCover = view.legalActions.some((a) => a.type === 'PLAY_CARD' && a.covered);

    const round = view.rounds[view.rounds.length - 1];
    if (round.plays.length === 0) {
      // Abrindo a 1ª rodada, guarda a melhor carta; depois, joga a mais forte para fechar.
      return play(view.rounds.length === 1 && byPower.length === 3 ? byPower[1] : strongest);
    }

    let best = -Infinity;
    let bestSeat = round.plays[0].seat;
    for (const p of round.plays) {
      const power = p.covered || !p.card ? -1 : this.power(view, p.card);
      if (power > best) {
        best = power;
        bestSeat = p.seat;
      }
    }

    if (teamOf(bestSeat) === teamOf(seat)) {
      // Parceiro já está ganhando: descarta a pior, escondendo-a se puder.
      return play(weakest, canCover && ctx.random() < 0.5);
    }

    const winning = byPower.find((i) => this.power(view, cards[i]) > best);
    if (winning !== undefined) return play(winning);

    const tying = byPower.find((i) => this.power(view, cards[i]) === best);
    if (tying !== undefined && view.rounds.length === 1) return play(tying);

    return play(weakest, canCover && ctx.random() < 0.5);
  }

  /** Força estimada da mão em [0, 1]: cartas restantes + rodadas já decididas. */
  private estimate(view: PlayerView): number {
    const myTeam = teamOf(view.seat);
    const powers = this.myKnownCards(view)
      .map((c) => this.power(view, c) / MAX_POWER)
      .sort((a, b) => b - a);
    // A melhor carta pesa o dobro; as demais completam a média.
    const weights = [2, 1, 1].slice(0, powers.length);
    const cardScore = powers.length
      ? powers.reduce((sum, p, i) => sum + p * weights[i], 0) / weights.reduce((a, b) => a + b, 0)
      : 0.5;
    const decided = view.rounds.filter((r) => r.outcome !== undefined);
    const won = decided.filter((r) => r.outcome === myTeam).length;
    const lost = decided.filter((r) => r.outcome !== myTeam && r.outcome !== 'tie').length;
    return Math.min(1, Math.max(0, cardScore + 0.3 * won - 0.3 * lost));
  }

  private myKnownCards(view: PlayerView): Card[] {
    return view.myCards.filter((c): c is Card => c !== null);
  }

  private power(view: PlayerView, card: Card): number {
    return this.ruleSet.strength(card, view.vira);
  }
}
