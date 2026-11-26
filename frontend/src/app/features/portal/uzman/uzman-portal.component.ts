import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, catchError, finalize, forkJoin, map, merge, of, switchMap } from 'rxjs';
import { CommitteeCandidate, ExpertCommittee, ExpertVoteRequest } from '../../../core/models/portal.models';
import { UzmanPortalService } from '../../../core/services/uzman-portal.service';
import { apiErrorMessage } from '../../../shared/api-error';
import { VotePanelComponent } from './vote-panel.component';

@Component({
  standalone: true,
  selector: 'nobel-uzman-portal',
  imports: [ReactiveFormsModule, VotePanelComponent],
  templateUrl: './uzman-portal.component.html',
  styleUrl: './uzman-portal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UzmanPortalComponent {
  private readonly api = inject(UzmanPortalService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly refresh = new Subject<void>();
  private readonly selectedId = signal<number | null>(null);
  protected readonly committee = new FormControl<number | null>(null);
  protected readonly committees = signal<ExpertCommittee[]>([]);
  protected readonly criteria = signal<string[]>([]);
  protected readonly candidates = signal<CommitteeCandidate[]>([]);
  protected readonly loading = signal(true);
  protected readonly listLoading = signal(false);
  protected readonly busy = signal(false);
  protected readonly portalError = signal('');
  protected readonly listError = signal('');
  protected readonly actionError = signal('');
  protected readonly success = signal('');
  protected readonly selected = computed(() => this.committees().find(committee => committee.komiteId === this.selectedId()));

  constructor() {
    merge(this.committee.valueChanges, this.refresh.pipe(map(() => this.committee.value))).pipe(
      switchMap(id => {
        this.selectedId.set(id);
        this.listError.set('');
        this.listLoading.set(id !== null);
        this.candidates.set([]);
        if (id === null) return of([]);
        return this.api.candidates(id).pipe(catchError(error => {
          this.listError.set(apiErrorMessage(error));
          return of([]);
        }));
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(rows => {
      this.candidates.set(rows);
      this.listLoading.set(false);
    });
    forkJoin({ committees: this.api.committees(), criteria: this.api.criteria() })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false))).subscribe({
        next: data => {
          this.committees.set(data.committees);
          this.criteria.set(data.criteria);
          this.committee.setValue(data.committees[0]?.komiteId ?? null);
        },
        error: error => this.portalError.set(apiErrorMessage(error)),
      });
  }

  protected vote(vote: Omit<ExpertVoteRequest, 'komiteId'>): void {
    const komiteId = this.selectedId();
    if (komiteId === null || this.busy()) return;
    this.beginAction();
    this.api.vote({ ...vote, komiteId }).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false)),
    ).subscribe({
      next: result => this.completeAction(komiteId, result.kararKesinlesti,
        result.kararKesinlesti ? 'Oy kaydedildi ve karar kesinleşti.' : 'Oy kaydedildi.'),
      error: error => this.actionError.set(apiErrorMessage(error)),
    });
  }

  protected finalizeDecision(adayId: number): void {
    const komiteId = this.selectedId();
    if (komiteId === null || this.busy()) return;
    this.beginAction();
    this.api.finalize({ komiteId, adayId }).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false)),
    ).subscribe({
      next: () => this.completeAction(komiteId, true, 'Komite kararı kesinleşti.'),
      error: error => this.actionError.set(apiErrorMessage(error)),
    });
  }

  private beginAction(): void {
    this.busy.set(true);
    this.actionError.set('');
    this.success.set('');
  }

  private completeAction(komiteId: number, finalized: boolean, message: string): void {
    this.success.set(message);
    if (finalized) {
      this.committees.update(rows => rows.map(row => row.komiteId === komiteId
        ? { ...row, bekleyenAdaySayisi: Math.max(0, row.bekleyenAdaySayisi - 1) } : row));
    }
    this.refresh.next();
  }
}
