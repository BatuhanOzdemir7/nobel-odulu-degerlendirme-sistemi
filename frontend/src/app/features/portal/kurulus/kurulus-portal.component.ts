import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, finalize, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { CandidateSearchResult, NominationRequest, NominationView, PrizeOption, TemporaryAccount } from '../../../core/models/portal.models';
import { KurulusPortalService } from '../../../core/services/kurulus-portal.service';
import { apiErrorMessage } from '../../../shared/api-error';

const candidateSelection: ValidatorFn = group => {
  const existing = group.get('mevcutAdayId')?.value != null;
  const create = group.get('yeniAday')?.enabled === true;
  return existing !== create ? null : { adaySecimi: true };
};

@Component({
  standalone: true,
  selector: 'nobel-kurulus-portal',
  imports: [ReactiveFormsModule],
  templateUrl: './kurulus-portal.component.html',
  styleUrl: './kurulus-portal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KurulusPortalComponent {
  private readonly api = inject(KurulusPortalService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly searchQuery = new FormControl('', { nonNullable: true });
  protected readonly mode = signal<'existing' | 'new'>('existing');
  protected readonly selected = signal<CandidateSearchResult | null>(null);
  protected readonly results = signal<CandidateSearchResult[]>([]);
  protected readonly searching = signal(false);
  protected readonly searched = signal(false);
  protected readonly searchError = signal('');
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly success = signal('');
  protected readonly account = signal<TemporaryAccount | null>(null);
  protected readonly copyMessage = signal('');
  protected readonly nominations = signal<NominationView[]>([]);
  private readonly prizes = signal<PrizeOption[]>([]);

  protected readonly groups = computed(() => {
    const groups = new Map<number, { id: number; label: string; awards: PrizeOption[] }>();
    for (const award of this.prizes()) {
      const group = groups.get(award.kategoriId) ?? { id: award.kategoriId, label: award.kategoriAdi, awards: [] };
      group.awards.push(award);
      groups.set(award.kategoriId, group);
    }
    return [...groups.values()];
  });

  protected readonly form = this.fb.group({
    mevcutAdayId: new FormControl<number | null>(null),
    odulId: new FormControl<number | null>(null, Validators.required),
    yeniAday: this.fb.nonNullable.group({
      ad: ['', [Validators.required, Validators.maxLength(100)]],
      soyad: ['', [Validators.required, Validators.maxLength(100)]],
      cinsiyet: ['', [Validators.required, Validators.maxLength(30)]],
      dogumTarihi: ['', Validators.required],
      uyruk: ['', [Validators.required, Validators.maxLength(100)]],
      calismaAlani: ['', [Validators.required, Validators.maxLength(150)]],
    }),
  }, { validators: candidateSelection });

  constructor() {
    this.form.controls.yeniAday.disable();
    this.searchQuery.valueChanges.pipe(
      map(query => query.trim()),
      distinctUntilChanged(),
      tap(query => {
        this.selected.set(null);
        this.form.controls.mevcutAdayId.setValue(null);
        this.results.set([]);
        this.searchError.set('');
        this.searched.set(false);
        this.searching.set(query.length >= 2 && this.mode() === 'existing');
      }),
      debounceTime(250),
      switchMap(query => {
        if (query.length < 2 || this.mode() === 'new') return of({ query, rows: [], error: '' });
        return this.api.search(query).pipe(
          map(rows => ({ query, rows, error: '' })),
          catchError(error => of({ query, rows: [], error: apiErrorMessage(error) })),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ query, rows, error }) => {
      if (query !== this.searchQuery.value.trim() || this.mode() !== 'existing') return;
      this.searching.set(false);
      this.searched.set(query.length >= 2);
      this.results.set(rows);
      this.searchError.set(error);
    });

    forkJoin({ prizes: this.api.awards(), nominations: this.api.nominations() })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false))).subscribe({
        next: data => { this.prizes.set(data.prizes); this.nominations.set(data.nominations); },
        error: error => this.error.set(apiErrorMessage(error)),
      });
  }

  protected changeMode(mode: 'existing' | 'new'): void {
    if (mode === this.mode()) return;
    this.mode.set(mode);
    this.form.controls.mevcutAdayId.setValue(null);
    this.selected.set(null);
    this.searchQuery.setValue('');
    this.searching.set(false);
    if (mode === 'new') this.form.controls.yeniAday.enable();
    else this.form.controls.yeniAday.disable();
  }

  protected select(candidate: CandidateSearchResult): void {
    this.selected.set(candidate);
    this.form.controls.mevcutAdayId.setValue(candidate.adayId);
  }

  protected submit(): void {
    if (this.form.invalid || this.saving() || this.account()) return;
    const value = this.form.getRawValue();
    if (value.odulId === null) return;
    let request: NominationRequest;
    if (this.mode() === 'new') {
      request = { odulId: value.odulId, mevcutAdayId: null, yeniAday: value.yeniAday };
    } else {
      if (value.mevcutAdayId === null) return;
      request = { odulId: value.odulId, mevcutAdayId: value.mevcutAdayId, yeniAday: null };
    }

    this.error.set('');
    this.success.set('');
    this.saving.set(true);
    this.api.nominate(request).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false)),
    ).subscribe({
      next: response => {
        this.account.set(response.yeniHesap);
        this.form.reset();
        this.selected.set(null);
        this.searchQuery.reset();
        this.success.set('Adaylık kaydedildi.');
        this.nominations.update(rows => [response.adayGosterme, ...rows]);
      },
      error: error => this.error.set(apiErrorMessage(error)),
    });
  }

  protected dismissAccount(): void {
    this.account.set(null);
    this.copyMessage.set('');
  }

  protected async copyAccount(account: TemporaryAccount): Promise<void> {
    try {
      await navigator.clipboard.writeText('Kullanıcı adı: ' + account.kullaniciAdi + '\nGeçici şifre: ' + account.geciciSifre);
      if (this.account() === account) this.copyMessage.set('Giriş bilgileri kopyalandı.');
    } catch {
      if (this.account() === account) this.copyMessage.set('Kopyalama başarısız. Giriş bilgilerini seçip kopyalayabilirsiniz.');
    }
  }
}
