export type ActivityAction =
  | 'NOMINATION_CREATED' | 'EXPERT_VOTED' | 'DECISION_FINALIZED'
  | 'REGISTRY_CREATED' | 'REGISTRY_UPDATED' | 'REGISTRY_DELETED'
  | 'COMMITTEE_CREATED' | 'COMMITTEE_DELETED' | 'COMMITTEE_MEMBER_ADDED' | 'COMMITTEE_MEMBER_REMOVED'
  | 'CONSTRAINT_VIOLATION';

export type ActorRole = 'ADMIN' | 'KURULUS' | 'ADAY' | 'UZMAN' | 'SYSTEM';
export type EventSeverity = 'success' | 'info' | 'error';
export type VoteValue = 'KABUL' | 'RED' | 'INCELEMEDE';

export interface ErHighlight {
  readonly nodes: readonly string[];
  readonly edges: readonly string[];
  readonly severity: EventSeverity;
}

export interface StageMember {
  readonly expertId: number;
  readonly label: string;
}

export interface StageVote {
  readonly expertId: number;
  readonly vote: VoteValue;
}

export type StageCue =
  | {
      readonly scene: 'NOMINATION';
      readonly organizationLabel: string;
      readonly candidateName: string;
      readonly awardLabel: string;
      readonly categoryLabel: string;
      readonly newAccount: boolean;
    }
  | {
      readonly scene: 'COMMITTEE_VOTE';
      readonly committeeId: number;
      readonly committeeLabel: string;
      readonly expertId: number;
      readonly expertLabel: string;
      readonly candidateName: string;
      readonly vote: VoteValue;
      readonly votesCast: number;
      readonly votesRequired: number;
      readonly members: readonly StageMember[];
      readonly votes: readonly StageVote[];
    }
  | {
      readonly scene: 'DECISION_FINALIZED';
      readonly committeeId: number;
      readonly committeeLabel: string;
      readonly candidateName: string;
      readonly result: VoteValue;
      readonly tally: { readonly kabul: number; readonly red: number; readonly incelemede: number };
      readonly members: readonly StageMember[];
    }
  | {
      readonly scene: 'CONSTRAINT_ERROR';
      readonly message: string;
      readonly committeeId?: number;
      readonly committeeLabel?: string;
      readonly memberCount?: number;
      readonly expertLabel?: string;
      readonly members?: readonly StageMember[];
    };

export interface ActivityEvent {
  readonly eventId: string;
  readonly timestamp: string;
  readonly action: ActivityAction;
  readonly actorRole: ActorRole;
  readonly actorLabel: string;
  readonly sqlSummary: string;
  readonly erHighlight: ErHighlight;
  readonly stageCue?: StageCue | null;
}
