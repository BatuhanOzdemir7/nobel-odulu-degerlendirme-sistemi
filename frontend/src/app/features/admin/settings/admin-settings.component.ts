import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { PrivacyMode } from '../../../core/models/portal.models';
import { AdminSettingsService } from '../../../core/services/admin-settings.service';
import { apiErrorMessage } from '../../../shared/api-error';

@Component({
  standalone: true,
  selector: 'nobel-admin-settings',
  imports: [ReactiveFormsModule],
  templateUrl: './admin-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSettingsComponent {
  private readonly api = inject(AdminSettingsService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly mode = new FormControl<PrivacyMode>('SEFFAF', { nonNullable: true });
  protected readonly form = new FormGroup({ mod: this.mode });
  protected readonly saved = signal<PrivacyMode | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly success = signal('');

  constructor() {
    this.api.privacyMode().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false))).subscribe({
      next: setting => { this.saved.set(setting.mod); this.mode.setValue(setting.mod); },
      error: error => this.error.set(apiErrorMessage(error)),
    });
  }

  protected save(): void {
    if (this.saving() || !this.saved() || this.mode.value === this.saved()) return;
    this.error.set('');
    this.success.set('');
    this.saving.set(true);
    this.api.setPrivacyMode({ mod: this.mode.value })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false))).subscribe({
        next: setting => { this.saved.set(setting.mod); this.success.set('Gizlilik modu güncellendi.'); },
        error: error => this.error.set(apiErrorMessage(error)),
      });
  }
}
