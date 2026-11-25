import { ChangeDetectionStrategy, Component, DestroyRef, inject, isDevMode, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { LoginRequest } from '../../../core/models/auth.models';
import { AuthService } from '../../../core/services/auth.service';
import { apiErrorMessage } from '../../../shared/api-error';

@Component({
  selector: 'nobel-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    kullaniciAdi: ['', Validators.required],
    sifre: ['', Validators.required],
  });
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly expired = this.route.snapshot.queryParamMap.get('reason') === 'expired';
  protected readonly demoAccounts = isDevMode() ? [
    { label: 'Yönetici', kullaniciAdi: 'admin', sifre: 'admin123' },
    { label: 'Kuruluş', kullaniciAdi: 'kurulus_cern', sifre: '123456' },
    { label: 'Uzman', kullaniciAdi: 'uzman_1', sifre: '123456' },
    { label: 'Aday', kullaniciAdi: 'aday_1', sifre: '123456' },
  ] : [];

  protected fillDemo({ kullaniciAdi, sifre }: LoginRequest): void {
    this.form.setValue({ kullaniciAdi, sifre });
    this.error.set('');
  }

  protected submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.error.set('');
    this.loading.set(true);
    this.auth.login(this.form.getRawValue()).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: ({ user }) => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '';
        const internal = returnUrl.startsWith('/') && !returnUrl.startsWith('//') && !returnUrl.includes('\\');
        void this.router.navigateByUrl(internal ? returnUrl : this.auth.homeFor(user.rol), { replaceUrl: true });
      },
      error: error => this.error.set(apiErrorMessage(error)),
    });
  }
}
