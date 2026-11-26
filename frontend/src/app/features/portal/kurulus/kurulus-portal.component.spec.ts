import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NominationRequest, NominationResponse } from '../../../core/models/portal.models';
import { KurulusPortalService } from '../../../core/services/kurulus-portal.service';
import { KurulusPortalComponent } from './kurulus-portal.component';

describe('KurulusPortalComponent', () => {
  let fixture: ComponentFixture<KurulusPortalComponent>;
  let form: FormGroup;
  const response: NominationResponse = {
    adayGosterme: {
      adayGostermeId: 1, adayId: 20, adayAdi: 'Ece Örnek', odulId: 1, odulAdi: 'Fizik ödülü',
      kategoriAdi: 'Fizik', kurulusAdi: 'Bilim Akademisi', tarih: '2026-11-25', saat: '10:00:00',
      asama: 'ADAYLIK_ALINDI', sonuc: null,
    },
    yeniHesap: { kullaniciAdi: 'aday_20', geciciSifre: 'ornek-deger' },
  };
  const nominate = vi.fn((_body: NominationRequest) => of(response));

  beforeEach(() => {
    nominate.mockClear();
    TestBed.configureTestingModule({
      imports: [KurulusPortalComponent],
      providers: [{
        provide: KurulusPortalService,
        useValue: {
          awards: () => of([{ odulId: 1, odulAdi: 'Fizik ödülü', kategoriId: 1, kategoriAdi: 'Fizik' }]),
          nominations: () => of([]), search: () => of([]), nominate,
        },
      }],
    });
    fixture = TestBed.createComponent(KurulusPortalComponent);
    fixture.detectChanges();
    form = (fixture.componentInstance as unknown as { form: FormGroup }).form;
  });

  it('requires exactly one candidate selection and omits the nomination timestamp', () => {
    form.get('odulId')!.setValue(1);
    expect(form.hasError('adaySecimi')).toBe(true);
    form.get('mevcutAdayId')!.setValue(4);
    expect(form.valid).toBe(true);
    form.get('yeniAday')!.enable();
    expect(form.hasError('adaySecimi')).toBe(true);
    expect(form.contains('tarih')).toBe(false);
    expect(form.contains('saat')).toBe(false);
  });

  it('displays new account credentials once and removes them when the card is closed', () => {
    const page: HTMLElement = fixture.nativeElement;
    Array.from(page.querySelectorAll('button')).find(button => button.textContent?.includes('Listede yok'))!.click();
    form.patchValue({ odulId: 1, yeniAday: {
      ad: 'Ece', soyad: 'Örnek', cinsiyet: 'Kadın', dogumTarihi: '1990-01-01', uyruk: 'Türkiye', calismaAlani: 'Fizik',
    } });
    fixture.detectChanges();
    page.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    fixture.detectChanges();

    expect(nominate).toHaveBeenCalledWith({ mevcutAdayId: null, yeniAday: expect.objectContaining({ ad: 'Ece' }), odulId: 1 });
    expect(page.textContent).toContain('ornek-deger');
    Array.from(page.querySelectorAll('button')).find(button => button.textContent?.includes('Kartı kapat'))!.click();
    fixture.detectChanges();
    expect(page.textContent).not.toContain('ornek-deger');
  });
});
