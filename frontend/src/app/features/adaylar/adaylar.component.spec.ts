import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Aday } from '../../core/models/records';
import { API_BASE_URL } from '../../core/services/api-url';
import { AdaylarComponent } from './adaylar.component';

const adaylarUrl = API_BASE_URL + '/adaylar';
const kuruluslarUrl = API_BASE_URL + '/kuruluslar';
const existing: Aday = {
  adayId: 1, ad: 'Ada', soyad: 'Yılmaz', cinsiyet: 'Kadın',
  dogumTarihi: '1980-01-01', uyruk: 'Türkiye', calismaAlani: 'Kimya',
};
const input = {
  ad: 'Ece', soyad: 'Kaya', cinsiyet: 'Kadın',
  dogumTarihi: '1990-01-02', uyruk: 'Türkiye', calismaAlani: 'Fizik',
};
const created: Aday = { adayId: 2, ...input };

describe('AdaylarComponent', () => {
  let fixture: ComponentFixture<AdaylarComponent>;
  let http: HttpTestingController;
  let root: HTMLElement;

  function flushLists(candidates: Aday[]): void {
    http.expectOne({ method: 'GET', url: adaylarUrl }).flush(candidates);
    http.expectOne({ method: 'GET', url: kuruluslarUrl }).flush([]);
  }

  function fillCandidateForm(): HTMLButtonElement {
    const form = root.querySelector('form')!;
    for (const [field, value] of Object.entries(input)) {
      const control = form.querySelector<HTMLInputElement>('[formcontrolname="' + field + '"]')!;
      control.value = value;
      control.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return form.querySelector('button[type="submit"]')!;
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdaylarComponent);
    root = fixture.nativeElement;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('renders existing candidates when the initial HTTP responses arrive without another click', async () => {
    flushLists([existing]);
    await fixture.whenStable();
    expect(root.querySelector('tbody')?.textContent).toContain('Ada Yılmaz');
  });

  it('posts once and renders the persisted candidate after the asynchronous list refresh', async () => {
    flushLists([existing]);
    await fixture.whenStable();
    const save = fillCandidateForm();
    await fixture.whenStable();
    expect(save.disabled).toBe(false);
    save.click();
    save.click();

    const post = http.expectOne({ method: 'POST', url: adaylarUrl });
    expect(post.request.body).toEqual(input);
    await fixture.whenStable();
    expect(save.disabled).toBe(true);
    post.flush(created, { status: 201, statusText: 'Created' });

    await fixture.whenStable();
    flushLists([existing, created]);
    await fixture.whenStable();
    expect(root.querySelector('tbody')?.textContent).toContain('Ece Kaya');
    expect(root.textContent).toContain('Aday eklendi.');
    http.expectNone(request => request.method === 'DELETE');
  });

  it('shows a rejected save without clearing the form or the existing list', async () => {
    flushLists([existing]);
    await fixture.whenStable();
    const save = fillCandidateForm();
    await fixture.whenStable();
    save.click();
    await fixture.whenStable();

    http.expectOne({ method: 'POST', url: adaylarUrl })
      .flush({ message: 'Doğum tarihi geçmişte olmalıdır.' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(root.querySelector('tbody')?.textContent).toContain('Ada Yılmaz');
    expect(root.textContent).toContain('Doğum tarihi geçmişte olmalıdır.');
    expect(root.querySelector<HTMLInputElement>('[formcontrolname="ad"]')?.value).toBe('Ece');
    expect(save.disabled).toBe(false);
    http.expectNone(request => request.method === 'DELETE');
  });
});
