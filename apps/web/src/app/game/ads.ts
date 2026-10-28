import { InjectionToken } from '@angular/core';
import { NoopAdProvider, type AdProvider } from '@truco-party/monetization';

/** Trocar pela implementação de AdSense for Games (web) / AdMob (Capacitor) quando houver conta aprovada. */
export const AD_PROVIDER = new InjectionToken<AdProvider>('AD_PROVIDER', {
  providedIn: 'root',
  factory: () => new NoopAdProvider(),
});
