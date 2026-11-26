import { ApplicationRef, EnvironmentInjector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { ActivityStreamService } from '../../../../core/events/activity-stream.service';
import type { StageCharacterCommand } from '../../stage/stage.contract';
import { NobelCharacterAdapter } from './nobel-character.adapter';
import { NobelStageComponent } from './nobel-stage.component';

describe('NobelCharacterAdapter', () => {
  it('mounts one host, forwards scene commands, and detaches and destroys the view', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: ActivityStreamService, useValue: { recent: signal([]) } }],
    });
    const application = TestBed.inject(ApplicationRef);
    const initialViews = application.viewCount;
    const adapter = new NobelCharacterAdapter(TestBed.inject(EnvironmentInjector));
    const host = document.createElement('div');
    const play = vi.spyOn(NobelStageComponent.prototype, 'play');
    const destroy = vi.spyOn(NobelStageComponent.prototype, 'ngOnDestroy');
    const command: StageCharacterCommand = {
      scene: 'CONSTRAINT_ERROR', eventId: 'evt-1', severity: 'error', message: 'En az 3 uzman gerekli!',
    };

    try {
      adapter.mount(host);
      const child = host.firstElementChild;
      adapter.mount(host);
      expect(host.childElementCount).toBe(1);
      expect(host.firstElementChild).toBe(child);
      expect(application.viewCount).toBe(initialViews + 1);

      adapter.play(command);
      expect(play).toHaveBeenCalledExactlyOnceWith(command);
      adapter.destroy();
      adapter.destroy();
      expect(destroy).toHaveBeenCalledOnce();
      expect(host.childElementCount).toBe(0);
      expect(application.viewCount).toBe(initialViews);
    } finally {
      adapter.destroy();
      vi.restoreAllMocks();
    }
  });
});
