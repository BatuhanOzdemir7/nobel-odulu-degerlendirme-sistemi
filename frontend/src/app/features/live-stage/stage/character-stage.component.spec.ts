import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ActivityStreamService } from '../../../core/events/activity-stream.service';
import { CharacterStageComponent } from './character-stage.component';
import { NoopStageAdapter } from './noop-stage.adapter';
import { STAGE_ADAPTER_FACTORY, StageCharacterCommand } from './stage.contract';

const command: StageCharacterCommand = {
  eventId: 'evt-1', severity: 'success', scene: 'COMMITTEE_VOTE', committeeId: 1, committeeLabel: 'Fizik Komitesi',
  expertId: 2, expertLabel: 'İlker Kaya', candidateName: 'Selin Arslan', vote: 'KABUL', votesCast: 1,
  votesRequired: 3, members: [{ expertId: 2, label: 'İlker Kaya' }], votes: [{ expertId: 2, vote: 'KABUL' }],
};

describe('CharacterStageComponent', () => {
  it('mounts one adapter per component, forwards commands and releases subscriptions on destroy', () => {
    const commands = new Subject<StageCharacterCommand>();
    const factory = vi.fn(() => ({ mount: vi.fn(), play: vi.fn(), destroy: vi.fn() }));
    TestBed.configureTestingModule({ providers: [
      { provide: ActivityStreamService, useValue: { stageCommands$: commands } },
      { provide: STAGE_ADAPTER_FACTORY, useValue: factory },
    ] });
    const stage = TestBed.createComponent(CharacterStageComponent);
    const dock = TestBed.createComponent(CharacterStageComponent);
    stage.detectChanges();
    dock.detectChanges();
    const first = factory.mock.results[0].value;
    const second = factory.mock.results[1].value;

    expect(factory).toHaveBeenCalledTimes(2);
    expect(first.mount).toHaveBeenCalledWith(stage.nativeElement.querySelector('.character-stage'));
    expect(second.mount).toHaveBeenCalledWith(dock.nativeElement.querySelector('.character-stage'));
    commands.next(command);
    expect(first.play).toHaveBeenCalledWith(command);
    expect(second.play).toHaveBeenCalledWith(command);

    stage.destroy();
    commands.next(command);
    expect(first.play).toHaveBeenCalledTimes(1);
    expect(first.destroy).toHaveBeenCalledOnce();
    expect(second.play).toHaveBeenCalledTimes(2);
    dock.destroy();
    expect(second.destroy).toHaveBeenCalledOnce();
  });

  it('shows the NoopStageAdapter note and text summary, then clears its container', () => {
    const host = document.createElement('div');
    const adapter = new NoopStageAdapter();
    adapter.mount(host);
    adapter.play(command);
    expect(host.textContent).toContain("Karakter sahnesi Faz 3B'de bağlanacak");
    expect(host.querySelector('li')?.textContent).toContain('COMMITTEE_VOTE · İlker Kaya · Selin Arslan · KABUL');
    adapter.destroy();
    expect(host.childElementCount).toBe(0);
  });
});
