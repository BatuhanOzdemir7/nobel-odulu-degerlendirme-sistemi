import { HttpBackend, HttpClient } from '@angular/common/http';
import { inject, Injectable, InjectionToken, isDevMode, signal } from '@angular/core';
import { filter, map, Observable, Subject, Subscription } from 'rxjs';
import type { StageCharacterCommand } from '../../features/live-stage/stage/stage.contract';
import { API_BASE_URL } from '../services/api-url';
import type { ActivityEvent } from './activity-event.model';

const EVENTS_URL = API_BASE_URL + '/events';

export type ActivityStreamStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';
export type ActivityEventSource = Pick<EventSource, 'addEventListener' | 'close' | 'onopen' | 'onerror'>;
export const ACTIVITY_EVENT_SOURCE_FACTORY = new InjectionToken<(url: string) => ActivityEventSource>(
  'ACTIVITY_EVENT_SOURCE_FACTORY',
  { providedIn: 'root', factory: () => url => new EventSource(url) },
);

const statusLabels: Record<ActivityStreamStatus, string> = {
  connecting: 'Bağlanıyor',
  open: 'Canlı',
  reconnecting: 'Yeniden bağlanıyor',
  closed: 'Bağlantı kapalı',
};

export function activityStatusLabel(status: ActivityStreamStatus): string {
  return statusLabels[status];
}

@Injectable({ providedIn: 'root' })
export class ActivityStreamService {
  private readonly createSource = inject(ACTIVITY_EVENT_SOURCE_FACTORY);
  // The public feed should not send a JWT or trigger session navigation on HTTP errors.
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly incoming = new Subject<ActivityEvent>();
  private readonly connectionStatus = signal<ActivityStreamStatus>('closed');
  private readonly recentEvents = signal<readonly ActivityEvent[]>([]);
  private readonly demoIds = new Set<string>();
  private lastServerSequence = 0n;
  private subscribers = 0;
  private source?: ActivityEventSource;
  private prefill?: Subscription;

  readonly status = this.connectionStatus.asReadonly();
  readonly recent = this.recentEvents.asReadonly();
  readonly events$ = new Observable<ActivityEvent>(observer => {
    const subscription = this.incoming.subscribe(observer);
    if (++this.subscribers === 1) this.connect();
    return () => {
      subscription.unsubscribe();
      if (--this.subscribers === 0) this.disconnect();
    };
  });

  readonly stageCommands$ = this.events$.pipe(
    map((event): StageCharacterCommand | undefined => event.stageCue
      ? { ...event.stageCue, eventId: event.eventId, severity: event.erHighlight.severity }
      : undefined),
    filter((command): command is StageCharacterCommand => command !== undefined),
  );

  inject(event: ActivityEvent): void {
    if (!isDevMode() || this.demoIds.has(event.eventId)) return;
    this.demoIds.add(event.eventId);
    this.accept(event);
  }

  private connect(): void {
    this.connectionStatus.set('connecting');
    try {
      const source = this.createSource(EVENTS_URL + '/stream');
      this.source = source;
      source.onopen = () => {
        if (this.source === source) this.connectionStatus.set('open');
      };
      source.onerror = () => {
        if (this.source === source) this.connectionStatus.set('reconnecting');
      };
      source.addEventListener('activity', (message: Event) => {
        if (this.source === source) this.onMessage((message as MessageEvent<string>).data);
      });
    } catch {
      this.connectionStatus.set('closed');
    }
    this.prefill = this.http.get<ActivityEvent[]>(EVENTS_URL + '/recent?limit=3').subscribe({
      next: events => this.recentEvents.update(current =>
        current.reduce((history, event) => this.mergeRecent(history, event), events.slice(-3))),
      error: () => { /* The stream can still populate the ribbon. */ },
    });
  }

  private disconnect(): void {
    const source = this.source;
    this.source = undefined;
    source?.close();
    this.prefill?.unsubscribe();
    this.prefill = undefined;
    this.connectionStatus.set('closed');
  }

  private onMessage(data: string): void {
    try {
      const event = JSON.parse(data) as ActivityEvent;
      const sequence = this.sequence(event?.eventId);
      if (sequence === undefined || sequence <= this.lastServerSequence
        || typeof event.sqlSummary !== 'string'
        || !Array.isArray(event.erHighlight?.nodes) || !Array.isArray(event.erHighlight?.edges)
        || !(['success', 'info', 'error'] as const).includes(event.erHighlight.severity)) return;
      this.lastServerSequence = sequence;
      this.accept(event);
    } catch {
      if (isDevMode()) console.warn('Canlı olay ayrıştırılamadı.');
    }
  }

  private accept(event: ActivityEvent): void {
    this.recentEvents.update(recent => this.mergeRecent(recent, event));
    this.incoming.next(event);
  }

  private mergeRecent(recent: readonly ActivityEvent[], event: ActivityEvent): ActivityEvent[] {
    const existing = recent.findIndex(item => item.eventId === event.eventId);
    const sequence = this.sequence(event.eventId);
    // The snapshot can already contain an event that is still in transit on the live connection.
    const next = sequence === undefined ? -1 : recent.findIndex(item => (this.sequence(item.eventId) ?? 0n) > sequence);
    const entries = [...recent];
    if (existing >= 0) entries[existing] = event;
    else entries.splice(next < 0 ? entries.length : next, 0, event);
    return entries.slice(-3);
  }

  private sequence(eventId: unknown): bigint | undefined {
    return typeof eventId === 'string' && /^evt-\d+$/.test(eventId)
      ? BigInt(eventId.slice(4)) : undefined;
  }
}
