import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { CharacterInteractionController } from './character-interaction.controller';
import { CharacterRigComponent } from './character-rig.component';

describe('CharacterRigComponent scene inputs', () => {
  it('forwards gaze, emote and revision inputs after connecting the controller', async () => {
    const gaze = vi.spyOn(CharacterInteractionController.prototype, 'lookAt');
    const emote = vi.spyOn(CharacterInteractionController.prototype, 'emote');
    const startle = vi.spyOn(CharacterInteractionController.prototype, 'startle');
    const speak = vi.spyOn(CharacterInteractionController.prototype, 'speak');
    const fixture = TestBed.createComponent(CharacterRigComponent);
    try {
      fixture.componentRef.setInput('config', { tracking: { pointer: false, fields: false, idleSleep: false } });
      fixture.componentRef.setInput('gazeTarget', { x: 12, y: 34 });
      fixture.componentRef.setInput('emote', 'stern');
      fixture.componentRef.setInput('startleRevision', 1);
      fixture.componentRef.setInput('talkRevision', 1);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(gaze).toHaveBeenCalledWith({ x: 12, y: 34 });
      expect(emote).toHaveBeenCalledWith('stern');
      expect(startle).toHaveBeenCalledOnce();
      expect(speak).toHaveBeenCalledOnce();

      fixture.componentRef.setInput('gazeTarget', null);
      fixture.componentRef.setInput('startleRevision', 2);
      fixture.componentRef.setInput('talkRevision', 2);
      fixture.detectChanges();
      expect(gaze).toHaveBeenLastCalledWith(null);
      expect(startle).toHaveBeenCalledTimes(2);
      expect(speak).toHaveBeenCalledTimes(2);
    } finally {
      fixture.destroy();
      vi.restoreAllMocks();
    }
  });
});
