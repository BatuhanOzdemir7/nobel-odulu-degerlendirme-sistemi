import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { NobelStageComponent } from './nobel-stage.component';

describe('NobelStageComponent', () => {
  it('renders actor, podium, table and banner, and resolves finite viewport targets', () => {
    const fixture = TestBed.createComponent(NobelStageComponent);
    const component = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    fixture.detectChanges();
    component.play({
      scene: 'NOMINATION', severity: 'success', eventId: 'evt-1', organizationLabel: 'CERN',
      candidateName: 'Selin', awardLabel: 'Fizik Ödülü', categoryLabel: 'Fizik', newAccount: true,
    });
    fixture.detectChanges();
    expect(root.querySelector('[data-actor-id="org"]')).not.toBeNull();
    expect(root.querySelector('.podium')?.textContent).toContain('Fizik Ödülü');
    const eyeTarget = component.centerOf('actor:org');
    expect(eyeTarget && [eyeTarget.x, eyeTarget.y].every(Number.isFinite)).toBe(true);
    expect(component.centerOf('actor:unknown')).toBeNull();

    component.director.backdrop.set('committee');
    component.director.banner.set({ tone: 'info', text: 'İki oy' });
    component.director.pips.set({ cast: 2, required: 3 });
    fixture.detectChanges();
    expect(root.querySelector('.table')).not.toBeNull();
    expect(root.querySelector('.table__count')?.textContent).toBe('2/3');
    expect(root.querySelector('.banner')?.textContent).toContain('İki oy');
    fixture.destroy();
  });
});
