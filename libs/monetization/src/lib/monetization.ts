/**
 * Contrato único de anúncios. O jogo só conhece esta interface; as implementações
 * (AdSense for Games na web, AdMob via Capacitor no mobile) entram na Fase 1/2.
 * Regra de produto: intersticial só entre partidas, nunca no meio de uma mão.
 */
export type AdPlacement = 'between-games' | 'rewarded-cosmetic-trial';

export interface RewardedResult {
  readonly rewarded: boolean;
}

export interface AdProvider {
  initialize(): Promise<void>;
  showInterstitial(placement: AdPlacement): Promise<void>;
  showRewarded(placement: AdPlacement): Promise<RewardedResult>;
}

/** Usado em desenvolvimento, testes e quando o usuário não consentiu anúncios. */
export class NoopAdProvider implements AdProvider {
  async initialize(): Promise<void> {
    // nada a inicializar
  }
  async showInterstitial(): Promise<void> {
    // sem anúncio
  }
  async showRewarded(): Promise<RewardedResult> {
    return { rewarded: false };
  }
}
