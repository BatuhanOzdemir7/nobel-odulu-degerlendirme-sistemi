import { InjectionToken } from '@angular/core';
import type { StageCue } from '../../../core/events/activity-event.model';
import { NoopStageAdapter } from './noop-stage.adapter';

export type StageScene = 'IDLE' | 'NOMINATION' | 'COMMITTEE_VOTE' | 'DECISION_FINALIZED' | 'CONSTRAINT_ERROR';
export type VoteValue = 'KABUL' | 'RED' | 'INCELEMEDE';
/** StageCue'nun (sunucu) birebir yansıması + eventId + severity; scene ayırıcılı birleşim tipi. */
export type StageCharacterCommand = StageCue & { readonly eventId: string; readonly severity: 'success' | 'info' | 'error' };
export interface PortfolioStageAdapter {
  mount(container: HTMLElement): void;
  play(command: StageCharacterCommand): void;
  destroy(): void;
}
/** Her sahne bileşeni kendi adaptör örneğini ister (dock + sayfa aynı anda açık olabilir). */
export const STAGE_ADAPTER_FACTORY = new InjectionToken<() => PortfolioStageAdapter>('STAGE_ADAPTER_FACTORY', {
  providedIn: 'root',
  factory: () => () => new NoopStageAdapter(),
});
