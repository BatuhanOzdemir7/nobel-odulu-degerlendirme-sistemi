import { describe, expect, it } from 'vitest';
import { accessoriesFor, rigConfig, type LookPhase } from './stage.accessories';
import type { ActorRole } from './stage.models';

describe('Stage accessories', () => {
  it('applies the phase accessories for each role', () => {
    const phases: readonly LookPhase[] = ['base', 'delivering', 'onboarding', 'rejected'];
    const roles: readonly ActorRole[] = ['KURULUS', 'ADAY', 'UZMAN', 'GUARD'];
    const base = ['beard', 'mustache'];
    const uniform = [...base, 'hard-hat', 'blue-collar'];
    const rejected = ['eyebags', ...base];
    const expected = [
      [base, uniform, base, rejected],
      [base, base, [...base, 'hard-hat'], rejected],
      [base, base, base, rejected],
      [uniform, uniform, uniform, uniform],
    ];

    roles.forEach((role, row) => phases.forEach((phase, col) => {
      expect(accessoriesFor(role, phase)).toEqual(expected[row][col]);
    }));
    expect(rigConfig(accessoriesFor('GUARD'))).toMatchObject({
      assetBase: 'assets/characters/',
      tracking: { pointer: false, fields: false, idleSleep: false },
    });
  });
});
