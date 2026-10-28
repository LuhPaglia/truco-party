import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { Difficulty } from '@truco-party/ai';
import { MODES, type ModeId, type TrucoOptions } from '@truco-party/engine';
import { SettingsStore } from '../game/settings.store';

interface RuleToggle<K extends keyof TrucoOptions = keyof TrucoOptions> {
  key: K;
  label: string;
  hint: string;
  on: TrucoOptions[K];
  off: TrucoOptions[K];
}

const RULES: RuleToggle[] = [
  { key: 'ironHand', label: 'Mão de ferro', hint: 'No 11 a 11 ninguém vê as cartas e não tem truco.', on: true, off: false },
  {
    key: 'elevenHandSeePartner',
    label: 'Ver o parceiro na mão de onze',
    hint: 'A dupla com 11 vê as cartas do parceiro antes de decidir.',
    on: true,
    off: false,
  },
  {
    key: 'elevenHandTruco',
    label: 'Truco na mão de onze',
    hint: 'Permite pedir truco quando uma dupla está com 11.',
    on: 'allowed',
    off: 'forbidden',
  },
  {
    key: 'coveredCards',
    label: 'Carta coberta',
    hint: 'A partir da 2ª rodada dá para jogar uma carta virada (vale menos que todas).',
    on: 'fromSecondRound',
    off: 'never',
  },
  {
    key: 'allRoundsTied',
    label: 'Três empates: ponto para quem é mão',
    hint: 'Desligado, ninguém pontua quando as três rodadas empatam.',
    on: 'firstPlayerTeam',
    off: 'nobodyScores',
  },
  { key: 'partnerSignals', label: 'Sinais do parceiro', hint: 'O parceiro avisa a melhor carta que tem.', on: true, off: false },
  { key: 'format', label: 'Melhor de 3', hint: 'Vence quem ganhar duas partidas de 12 pontos.', on: 'bestOf3', off: 'single' },
];

const DIFFICULTIES: { id: Difficulty; label: string; available: boolean }[] = [
  { id: 'easy', label: 'Fácil', available: true },
  { id: 'medium', label: 'Médio', available: true },
  { id: 'hard', label: 'Difícil', available: false },
];

@Component({
  selector: 'truco-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomePage {
  private readonly store = inject(SettingsStore);
  private readonly router = inject(Router);

  protected readonly settings = this.store.settings;
  protected readonly modes = MODES;
  protected readonly difficulties = DIFFICULTIES;
  protected readonly rules = RULES;

  protected selectMode(id: ModeId): void {
    this.store.update({ ruleSetId: id });
  }

  protected selectDifficulty(id: Difficulty): void {
    this.store.update({ difficulty: id });
  }

  protected isOn(rule: RuleToggle): boolean {
    return this.settings().options[rule.key] === rule.on;
  }

  protected toggle(rule: RuleToggle, checked: boolean): void {
    this.store.updateOptions({ [rule.key]: checked ? rule.on : rule.off });
  }

  protected resetRules(): void {
    this.store.resetOptions();
  }

  protected start(): void {
    void this.router.navigate(['/mesa']);
  }
}
