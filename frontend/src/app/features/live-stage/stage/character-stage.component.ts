import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, inject, OnDestroy, viewChild,
} from '@angular/core';
import type { Subscription } from 'rxjs';
import { ActivityStreamService } from '../../../core/events/activity-stream.service';
import { PortfolioStageAdapter, STAGE_ADAPTER_FACTORY } from './stage.contract';

@Component({
  selector: 'app-character-stage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div #stage class="character-stage"></div>',
  styles: '.character-stage { min-height: 5rem; overflow-wrap: anywhere; }',
})
export class CharacterStageComponent implements AfterViewInit, OnDestroy {
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly createAdapter = inject(STAGE_ADAPTER_FACTORY);
  private readonly stream = inject(ActivityStreamService);
  private adapter?: PortfolioStageAdapter;
  private subscription?: Subscription;

  ngAfterViewInit(): void {
    const adapter = this.createAdapter();
    this.adapter = adapter;
    adapter.mount(this.stage().nativeElement);
    this.subscription = this.stream.stageCommands$.subscribe(command => adapter.play(command));
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.adapter?.destroy();
  }
}
