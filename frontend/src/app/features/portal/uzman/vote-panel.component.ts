import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommitteeCandidate, VoteDecision } from '../../../core/models/portal.models';
import { VoteProgressComponent } from './vote-progress.component';

@Component({
  standalone: true,
  selector: 'nobel-vote-panel',
  imports: [ReactiveFormsModule, VoteProgressComponent],
  templateUrl: './vote-panel.component.html',
  styles: [`.actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .vote-list { margin: 0; padding-inline-start: 20px; }
    .result { display: inline-block; width: fit-content; }`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VotePanelComponent {
  readonly candidate = input.required<CommitteeCandidate>();
  readonly criteria = input.required<readonly string[]>();
  readonly busy = input(false);
  readonly vote = output<{ adayId: number; olcut: string; karar: VoteDecision }>();
  readonly finish = output<number>();
  protected readonly criterion = new FormControl('', { nonNullable: true, validators: Validators.required });
  protected readonly labels: Record<VoteDecision, string> = { KABUL: 'Kabul', RED: 'Red', INCELEMEDE: 'İncelemede' };
  protected readonly options: VoteDecision[] = ['KABUL', 'RED', 'INCELEMEDE'];

  protected cast(decision: VoteDecision): void {
    const candidate = this.candidate();
    if (this.busy() || candidate.finalized || candidate.myVote || this.criterion.invalid) return;
    this.vote.emit({ adayId: candidate.adayId, olcut: this.criterion.value, karar: decision });
  }
}
