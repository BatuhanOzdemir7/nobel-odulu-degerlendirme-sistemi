import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Kategori, Komite, Uzman } from '../../core/models/records';
import { KategoriService } from '../../core/services/kategori.service';
import { KomiteService } from '../../core/services/komite.service';
import { UzmanService } from '../../core/services/uzman.service';
import { apiErrorMessage } from '../../shared/api-error';
import { AlertBoxComponent } from '../../shared/components/alert-box.component';

@Component({
  selector: 'nobel-uzmanlar-komiteler', standalone: true, imports: [CommonModule, ReactiveFormsModule, AlertBoxComponent],
  template: `
    <div class="page-heading"><p>Uzmanlık ve karar yapısı</p><h1>Uzmanlar &amp; Komiteler</h1></div>
    <div class="two-column">
      <section class="panel">
        <h2>Uzman ekle</h2>
        <form class="stack" [formGroup]="expertForm" (ngSubmit)="addExpert()">
          <div class="form-grid">
            <label>Ad<input formControlName="ad" /></label><label>Yaş<input type="number" min="18" max="120" formControlName="yas" /></label>
            <label>Cinsiyet<input formControlName="cinsiyet" /></label><label>Uzmanlık alanı<input formControlName="uzmanlikAlani" /></label>
          </div>
          <label>Adres<textarea rows="2" formControlName="adres"></textarea></label>
          <button class="primary" [disabled]="expertForm.invalid">Uzman kaydet</button>
        </form>
        <h2 style="margin-top:26px">Uzmanlar</h2>
        <div class="table-wrap"><table><thead><tr><th>Uzman</th><th>Alan</th><th>Yaş</th><th></th></tr></thead><tbody>
          @for (expert of experts; track expert.uzmanId) {
            <tr><td>{{ expert.ad }}</td><td>{{ expert.uzmanlikAlani }}</td><td>{{ expert.yas }}</td><td><button class="danger" (click)="deleteExpert(expert.uzmanId)">Sil</button></td></tr>
          } @empty { <tr><td colspan="4" class="empty">Kayıt bulunamadı.</td></tr> }
        </tbody></table></div>
      </section>
      <section class="panel">
        <h2>Komite oluştur</h2>
        <form class="stack" [formGroup]="committeeForm" (ngSubmit)="addCommittee()">
          <label>Komite adı<input formControlName="komiteAdi" /></label>
          <label>Kategori<select formControlName="kategoriId"><option [ngValue]="null">Kategori seçin</option>
            @for (category of categories; track category.kategoriId) { <option [ngValue]="category.kategoriId">{{ category.kategoriAdi }}</option> }
          </select></label>
          <label>Uzmanlar (en az 3; çoklu seçim için Ctrl/Cmd kullanın)
            <select multiple (change)="selectExperts($event)">
              @for (expert of experts; track expert.uzmanId) { <option [value]="expert.uzmanId">{{ expert.ad }} — {{ expert.uzmanlikAlani }}</option> }
            </select>
          </label>
          <p class="hint">Seçili uzman: {{ committeeForm.controls.uzmanIdListesi.value.length }} / en az 3</p>
          <button class="primary" [disabled]="committeeForm.invalid">Komiteyi ve üyelerini kaydet</button>
        </form>
      </section>
    </div>
    <section class="panel" style="margin-top:20px">
      <h2>Komiteler ve üyeleri</h2>
      <div class="table-wrap"><table><thead><tr><th>Komite</th><th>Kategori</th><th>Üyeler</th><th>Üye ekle</th><th></th></tr></thead><tbody>
        @for (committee of committees; track committee.komiteId) {
          <tr>
            <td>{{ committee.komiteAdi }}</td><td>{{ categoryName(committee.kategoriId) }}</td>
            <td><ul>@for (expertId of committee.uzmanIdListesi; track expertId) {
              <li>{{ expertName(expertId) }} <button class="danger" (click)="removeMember(committee, expertId)">Üyeyi çıkar</button></li>
            }</ul></td>
            <td><div class="stack">@for (expert of availableExperts(committee); track expert.uzmanId) {
              <button class="secondary" (click)="addMember(committee, expert.uzmanId)">+ {{ expert.ad }}</button>
            } @empty { <span class="hint">Eklenecek uzman yok.</span> }</div></td>
            <td><button class="danger" (click)="deleteCommittee(committee.komiteId)">Komiteyi sil</button></td>
          </tr>
        } @empty { <tr><td colspan="5" class="empty">Kayıt bulunamadı.</td></tr> }
      </tbody></table></div>
    </section>
    @if (notice) { <nobel-alert-box [message]="notice" [isError]="isError" /> }
  `
})
export class UzmanlarKomitelerComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly expertApi = inject(UzmanService);
  private readonly committeeApi = inject(KomiteService);
  private readonly categoryApi = inject(KategoriService);
  experts: Uzman[] = [];
  committees: Komite[] = [];
  categories: Kategori[] = [];
  notice = '';
  isError = false;
  expertForm = this.fb.nonNullable.group({
    ad: ['', Validators.required], adres: ['', Validators.required], yas: [null as number | null, [Validators.required, Validators.min(18), Validators.max(120)]],
    cinsiyet: ['', Validators.required], uzmanlikAlani: ['', Validators.required]
  });
  committeeForm = this.fb.group({
    komiteAdi: ['', Validators.required], kategoriId: [null as number | null, Validators.required],
    uzmanIdListesi: this.fb.control<number[]>([], { nonNullable: true, validators: [Validators.minLength(3)] })
  });

  ngOnInit(): void { this.refresh(); }
  refresh(): void {
    forkJoin({ experts: this.expertApi.list(), committees: this.committeeApi.list(), categories: this.categoryApi.list() }).subscribe({
      next: data => { this.experts = data.experts; this.committees = data.committees; this.categories = data.categories; },
      error: error => this.fail(error)
    });
  }
  selectExperts(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.committeeForm.controls.uzmanIdListesi.setValue(Array.from(select.selectedOptions, option => Number(option.value)));
  }
  categoryName(id: number): string { return this.categories.find(category => category.kategoriId === id)?.kategoriAdi ?? `#${id}`; }
  expertName(id: number): string { return this.experts.find(expert => expert.uzmanId === id)?.ad ?? `Uzman #${id}`; }
  availableExperts(committee: Komite): Uzman[] { return this.experts.filter(expert => !committee.uzmanIdListesi.includes(expert.uzmanId)); }
  addExpert(): void {
    if (this.expertForm.invalid) return;
    this.expertApi.create(this.expertForm.getRawValue()).subscribe({
      next: () => { this.expertForm.reset(); this.succeed('Uzman eklendi.'); this.refresh(); }, error: error => this.fail(error)
    });
  }
  deleteExpert(id: number): void {
    this.expertApi.delete(id).subscribe({ next: () => { this.succeed('Uzman silindi.'); this.refresh(); }, error: error => this.fail(error) });
  }
  addCommittee(): void {
    if (this.committeeForm.invalid) return;
    const value = this.committeeForm.getRawValue();
    this.committeeApi.create({ komiteAdi: value.komiteAdi!, kategoriId: value.kategoriId!, uzmanIdListesi: value.uzmanIdListesi! }).subscribe({
      next: () => { this.committeeForm.reset({ komiteAdi: '', kategoriId: null, uzmanIdListesi: [] }); this.succeed('Komite ve üyeleri eklendi.'); this.refresh(); },
      error: error => this.fail(error)
    });
  }
  addMember(committee: Komite, expertId: number): void {
    this.committeeApi.addMember(committee.komiteId, expertId).subscribe({
      next: () => { this.succeed('Komite üyesi eklendi.'); this.refresh(); }, error: error => this.fail(error)
    });
  }
  deleteCommittee(id: number): void {
    this.committeeApi.delete(id).subscribe({
      next: () => { this.succeed('Komite silindi.'); this.refresh(); }, error: error => this.fail(error)
    });
  }
  removeMember(committee: Komite, expertId: number): void {
    this.committeeApi.removeMember(committee.komiteId, expertId).subscribe({
      next: () => { this.succeed('Komite üyesi çıkarıldı.'); this.refresh(); }, error: error => this.fail(error)
    });
  }
  private succeed(message: string): void { this.notice = message; this.isError = false; }
  private fail(error: unknown): void { this.notice = apiErrorMessage(error); this.isError = true; }
}
