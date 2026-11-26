import type { CharacterActivity, CharacterConfigInput, CharacterEmote, Vec2 } from '../character-rig';
import type { VoteValue } from '../../stage/stage.contract';

export type ActorRole = 'KURULUS' | 'ADAY' | 'UZMAN' | 'GUARD';
export type PropKind = 'envelope' | 'vote-card' | 'gavel' | 'shield' | 'medal' | 'cloud';
export type Backdrop = 'empty' | 'nomination' | 'committee';

export interface MemberRef { readonly expertId: number; readonly label: string; }
export interface ActorProp { readonly kind: PropKind; readonly variant?: VoteValue; }
export interface Banner { readonly text: string; readonly sub?: string; readonly tone: 'info' | 'success' | 'warn' | 'error'; }
export interface Flight { readonly rev: number; readonly from: Vec2; readonly to: Vec2; }

export interface ActorState {
  readonly id: string;
  readonly role: ActorRole;
  readonly label: string;
  /** Sahne yüzdesi; ayak ucu (alt-orta) bu noktaya oturur. */
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly z: number;
  readonly moveMs: number;
  readonly hopping: boolean;
  readonly config: CharacterConfigInput;
  readonly activity: CharacterActivity;
  readonly emote: CharacterEmote | null;
  /** 'actor:<id>' | 'prop:podium' | 'prop:table' | 'edge:right' */
  readonly gazeRef: string | null;
  readonly gazeTarget: Vec2 | null | undefined;
  readonly startleRevision: number;
  readonly talkRevision: number;
  readonly bubble: string | null;
  readonly props: readonly ActorProp[];
  readonly tableCard: VoteValue | null;
}
