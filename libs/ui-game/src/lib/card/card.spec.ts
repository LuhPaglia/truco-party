import { TestBed } from '@angular/core/testing';
import { parseCard } from '@truco-party/engine';
import { CardView } from './card';

describe('CardView', () => {
  it('mostra rank e naipe, e marca copas/ouros em vermelho', async () => {
    const fixture = TestBed.createComponent(CardView);
    fixture.componentRef.setInput('card', parseCard('7c'));
    fixture.componentRef.setInput('manilha', true);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('7');
    expect(el.textContent).toContain('♥');
    expect(el.classList).toContain('red');
    expect(el.getAttribute('aria-label')).toBe('7♥ (manilha)');
  });

  it('sem carta mostra o verso', async () => {
    const fixture = TestBed.createComponent(CardView);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).classList).toContain('back');
  });
});
