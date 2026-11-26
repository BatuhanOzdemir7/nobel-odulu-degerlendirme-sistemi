import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StageCharacterCommand } from '../../features/live-stage/stage/stage.contract';
import { API_BASE_URL } from '../services/api-url';
import type { ActivityEvent } from './activity-event.model';
import { ACTIVITY_EVENT_SOURCE_FACTORY, ActivityStreamService } from './activity-stream.service';
import { createDemoEvent, DEMO_FIXTURES } from './demo-fixtures';

class FakeSource extends EventTarget {
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  close = vi.fn();

  send(event: ActivityEvent | string): void {
    this.dispatchEvent(new MessageEvent('activity', { data: typeof event === 'string' ? event : JSON.stringify(event) }));
  }
}

describe('ActivityStreamService', () => {
  let source: FakeSource;
  let factory: ReturnType<typeof vi.fn>;
  let service: ActivityStreamService;
  let http: HttpTestingController;
  const nomination = { ...createDemoEvent(DEMO_FIXTURES[0]), eventId: 'evt-2' };
  const registry = { ...createDemoEvent(DEMO_FIXTURES[3]), eventId: 'evt-3' };

  beforeEach(() => {
    source = new FakeSource();
    factory = vi.fn(() => source);
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: ACTIVITY_EVENT_SOURCE_FACTORY, useValue: factory },
    ] });
    service = TestBed.inject(ActivityStreamService);
    http = TestBed.inject(HttpTestingController);
  });

  it('shares a lazy connection, deduplicates reconnects and closes when the last subscriber leaves', () => {
    expect(factory).not.toHaveBeenCalled();
    const events: ActivityEvent[] = [];
    const commands: StageCharacterCommand[] = [];
    const eventsSubscription = service.events$.subscribe(event => events.push(event));
    const stageSubscription = service.stageCommands$.subscribe(command => commands.push(command));
    expect(factory).toHaveBeenCalledExactlyOnceWith(API_BASE_URL + '/events/stream');
    expect(service.status()).toBe('connecting');
    source.onopen?.(new Event('open'));
    expect(service.status()).toBe('open');

    const recent = http.expectOne(API_BASE_URL + '/events/recent?limit=3');
    expect(recent.request.headers.has('Authorization')).toBe(false);
    recent.flush([{ ...registry, eventId: 'evt-1' }, nomination]);
    expect(events).toEqual([]);
    expect(commands).toEqual([]);
    expect(service.recent().map(event => event.eventId)).toEqual(['evt-1', 'evt-2']);

    source.send(nomination);
    source.onerror?.(new Event('error'));
    expect(service.status()).toBe('reconnecting');
    source.send(nomination);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      source.send('{bad-json');
      expect(warning).toHaveBeenCalledOnce();
    } finally {
      warning.mockRestore();
    }
    source.send(registry);
    source.onopen?.(new Event('open'));
    expect(service.status()).toBe('open');
    expect(events).toEqual([nomination, registry]);
    expect(commands).toEqual([{ ...nomination.stageCue, eventId: 'evt-2', severity: 'success' }]);
    expect(service.recent().map(event => event.eventId)).toEqual(['evt-1', 'evt-2', 'evt-3']);

    eventsSubscription.unsubscribe();
    expect(source.close).not.toHaveBeenCalled();
    stageSubscription.unsubscribe();
    expect(source.close).toHaveBeenCalledOnce();
    expect(service.status()).toBe('closed');
    http.verify();
  });

  it('merges a late initial snapshot without duplicating live entries or issuing a stage command for history', () => {
    const commands: StageCharacterCommand[] = [];
    const subscription = service.stageCommands$.subscribe(command => commands.push(command));
    source.send(nomination);
    http.expectOne(API_BASE_URL + '/events/recent?limit=3').flush([nomination, registry]);
    expect(service.recent().map(event => event.eventId)).toEqual(['evt-2', 'evt-3']);
    source.send(registry);
    expect(service.recent().map(event => event.eventId)).toEqual(['evt-2', 'evt-3']);
    const demo = createDemoEvent(DEMO_FIXTURES[0]);
    service.inject(demo);
    service.inject(demo);
    expect(commands.map(command => command.eventId)).toEqual(['evt-2', demo.eventId]);
    subscription.unsubscribe();
    http.verify();
  });
});
