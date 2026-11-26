import { TestBed } from '@angular/core/testing';
import { Subject, Subscription } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActivityEvent } from './activity-event.model';
import { ActivityStreamService } from './activity-stream.service';
import { createDemoEvent, DEMO_FIXTURES } from './demo-fixtures';
import { ErPresenterService } from './er-presenter.service';

describe('ErPresenterService', () => {
  let input: Subject<ActivityEvent>;
  let presenter: ErPresenterService;
  let viewer: Subscription;

  beforeEach(() => {
    vi.useFakeTimers();
    input = new Subject();
    TestBed.configureTestingModule({ providers: [
      { provide: ActivityStreamService, useValue: { events$: input } },
    ] });
    presenter = TestBed.inject(ErPresenterService);
    viewer = presenter.connect();
  });

  afterEach(() => {
    viewer.unsubscribe();
    vi.useRealTimers();
  });

  it('presents success, info and error in order with a 150 ms gap', () => {
    const success = createDemoEvent(DEMO_FIXTURES[0]);
    const info = createDemoEvent(DEMO_FIXTURES[5]);
    const error = createDemoEvent(DEMO_FIXTURES[10]);
    [success, info, error].forEach(event => input.next(event));

    expect(presenter.current()).toBe(success);
    vi.advanceTimersByTime(1799);
    expect(presenter.current()).toBe(success);
    vi.advanceTimersByTime(1);
    expect(presenter.current()).toBeNull();
    vi.advanceTimersByTime(149);
    expect(presenter.current()).toBeNull();
    vi.advanceTimersByTime(1);
    expect(presenter.current()).toBe(info);
    vi.advanceTimersByTime(1400 + 150);
    expect(presenter.current()).toBe(error);
    vi.advanceTimersByTime(2599);
    expect(presenter.current()).toBe(error);
    vi.advanceTimersByTime(1);
    expect(presenter.current()).toBeNull();
  });

  it('shortens a burst when six events are waiting and resets on the last disconnection', () => {
    const events = Array.from({ length: 7 }, () => createDemoEvent(DEMO_FIXTURES[0]));
    events.forEach(event => input.next(event));
    vi.advanceTimersByTime(1800 + 150);
    expect(presenter.current()).toBe(events[1]);
    vi.advanceTimersByTime(899);
    expect(presenter.current()).toBe(events[1]);
    vi.advanceTimersByTime(1);
    expect(presenter.current()).toBeNull();
    vi.advanceTimersByTime(75);
    expect(presenter.current()).toBe(events[2]);
    viewer.unsubscribe();
    vi.advanceTimersByTime(5000);
    expect(presenter.current()).toBeNull();
  });
});
