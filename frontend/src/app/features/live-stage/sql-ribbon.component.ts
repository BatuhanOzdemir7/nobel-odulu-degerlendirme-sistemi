import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivityStreamService } from '../../core/events/activity-stream.service';

@Component({
  selector: 'app-sql-ribbon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol aria-label="Son SQL olayları" role="log">
      @for (event of recent(); track event.eventId) {
        <li [class]="event.erHighlight.severity"><code>{{ event.sqlSummary }}</code></li>
      } @empty {
        <li class="empty">Henüz olay yok.</li>
      }
    </ol>
  `,
  styles: `
    ol { display: grid; gap: .4rem; padding: 0; margin: 0; list-style: none; }
    li { color: #d7e7e1; overflow-wrap: anywhere; }
    .success { color: #f3d99b; }
    .info, .empty { color: #b0c6bf; }
    .error { color: #ffb0a9; }
    .empty { padding: 0; text-align: left; }
  `,
})
export class SqlRibbonComponent {
  protected readonly recent = inject(ActivityStreamService).recent;
}
