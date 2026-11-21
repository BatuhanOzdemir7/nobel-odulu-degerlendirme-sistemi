import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Aday, Degerlendirme, Komite } from '../../core/models/records';
import { AdayService } from '../../core/services/aday.service';
import { DegerlendirmeService } from '../../core/services/degerlendirme.service';
import { KomiteService } from '../../core/services/komite.service';
import { apiErrorMessage } from '../../shared/api-error';
import { AlertBoxComponent } from '../../shared/components/alert-box.component';

@Component({
  selector: 'nobel-degerlendirmeler', standalone: true, imports: [CommonModule, ReactiveFormsModule, AlertBoxComponent],
  template: `
    <div class="page-heading"><p>Komite kararları</p><h1>Değerlendirmeler</h1></div>
    <section class="panel">
      <h2>Değerlendirme ekle</h2>
      <form class="stack" [formGroup]="form" (ngSubmit)="add()">
        <div class="form-grid">
          <label>Komite<select formControlName="komiteId"><option [ngValue]="null">Komite seçin</option>
            @for (committee of committees; track committee.komiteId) { <option [ngValue]="committee.komiteId">{{ committee.komiteAdi }}</option> }
          </select></label>
          <label>Aday<select formControlName="adayId"><option [ngValue]="null">Aday seçin</option>
            @for (candidate of candidates; track candidate.adayId) { <option [ngValue]="candidate.adayId">{{ candidate.ad }} {{ candidate.soyad }}</option> }
          </select></label>
          <label>Tarih<input type="date" formControlName="tarih" /></label>
          <label>Sonuç<input formControlName="sonuc" placeholder="Örn. İnceleme sürüyor" /></label>
          <label>Ölçüt<input formControlName="olcut" placeholder="Değerlendirme ölçütü" /></label>
        </div>
        <button class="primary" [disabled]="form.invalid">Değerlendirme kaydet</button>
      </form>
    </section>
    <section class="panel">
      <h2>Mevcut değerlendirmeler</h2>
      <div class="table-wrap"><table><thead><tr><th>Aday</th><th>Komite</th><th>Tarih</th><th>Ölçüt</th><th>Sonuç</th><th></th></tr></thead><tbody>
        @for (item of evaluations; track item.degerlendirmeId) {
          <tr><td>{{ candidateName(item.adayId) }}</td><td>{{ committeeName(item.komiteId) }}</td><td>{{ item.tarih }}</td><td>{{ item.olcut }}</td><td>{{ item.sonuc }}</td><td><button class="danger" (click)="remove(item.degerlendirmeId)">Sil</button></td></tr>
        } @empty { <tr><td colspan="6" class="empty">Kayıt bulunamadı.</td></tr> }
      </tbody></table></div>
    </section>
    @if (notice) { <nobel-alert-box [message]="notice" [isError]="isError" /> }
  `
})
export class DegerlendirmelerComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly evaluationApi = inject(DegerlendirmeService);
  private readonly candidateApi = inject(AdayService);
  private readonly committeeApi = inject(KomiteService);
  evaluations: Degerlendirme[] = [];
  candidates: Aday[] = [];
  committees: Komite[] = [];
  notice = '';
  isError = false;
  form = this.fb.group({
    komiteId: [null as number | null, Validators.required], adayId: [null as number | null, Validators.required],
    tarih: ['', Validators.required], sonuc: ['', Validators.required], olcut: ['', Validators.required]
  });

  ngOnInit(): void { this.refresh(); }
  refresh(): void {
    forkJoin({ evaluations: this.evaluationApi.list(), candidates: this.candidateApi.list(), committees: this.committeeApi.list() }).subscribe({
      next: data => { this.evaluations = data.evaluations; this.candidates = data.candidates; this.committees = data.committees; },
      error: error => this.fail(error)
    });
  }
  candidateName(id: number): string {
    const candidate = this.candidates.find(item => item.adayId === id);
    return candidate ? `${candidate.ad} ${candidate.soyad}` : `#${id}`;
  }
  committeeName(id: number): string { return this.committees.find(item => item.komiteId === id)?.komiteAdi ?? `#${id}`; }
  add(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.evaluationApi.create({ komiteId: value.komiteId!, adayId: value.adayId!, tarih: value.tarih!, sonuc: value.sonuc!, olcut: value.olcut! }).subscribe({
      next: () => { this.form.reset(); this.notice = 'Değerlendirme eklendi.'; this.isError = false; this.refresh(); }, error: error => this.fail(error)
    });
  }
  remove(id: number): void {
    this.evaluationApi.delete(id).subscribe({ next: () => { this.notice = 'Değerlendirme silindi.'; this.isError = false; this.refresh(); }, error: error => this.fail(error) });
  }
  private fail(error: unknown): void { this.notice = apiErrorMessage(error); this.isError = true; }
}
