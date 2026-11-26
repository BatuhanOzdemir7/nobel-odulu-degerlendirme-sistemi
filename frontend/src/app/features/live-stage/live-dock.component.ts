import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivityStreamService } from '../../core/events/activity-stream.service';
import { ErPresenterService } from '../../core/events/er-presenter.service';
import { ErLiveMapComponent } from './er/er-live-map.component';
import { CharacterStageComponent } from './stage/character-stage.component';

const STORAGE_KEY = 'nobel.liveDock.open';

@Component({
  selector: 'app-live-dock',
  imports: [RouterLink, ErLiveMapComponent, CharacterStageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './live-dock.component.html',
  styleUrl: './live-dock.component.css',
})
export class LiveDockComponent {
  private readonly stream = inject(ActivityStreamService);
  protected readonly presenter = inject(ErPresenterService);
  protected readonly open = signal(this.restore());
  protected readonly showStage = signal(false);
  protected readonly last = computed(() => this.stream.recent().at(-1));

  constructor() {
    effect(onCleanup => {
      if (this.open()) {
        const subscription = this.presenter.connect();
        onCleanup(() => subscription.unsubscribe());
      }
    });
  }

  protected toggle(): void {
    const open = !this.open();
    this.open.set(open);
    try {
      sessionStorage.setItem(STORAGE_KEY, String(open));
    } catch {
      // The drawer still works when storage is unavailable.
    }
  }

  private restore(): boolean {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }
}
