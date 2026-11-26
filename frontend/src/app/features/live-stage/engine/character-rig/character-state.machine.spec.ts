import { describe, expect, it } from 'vitest';
import { INITIAL_CHARACTER_STATE, reduceCharacter } from './character-state.machine';

describe('Character emote state', () => {
  it('orders sneezing, startle and emote above the normal expression', () => {
    const emote = reduceCharacter(INITIAL_CHARACTER_STATE, { type: 'emote', emote: 'puzzled' });
    expect(emote.expression).toBe('puzzled');
    const startled = reduceCharacter(emote, { type: 'startle' });
    expect(startled.expression).toBe('startled');
    const sneezing = reduceCharacter(startled, { type: 'sneeze' });
    expect(sneezing.expression).toBe('sneezing');
    const afterSneeze = reduceCharacter(sneezing, { type: 'sneeze-end' });
    expect(afterSneeze.expression).toBe('startled');
    const afterStartle = reduceCharacter(afterSneeze, { type: 'startle-end' });
    expect(afterStartle.expression).toBe('puzzled');
    expect(reduceCharacter(afterStartle, { type: 'emote', emote: null }).expression).toBe('neutral');
  });

  it('keeps a sleeping character asleep and retains the original activities', () => {
    const emote = reduceCharacter(INITIAL_CHARACTER_STATE, { type: 'emote', emote: 'cheer' });
    const sleeping = reduceCharacter(emote, { type: 'sleep' });
    expect(sleeping.expression).toBe('asleep');
    expect(reduceCharacter(sleeping, { type: 'startle' })).toBe(sleeping);
    for (const activity of ['none', 'pushing', 'hauling'] as const) {
      expect(reduceCharacter(INITIAL_CHARACTER_STATE, { type: 'set-activity', activity }).activity).toBe(activity);
    }
  });
});
