import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Aday, AdayGosterme, Kurulus, Odul } from '../../core/models/records';
import { AdayGostermeService } from '../../core/services/aday-gosterme.service';
import { AdayService } from '../../core/services/aday.service';
import { KurulusService } from '../../core/services/kurulus.service';
import { OdulService } from '../../core/services/odul.service';
import { apiErrorMessage } from '../../shared/api-error';
import { AlertBoxComponent } from '../../shared/components/alert-box.component';

@Component({
  selector: 'nobel-aday-gosterme', standalone: true, imports: [CommonModule, ReactiveFormsModule, AlertBoxComponent],
  template: `
    <div class="page-heading"><p>Aday gösterme kayıtları</p><h1>Aday Gösterme</h1></div>
    <section class="panel">
      <h2>Yeni aday gösterme</h2>
      <form class="stack" [formGroup]="form" (ngSubmit)="add()">
        <div class="form-grid">
          <label>Kuruluş<select formControlName="kurulusNo"><option [ngValue]="null">Kuruluş seçin</option>
            @for (organization of organizations; track organization.kurulusNo) { <option [ngValue]="organization.kurulusNo">{{ organization.ad }}</option> }
          </select></label>
          <label>Aday<select formControlName="adayId"><option [ngValue]="null">Aday seçin</option>
            @for (candidate of candidates; track candidate.adayId) { <option [ngValue]="candidate.adayId">{{ candidate.ad }} {{ candidate.soyad }}</option> }
          </select></label>
          <label>Ödül<select formControlName="odulNo"><option [ngValue]="null">Ödül seçin</option>
            @for (prize of prizes; track prize.odulNo) { <option [ngValue]="prize.odulNo">{{ prize.aciklayiciAd }}</option> }
          </select></label>
          <label>Tarih<input type="date" formControlName="tarih" /></label>
          <label>Saat<input type="time" formControlName="saat" /></label>
        </div>
        <button class="primary" [disabled]="form.invalid">Aday göstermeyi kaydet</button>
      </form>
    </section>
    <section class="panel">
      <h2>Mevcut kayıtlar</h2>
      <div class="table-wrap"><table><thead><tr><th>Kuruluş</th><th>Aday</th><th>Ödül</th><th>Tarih</th><th>Saat</th><th></th></tr></thead><tbody>
        @for (item of nominations; track item.adayGostermeId) {
          <tr><td>{{ organizationName(item.kurulusNo) }}</td><td>{{ candidateName(item.adayId) }}</td><td>{{ prizeName(item.odulNo) }}</td><td>{{ item.tarih }}</td><td>{{ item.saat }}</td><td><button class="danger" (click)="remove(item.adayGostermeId)">Sil</button></td></tr>
        } @empty { <tr><td colspan="6" class="empty">Kayıt bulunamadı.</td></tr> }
      </tbody></table></div>
    </section>
    @if (notice) { <nobel-alert-box [message]="notice" [isError]="isError" /> }
  `
})
export class AdayGostermeComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly nominationApi = inject(AdayGostermeService);
  private readonly organizationApi = inject(KurulusService);
  private readonly candidateApi = inject(AdayService);
  private readonly prizeApi = inject(OdulService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  nominations: AdayGosterme[] = [];
  organizations: Kurulus[] = [];
  candidates: Aday[] = [];
  prizes: Odul[] = [];
  notice = '';
  isError = false;
  form = this.fb.group({
    kurulusNo: [null as number | null, Validators.required], adayId: [null as number | null, Validators.required],
    odulNo: [null as number | null, Validators.required], tarih: ['', Validators.required], saat: ['', Validators.required]
  });

  ngOnInit(): void { this.refresh(); }
  refresh(): void {
    forkJoin({
      nominations: this.nominationApi.list(), organizations: this.organizationApi.list(),
      candidates: this.candidateApi.list(), prizes: this.prizeApi.list()
    }).subscribe({
      next: data => {
        this.nominations = data.nominations;
        this.organizations = data.organizations;
        this.candidates = data.candidates;
        this.prizes = data.prizes;
        this.changeDetector.markForCheck();
      },
      error: error => this.fail(error)
    });
  }
  organizationName(id: number): string { return this.organizations.find(item => item.kurulusNo === id)?.ad ?? `#${id}`; }
  candidateName(id: number): string {
    const candidate = this.candidates.find(item => item.adayId === id);
    return candidate ? `${candidate.ad} ${candidate.soyad}` : `#${id}`;
  }
  prizeName(id: number): string { return this.prizes.find(item => item.odulNo === id)?.aciklayiciAd ?? `#${id}`; }
  add(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.nominationApi.create({ kurulusNo: value.kurulusNo!, adayId: value.adayId!, odulNo: value.odulNo!, tarih: value.tarih!, saat: value.saat! }).subscribe({
      next: () => { this.form.reset(); this.succeed('Aday gösterme eklendi.'); this.refresh(); },
      error: error => this.fail(error)
    });
  }
  remove(id: number): void {
    this.nominationApi.delete(id).subscribe({
      next: () => { this.succeed('Aday gösterme silindi.'); this.refresh(); }, error: error => this.fail(error)
    });
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
