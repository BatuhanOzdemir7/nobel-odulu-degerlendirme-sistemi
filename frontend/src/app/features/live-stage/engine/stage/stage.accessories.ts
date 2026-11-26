import type { AccessoryId, CharacterConfigInput } from '../character-rig';
import type { ActorRole } from './stage.models';

export type LookPhase = 'base' | 'delivering' | 'onboarding' | 'rejected';
const BASE: readonly AccessoryId[] = ['beard', 'mustache'];
const UNIFORM: readonly AccessoryId[] = ['hard-hat', 'blue-collar'];

export function accessoriesFor(role: ActorRole, phase: LookPhase = 'base'): readonly AccessoryId[] {
  if (role === 'GUARD') return [...BASE, ...UNIFORM];
  switch (phase) {
    case 'delivering': return role === 'KURULUS' ? [...BASE, ...UNIFORM] : BASE;
    case 'onboarding': return role === 'ADAY' ? [...BASE, 'hard-hat'] : BASE;
    case 'rejected': return ['eyebags', ...BASE];
    default: return BASE;
  }
}

/** Sahne aktörleri etkileşimsizdir: pencere fare/alan takibi ve uyku kapalı, bakış programatiktir. */
export function rigConfig(accessories: readonly AccessoryId[]): CharacterConfigInput {
  return {
    view: 'full',
    accessories,
    assetBase: 'assets/characters/',
    tracking: { pointer: false, fields: false, idleSleep: false },
  };
}
