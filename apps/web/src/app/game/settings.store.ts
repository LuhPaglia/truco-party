import { Injectable, signal } from '@angular/core';
import type { Difficulty } from '@truco-party/ai';
import { getRuleSet, type ModeId, type TrucoOptions } from '@truco-party/engine';

export interface TableSettings {
  ruleSetId: ModeId;
  difficulty: Difficulty;
  options: TrucoOptions;
}

const STORAGE_KEY = 'truco.settings.v1';

function defaults(): TableSettings {
  return { ruleSetId: 'paulista', difficulty: 'easy', options: { ...getRuleSet('paulista').defaultOptions } };
}

/** Escolhas da tela inicial. Fica salvo só neste navegador (conveniência, não estado de jogo). */
@Injectable({ providedIn: 'root' })
export class SettingsStore {
  readonly settings = signal<TableSettings>(this.load());

  update(patch: Partial<TableSettings>): void {
    this.settings.update((s) => ({ ...s, ...patch }));
    this.save();
  }

  updateOptions(patch: Partial<TrucoOptions>): void {
    this.update({ options: { ...this.settings().options, ...patch } });
  }

  resetOptions(): void {
    this.update({ options: { ...getRuleSet(this.settings().ruleSetId).defaultOptions } });
  }

  private load(): TableSettings {
    const base = defaults();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<TableSettings> | null;
      if (!saved) return base;
      return { ...base, ...saved, ruleSetId: 'paulista', options: { ...base.options, ...saved.options } };
    } catch {
      return base;
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings()));
    } catch {
      // armazenamento indisponível (aba anônima etc.): segue sem salvar
    }
  }
}
