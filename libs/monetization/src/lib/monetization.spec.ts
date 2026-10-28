import { NoopAdProvider } from './monetization';

describe('NoopAdProvider', () => {
  it('nunca concede recompensa', async () => {
    const ads = new NoopAdProvider();
    await ads.initialize();
    await expect(ads.showRewarded('rewarded-cosmetic-trial')).resolves.toEqual({ rewarded: false });
  });
});
