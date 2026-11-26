import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TRACKING, DEFAULT_TUNING } from './character-assets.config';
import { CharacterInteractionController } from './character-interaction.controller';

describe('CharacterInteractionController scene inputs', () => {
  afterEach(() => vi.useRealTimers());

  it('clears timed emotes, releases a scripted gaze and ends startle', () => {
    vi.useFakeTimers();
    const root = document.createElement('div');
    const controller = new CharacterInteractionController({
      root,
      timing: DEFAULT_TUNING.timing,
      tracking: { ...DEFAULT_TRACKING, pointer: false, fields: false, idleSleep: false },
    });
    try {
      const dispatch = vi.spyOn(controller, 'dispatch');
      controller.lookAt({ x: 22, y: 34 });
      expect(controller.snapshot.pointer).toEqual({ x: 22, y: 34 });
      controller.lookAt(null);
      expect(dispatch).toHaveBeenLastCalledWith({ type: 'pointer-leave' });
      expect(controller.snapshot.pointer).toBeNull();

      controller.emote('stern', 300);
      vi.advanceTimersByTime(299);
      expect(controller.snapshot.emote).toBe('stern');
      vi.advanceTimersByTime(1);
      expect(controller.snapshot.emote).toBeNull();

      controller.emote('sad', 200);
      controller.emote('cheer');
      vi.advanceTimersByTime(201);
      expect(controller.snapshot.emote).toBe('cheer');
      controller.startle();
      expect(controller.snapshot.expression).toBe('startled');
      vi.advanceTimersByTime(DEFAULT_TUNING.timing.startleMs);
      expect(controller.snapshot.expression).toBe('cheer');
    } finally {
      controller.destroy();
    }
    expect(vi.getTimerCount()).toBe(0);
  });
});
