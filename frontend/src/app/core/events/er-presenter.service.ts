import { inject, Injectable, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import type { ActivityEvent, EventSeverity } from './activity-event.model';
import { ActivityStreamService } from './activity-stream.service';

const durations: Record<EventSeverity, number> = { success: 1800, info: 1400, error: 2600 };
const GAP = 150;

@Injectable({ providedIn: 'root' })
export class ErPresenterService {
  private readonly stream = inject(ActivityStreamService);
  private readonly queue: ActivityEvent[] = [];
  private readonly active = signal<ActivityEvent | null>(null);
  private timer?: ReturnType<typeof setTimeout>;
  private input?: Subscription;
  private viewers = 0;

  readonly current = this.active.asReadonly();

  connect(): Subscription {
    if (++this.viewers === 1) {
      this.input = this.stream.events$.subscribe(event => {
        this.queue.push(event);
        if (this.timer === undefined) this.showNext();
      });
    }

    return new Subscription(() => {
      if (--this.viewers !== 0) return;
      this.input?.unsubscribe();
      this.input = undefined;
      clearTimeout(this.timer);
      this.timer = undefined;
      this.queue.length = 0;
      this.active.set(null);
    });
  }

  private showNext(): void {
    const fast = this.queue.length > 5;
    const event = this.queue.shift();
    if (!event) {
      this.timer = undefined;
      return;
    }

    this.active.set(event);
    const speed = fast ? 2 : 1;
    this.timer = setTimeout(() => {
      this.active.set(null);
      this.timer = setTimeout(() => this.showNext(), GAP / speed);
    }, durations[event.erHighlight.severity] / speed);
  }
}
