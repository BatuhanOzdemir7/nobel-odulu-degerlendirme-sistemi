import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, isDevMode } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { activityStatusLabel, ActivityStreamService } from '../../core/events/activity-stream.service';
import { createDemoEvent, DEMO_FIXTURES } from '../../core/events/demo-fixtures';
import { ErPresenterService } from '../../core/events/er-presenter.service';
import { ErLiveMapComponent } from './er/er-live-map.component';
import { SqlRibbonComponent } from './sql-ribbon.component';
import { CharacterStageComponent } from './stage/character-stage.component';

@Component({
  selector: 'app-live-stage',
  imports: [RouterLink, ErLiveMapComponent, CharacterStageComponent, SqlRibbonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './live-stage.component.html',
  styleUrl: './live-stage.component.css',
})
export class LiveStageComponent {
  protected readonly stream = inject(ActivityStreamService);
  protected readonly current = inject(ErPresenterService).current;
  private readonly params = toSignal(inject(ActivatedRoute).queryParamMap);
  protected readonly demo = computed(() => isDevMode() && this.params()?.get('demo') === '1');
  protected readonly fixtures = DEMO_FIXTURES;
  protected readonly statusLabel = activityStatusLabel;

  constructor() {
    const subscription = inject(ErPresenterService).connect();
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }

  protected play(fixture: typeof DEMO_FIXTURES[number]): void {
    this.stream.inject(createDemoEvent(fixture));
  }
}
