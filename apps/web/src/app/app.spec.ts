import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { HomePage } from './home/home';

describe('App', () => {
  it('cria o app', () => {
    TestBed.configureTestingModule({ imports: [App], providers: [provideRouter([])] });
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });

  it('a tela inicial lista as modalidades, com só o Paulista disponível', async () => {
    TestBed.configureTestingModule({ imports: [HomePage], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(HomePage);
    await fixture.whenStable();
    const modes = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.modes .choice'));
    expect(modes.map((b) => b.disabled)).toEqual([false, true, true]);
  });
});
