import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CandidateSummary, NominationStage } from '../../../core/models/portal.models';
import { AdayPortalService } from '../../../core/services/aday-portal.service';
import { apiErrorMessage } from '../../../shared/api-error';

@Component({
  standalone: true,
  selector: 'nobel-aday-portal',
  templateUrl: './aday-portal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdayPortalComponent {
  protected readonly summary = signal<CandidateSummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly stages: Record<NominationStage, string> = {
    ADAYLIK_ALINDI: 'Adaylık alındı',
    KOMITE_INCELEMESINDE: 'Komite incelemesinde',
    KARAR_VERILDI: 'Karar verildi',
  };

  constructor() {
    inject(AdayPortalService).summary().pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe({
      next: data => { this.summary.set(data); this.loading.set(false); },
      error: error => { this.error.set(apiErrorMessage(error)); this.loading.set(false); },
    });
  }
}
