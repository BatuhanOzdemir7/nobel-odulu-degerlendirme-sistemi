import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { CandidateSummary } from '../../../core/models/portal.models';
import { AdayPortalService } from '../../../core/services/aday-portal.service';
import { AdayPortalComponent } from './aday-portal.component';

describe('AdayPortalComponent', () => {
  it('shows the award and stage, and marks the masked fields as hidden', () => {
    const summary: CandidateSummary = {
      aday: { adayId: 4, ad: 'Ece', soyad: 'Örnek', cinsiyet: 'Kadın', dogumTarihi: '1990-01-01',
        uyruk: 'Türkiye', calismaAlani: 'Fizik' },
      adayliklar: [{ adayGostermeId: 5, adayId: 4, adayAdi: 'Ece Örnek', odulId: 2, odulAdi: 'Fizik Ödülü',
        kategoriAdi: null, kurulusAdi: 'Gizli Kuruluş', tarih: null, saat: null, asama: 'KARAR_VERILDI', sonuc: null }],
      degerlendirmeler: [], gizlilikModu: 'GIZLI',
    };
    TestBed.configureTestingModule({
      imports: [AdayPortalComponent],
      providers: [{ provide: AdayPortalService, useValue: { summary: () => of(summary) } }],
    });
    const fixture = TestBed.createComponent(AdayPortalComponent);
    fixture.detectChanges();

    const page: HTMLElement = fixture.nativeElement;
    expect(page.textContent).toContain('Gizli mod');
    expect(page.textContent).toContain('Gizli Kuruluş');
    expect(page.textContent).toContain('Fizik Ödülü');
    expect(page.textContent).toContain('Karar verildi');
    expect(page.querySelectorAll('td .secondary')).toHaveLength(2);
  });
});
