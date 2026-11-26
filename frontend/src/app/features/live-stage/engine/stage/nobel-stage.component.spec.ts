import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActivityEvent } from '../../../../core/events/activity-event.model';
import { ActivityStreamService, stageCommandFor } from '../../../../core/events/activity-stream.service';
import { createDemoEvent, DEMO_FIXTURES } from '../../../../core/events/demo-fixtures';
import { NobelStageComponent } from './nobel-stage.component';

describe('NobelStageComponent', () => {
  let recent: WritableSignal<readonly ActivityEvent[]>;

  beforeEach(() => {
    recent = signal([]);
    TestBed.configureTestingModule({
      providers: [{ provide: ActivityStreamService, useValue: { recent } }],
    });
  });

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

  it('plays the latest animated history once and lets the viewer replay it on demand', async () => {
    const fixture = TestBed.createComponent(NobelStageComponent);
    const component = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    const play = vi.spyOn(component.director, 'play').mockImplementation(() => {});
    fixture.detectChanges();
    expect(root.querySelector('.replay-controls')).toBeNull();
    const decision = createDemoEvent(DEMO_FIXTURES[2]);
    recent.set([createDemoEvent(DEMO_FIXTURES[1]), decision, createDemoEvent(DEMO_FIXTURES[3])]);
    await fixture.whenStable();

    const command = stageCommandFor(decision)!;
    expect(play).toHaveBeenCalledExactlyOnceWith(command);
    component.play(command);
    expect(play).toHaveBeenCalledTimes(1);

    const replay = root.querySelector<HTMLButtonElement>('.replay-controls button')!;
    replay.click();
    expect(play).toHaveBeenCalledTimes(2);
    component.director.playing.set(true);
    await fixture.whenStable();
    expect(replay.disabled).toBe(true);
  });

  it('keeps a live scene when the history request arrives after it', async () => {
    const fixture = TestBed.createComponent(NobelStageComponent);
    const component = fixture.componentInstance;
    const play = vi.spyOn(component.director, 'play').mockImplementation(() => {});
    fixture.detectChanges();
    const live = stageCommandFor(createDemoEvent(DEMO_FIXTURES[1]))!;
    component.play(live);
    recent.set([createDemoEvent(DEMO_FIXTURES[2])]);
    await fixture.whenStable();
    expect(play).toHaveBeenCalledExactlyOnceWith(live);
  });
});
