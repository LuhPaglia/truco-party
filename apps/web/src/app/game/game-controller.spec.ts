import { TestBed } from '@angular/core/testing';
import { GameController } from './game-controller';

describe('GameController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [GameController] });
  });

  afterEach(() => vi.useRealTimers());

  /** Joga como humano sempre a primeira opção razoável e deixa os bots fazerem o resto. */
  function playUntilMatchOver(game: GameController): void {
    for (let step = 0; step < 2000; step++) {
      const v = game.view();
      if (v.phase === 'matchOver') return;
      if (game.canAct()) {
        switch (v.phase) {
          case 'elevenDecision':
            game.elevenPlay();
            break;
          case 'betPending':
            game.accept();
            break;
          case 'playing':
            game.play(0);
            break;
          case 'handOver':
            game.nextHand();
            break;
          case 'gameOver':
            void game.nextGame();
            break;
        }
      }
      vi.advanceTimersByTime(2000);
    }
    throw new Error('a disputa não terminou');
  }

  it('leva uma disputa completa até o fim com os bots', () => {
    const game = TestBed.inject(GameController);
    playUntilMatchOver(game);
    expect(game.view().matchWinner).not.toBeNull();
  });

  it('o jogador sempre começa a primeira mão', () => {
    const game = TestBed.inject(GameController);
    expect(game.view().currentSeat).toBe(0);
    expect(game.canAct()).toBe(true);
  });

  it('ignora ações fora da vez', () => {
    const game = TestBed.inject(GameController);
    game.play(0);
    const after = game.view();
    game.play(0);
    expect(game.view()).toBe(after);
  });
});
