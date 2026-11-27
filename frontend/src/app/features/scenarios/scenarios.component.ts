import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NobelStageComponent } from '../live-stage/engine/stage/nobel-stage.component';
import { ErLiveMapComponent } from '../live-stage/er/er-live-map.component';
import { createScenarioSteps, SCENARIOS, type ScenarioStep } from './scenario-steps';

@Component({
  selector: 'app-scenarios',
  imports: [RouterLink, NobelStageComponent, ErLiveMapComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './scenarios.component.html',
  styleUrl: './scenarios.component.css',
})
export class ScenariosComponent {
  private readonly auth = inject(AuthService);
  private readonly stage = viewChild(NobelStageComponent);
  private runId = 0;

  protected readonly scenarios = SCENARIOS;
  protected readonly selected = signal<typeof SCENARIOS[number] | null>(null);
  protected readonly steps = signal<readonly ScenarioStep[]>([]);
  protected readonly index = signal(-1);
  protected readonly running = signal(false);
  protected readonly activeStep = computed(() => this.steps()[this.index()]);
  protected readonly activeStepList = computed(() => {
    const step = this.activeStep();
    return step ? [step] : [];
  });
  protected readonly home = computed(() => {
    const user = this.auth.user();
    return user ? this.auth.homeFor(user.rol) : '/login';
  });

  constructor() {
    effect(() => {
      const stage = this.stage();
      if (!stage || !this.running() || stage.director.playing()) return;
      untracked(() => this.advance(stage));
    });
  }

  protected play(scenario: typeof SCENARIOS[number]): void {
    if (this.running()) return;
    this.selected.set(scenario);
    this.steps.set(createScenarioSteps(scenario, ++this.runId));
    this.index.set(-1);
    this.running.set(true);
  }

  private advance(stage: NobelStageComponent): void {
    const index = this.index() + 1;
    const step = this.steps()[index];
    if (!step) {
      this.running.set(false);
      return;
    }
    this.index.set(index);
    stage.play(step.command);
  }
}
