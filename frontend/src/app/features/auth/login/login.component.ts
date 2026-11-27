import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, isDevMode, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  catchError, concat, debounceTime, EMPTY, filter, finalize, fromEvent, merge, Observable, of,
  retry, switchMap, tap, throwError, timer,
} from 'rxjs';
import type { ActivityAction } from '../../../core/events/activity-event.model';
import { ActivityStreamService } from '../../../core/events/activity-stream.service';
import { DemoAccount, LoginResponse, Rol } from '../../../core/models/auth.models';
import { SAME_ORIGIN_API } from '../../../core/services/api-mode';
import { AuthService } from '../../../core/services/auth.service';
import { apiErrorMessage } from '../../../shared/api-error';

const DEMO_GROUPS: { rol: Rol; label: string }[] = [
  { rol: 'ADMIN', label: 'Yöneticiler' },
  { rol: 'KURULUS', label: 'Kuruluşlar' },
  { rol: 'UZMAN', label: 'Uzmanlar' },
  { rol: 'ADAY', label: 'Adaylar' },
];

const ACCOUNT_CHANGES = new Set<ActivityAction>([
  'REGISTRY_CREATED', 'REGISTRY_UPDATED', 'REGISTRY_DELETED', 'NOMINATION_CREATED',
]);

@Component({
  selector: 'nobel-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly accounts = signal<DemoAccount[] | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    kullaniciAdi: ['', Validators.required],
    sifre: ['', Validators.required],
  });
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly demoDisconnected = signal(false);
  protected readonly expired = this.route.snapshot.queryParamMap.get('reason') === 'expired';
  protected readonly demoEnabled = computed(() => this.accounts() !== null);
  protected readonly demoGroups = computed(() => {
    const accounts = this.accounts() ?? [];
    return DEMO_GROUPS.map(group => ({
      ...group, accounts: accounts.filter(account => account.rol === group.rol),
    })).filter(group => group.accounts.length > 0);
  });

  constructor() {
    if (!isDevMode() && !SAME_ORIGIN_API) return;
    const activity = inject(ActivityStreamService);
    const refresh = merge(
      activity.events$.pipe(filter(event => ACCOUNT_CHANGES.has(event.action))),
      fromEvent(window, 'focus'),
    ).pipe(
      debounceTime(80),
      switchMap(() => this.loadDemoAccounts()),
    );
    this.loadDemoAccounts().pipe(
      switchMap(accounts => concat(of(accounts), refresh)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(accounts => this.accounts.set(accounts));
  }

  protected submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.openSession(this.auth.login(this.form.getRawValue()), this.route.snapshot.queryParamMap.get('returnUrl') ?? '');
  }

  protected submitDemo(account: DemoAccount): void {
    if (this.loading()) return;
    this.openSession(this.auth.loginDemo(account), '');
  }

  private loadDemoAccounts(): Observable<DemoAccount[]> {
    return this.auth.demoAccounts().pipe(
      tap(() => this.demoDisconnected.set(false)),
      retry({ delay: (error: unknown) => {
        if (!(error instanceof HttpErrorResponse) || (error.status !== 0 && error.status < 500)) {
          return throwError(() => error);
        }
        this.accounts.set(null);
        this.demoDisconnected.set(true);
        return timer(3000);
      } }),
      catchError(() => {
        this.accounts.set(null);
        this.demoDisconnected.set(false);
        return EMPTY;
      }),
    );
  }

  private openSession(login: Observable<LoginResponse>, returnUrl: string): void {
    this.error.set('');
    this.loading.set(true);
    login.pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: ({ user }) => {
        const internal = returnUrl.startsWith('/') && !returnUrl.startsWith('//') && !returnUrl.includes('\\');
        void this.router.navigateByUrl(internal ? returnUrl : this.auth.homeFor(user.rol), { replaceUrl: true });
      },
      error: error => this.error.set(apiErrorMessage(error)),
    });
  }
}
