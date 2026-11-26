import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { Aday, Kurulus } from '../../core/models/records';
import { AdayService } from '../../core/services/aday.service';
import { KurulusService } from '../../core/services/kurulus.service';
import { apiErrorMessage } from '../../shared/api-error';
import { AlertBoxComponent } from '../../shared/components/alert-box.component';

@Component({
  selector: 'nobel-adaylar', standalone: true, imports: [CommonModule, ReactiveFormsModule, AlertBoxComponent],
  template: `
    <div class="page-heading"><p>Katılımcılar ve kurumlar</p><h1>Adaylar &amp; Kuruluşlar</h1></div>
    <div class="two-column">
      <section class="panel">
        <h2>Aday ekle</h2>
        <form class="stack" [formGroup]="candidateForm" (ngSubmit)="addCandidate()">
          <div class="form-grid">
            <label>Ad<input formControlName="ad" /></label><label>Soyad<input formControlName="soyad" /></label>
            <label>Cinsiyet<input formControlName="cinsiyet" /></label><label>Doğum tarihi<input type="date" formControlName="dogumTarihi" /></label>
            <label>Uyruk<input formControlName="uyruk" /></label><label>Çalışma alanı<input formControlName="calismaAlani" /></label>
          </div>
          <button type="submit" class="primary" [disabled]="candidateForm.invalid || savingCandidate()">Aday kaydet</button>
        </form>
        <h2 style="margin-top:26px">Adaylar</h2>
        <div class="table-wrap"><table><thead><tr><th>Ad soyad</th><th>Alan</th><th>Uyruk</th><th></th></tr></thead><tbody>
          @for (candidate of candidates; track candidate.adayId) {
            <tr><td>{{ candidate.ad }} {{ candidate.soyad }}</td><td>{{ candidate.calismaAlani }}</td><td>{{ candidate.uyruk }}</td><td><button type="button" class="danger" (click)="deleteCandidate(candidate.adayId)">Sil</button></td></tr>
          } @empty { <tr><td colspan="4" class="empty">Kayıt bulunamadı.</td></tr> }
        </tbody></table></div>
      </section>
      <section class="panel">
        <h2>Kuruluş ekle</h2>
        <form class="stack" [formGroup]="organizationForm" (ngSubmit)="addOrganization()">
          <label>Kuruluş adı<input formControlName="ad" /></label>
          <label>Konum<input formControlName="konum" /></label>
          <label>İletişim bilgisi<input formControlName="iletisimBilgisi" /></label>
          <button type="submit" class="primary" [disabled]="organizationForm.invalid || savingOrganization()">Kuruluş kaydet</button>
        </form>
        <h2 style="margin-top:26px">Kuruluşlar</h2>
        <div class="table-wrap"><table><thead><tr><th>Ad</th><th>Konum</th><th>İletişim</th><th></th></tr></thead><tbody>
          @for (organization of organizations; track organization.kurulusNo) {
            <tr><td>{{ organization.ad }}</td><td>{{ organization.konum }}</td><td>{{ organization.iletisimBilgisi }}</td><td><button type="button" class="danger" (click)="deleteOrganization(organization.kurulusNo)">Sil</button></td></tr>
          } @empty { <tr><td colspan="4" class="empty">Kayıt bulunamadı.</td></tr> }
        </tbody></table></div>
      </section>
    </div>
    @if (notice) { <nobel-alert-box [message]="notice" [isError]="isError" /> }
  `
})
export class AdaylarComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly candidateApi = inject(AdayService);
  private readonly organizationApi = inject(KurulusService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  protected readonly savingCandidate = signal(false);
  protected readonly savingOrganization = signal(false);
  candidates: Aday[] = [];
  organizations: Kurulus[] = [];
  notice = '';
  isError = false;
  candidateForm = this.fb.nonNullable.group({
    ad: ['', Validators.required], soyad: ['', Validators.required], cinsiyet: ['', Validators.required],
    dogumTarihi: ['', Validators.required], uyruk: ['', Validators.required], calismaAlani: ['', Validators.required]
  });
  organizationForm = this.fb.nonNullable.group({
    ad: ['', Validators.required], konum: ['', Validators.required], iletisimBilgisi: ['', Validators.required]
  });

  ngOnInit(): void { this.refresh(); }
  refresh(): void {
    forkJoin({ candidates: this.candidateApi.list(), organizations: this.organizationApi.list() }).subscribe({
      next: data => {
        this.candidates = data.candidates;
        this.organizations = data.organizations;
        this.changeDetector.markForCheck();
      },
      error: error => this.fail(error)
    });
  }
  addCandidate(): void {
    if (this.candidateForm.invalid || this.savingCandidate()) return;
    this.savingCandidate.set(true);
    this.candidateApi.create(this.candidateForm.getRawValue())
      .pipe(finalize(() => this.savingCandidate.set(false)))
      .subscribe({
        next: () => { this.candidateForm.reset(); this.succeed('Aday eklendi.'); this.refresh(); },
        error: error => this.fail(error)
      });
  }
  addOrganization(): void {
    if (this.organizationForm.invalid || this.savingOrganization()) return;
    this.savingOrganization.set(true);
    this.organizationApi.create(this.organizationForm.getRawValue())
      .pipe(finalize(() => this.savingOrganization.set(false)))
      .subscribe({
        next: () => { this.organizationForm.reset(); this.succeed('Kuruluş eklendi.'); this.refresh(); },
        error: error => this.fail(error)
      });
  }
  deleteCandidate(id: number): void {
    this.candidateApi.delete(id).subscribe({ next: () => { this.succeed('Aday silindi.'); this.refresh(); }, error: error => this.fail(error) });
  }
  deleteOrganization(id: number): void {
    this.organizationApi.delete(id).subscribe({ next: () => { this.succeed('Kuruluş silindi.'); this.refresh(); }, error: error => this.fail(error) });
  }
  private succeed(message: string): void {
    this.notice = message;
    this.isError = false;
    this.changeDetector.markForCheck();
  }
  private fail(error: unknown): void {
    this.notice = apiErrorMessage(error);
    this.isError = true;
    this.changeDetector.markForCheck();
  }
}
