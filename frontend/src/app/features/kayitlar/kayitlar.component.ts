import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Kategori, Odul } from '../../core/models/records';
import { KategoriService } from '../../core/services/kategori.service';
import { OdulService } from '../../core/services/odul.service';
import { apiErrorMessage } from '../../shared/api-error';
import { AlertBoxComponent } from '../../shared/components/alert-box.component';

@Component({
  selector: 'nobel-kayitlar', standalone: true, imports: [CommonModule, ReactiveFormsModule, AlertBoxComponent],
  template: `
    <div class="page-heading"><p>Temel kayıtlar</p><h1>Kategoriler &amp; Ödüller</h1></div>
    <div class="two-column">
      <section class="panel">
        <h2>Kategori ekle</h2>
        <form class="stack" [formGroup]="categoryForm" (ngSubmit)="addCategory()">
          <label>Kategori adı<input formControlName="kategoriAdi" placeholder="Örn. Fizik" /></label>
          <button class="primary" [disabled]="categoryForm.invalid">Kategori kaydet</button>
        </form>
        <h2 style="margin-top:26px">Kategoriler</h2>
        <div class="table-wrap"><table><thead><tr><th>Ad</th><th></th></tr></thead><tbody>
          @for (category of categories; track category.kategoriId) {
            <tr><td>{{ category.kategoriAdi }}</td><td><button class="danger" (click)="deleteCategory(category.kategoriId)">Sil</button></td></tr>
          } @empty { <tr><td colspan="2" class="empty">Kayıt bulunamadı.</td></tr> }
        </tbody></table></div>
      </section>
      <section class="panel">
        <h2>Ödül ekle</h2>
        <form class="stack" [formGroup]="prizeForm" (ngSubmit)="addPrize()">
          <label>Açıklayıcı ad<input formControlName="aciklayiciAd" placeholder="Ödül alanı" /></label>
          <label>Kategori<select formControlName="kategoriId"><option [ngValue]="null">Kategori seçin</option>
            @for (category of categories; track category.kategoriId) { <option [ngValue]="category.kategoriId">{{ category.kategoriAdi }}</option> }
          </select></label>
          <button class="primary" [disabled]="prizeForm.invalid">Ödül kaydet</button>
        </form>
        <h2 style="margin-top:26px">Ödüller</h2>
        <div class="table-wrap"><table><thead><tr><th>Açıklama</th><th>Kategori</th><th></th></tr></thead><tbody>
          @for (prize of prizes; track prize.odulNo) {
            <tr><td>{{ prize.aciklayiciAd }}</td><td>{{ categoryName(prize.kategoriId) }}</td><td><button class="danger" (click)="deletePrize(prize.odulNo)">Sil</button></td></tr>
          } @empty { <tr><td colspan="3" class="empty">Kayıt bulunamadı.</td></tr> }
        </tbody></table></div>
      </section>
    </div>
    @if (notice) { <nobel-alert-box [message]="notice" [isError]="isError" /> }
  `
})
export class KayitlarComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly kategoriApi = inject(KategoriService);
  private readonly odulApi = inject(OdulService);
  categories: Kategori[] = [];
  prizes: Odul[] = [];
  notice = '';
  isError = false;
  categoryForm = this.fb.nonNullable.group({ kategoriAdi: ['', Validators.required] });
  prizeForm = this.fb.group({ aciklayiciAd: ['', Validators.required], kategoriId: [null as number | null, Validators.required] });

  ngOnInit(): void { this.refresh(); }
  refresh(): void {
    forkJoin({ categories: this.kategoriApi.list(), prizes: this.odulApi.list() }).subscribe({
      next: data => { this.categories = data.categories; this.prizes = data.prizes; },
      error: error => this.fail(error)
    });
  }
  categoryName(id: number): string { return this.categories.find(item => item.kategoriId === id)?.kategoriAdi ?? `#${id}`; }
  addCategory(): void {
    if (this.categoryForm.invalid) return;
    this.kategoriApi.create(this.categoryForm.getRawValue()).subscribe({
      next: () => { this.categoryForm.reset(); this.succeed('Kategori eklendi.'); this.refresh(); }, error: error => this.fail(error)
    });
  }
  addPrize(): void {
    if (this.prizeForm.invalid) return;
    const value = this.prizeForm.getRawValue();
    this.odulApi.create({ aciklayiciAd: value.aciklayiciAd!, kategoriId: value.kategoriId! }).subscribe({
      next: () => { this.prizeForm.reset(); this.succeed('Ödül eklendi.'); this.refresh(); }, error: error => this.fail(error)
    });
  }
  deleteCategory(id: number): void {
    this.kategoriApi.delete(id).subscribe({ next: () => { this.succeed('Kategori silindi.'); this.refresh(); }, error: error => this.fail(error) });
  }
  deletePrize(id: number): void {
    this.odulApi.delete(id).subscribe({ next: () => { this.succeed('Ödül silindi.'); this.refresh(); }, error: error => this.fail(error) });
  }
  private succeed(message: string): void { this.notice = message; this.isError = false; }
  private fail(error: unknown): void { this.notice = apiErrorMessage(error); this.isError = true; }
}
