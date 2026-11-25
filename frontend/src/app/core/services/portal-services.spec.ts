import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_URL, SHOW_FORBIDDEN_IN_VIEW } from './api-url';
import { AdminSettingsService } from './admin-settings.service';
import { AdayPortalService } from './aday-portal.service';
import { KurulusPortalService } from './kurulus-portal.service';
import { UzmanPortalService } from './uzman-portal.service';

describe('portal HTTP services', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('searches by q and posts only the award and candidate choice', () => {
    const api = TestBed.inject(KurulusPortalService);
    api.search('Işık').subscribe();
    const search = http.expectOne(request => request.url === API_BASE_URL + '/portal/kurulus/aday-ara');
    expect(search.request.params.get('q')).toBe('Işık');
    search.flush([]);

    const body = { mevcutAdayId: 4, yeniAday: null, odulId: 2 };
    api.nominate(body).subscribe();
    const post = http.expectOne({ method: 'POST', url: API_BASE_URL + '/portal/kurulus/aday-gostermeler' });
    expect(post.request.body).toEqual(body);
    post.flush({});
  });

  it('asks for the signed-in candidate summary and updates privacy via PUT', () => {
    TestBed.inject(AdayPortalService).summary().subscribe();
    const summary = http.expectOne(API_BASE_URL + '/portal/aday/ozet');
    expect(summary.request.params.keys()).toEqual([]);
    summary.flush({});

    TestBed.inject(AdminSettingsService).setPrivacyMode({ mod: 'GIZLI' }).subscribe();
    const put = http.expectOne({ method: 'PUT', url: API_BASE_URL + '/admin/ayarlar/gizlilik-modu' });
    expect(put.request.body).toEqual({ mod: 'GIZLI' });
    put.flush({ mod: 'GIZLI' });
  });

  it('uses committee IDs in the route and posts expert votes with scoped error handling', () => {
    const api = TestBed.inject(UzmanPortalService);
    api.candidates(3).subscribe();
    const candidates = http.expectOne(API_BASE_URL + '/portal/uzman/komiteler/3/adaylar');
    expect(candidates.request.context.get(SHOW_FORBIDDEN_IN_VIEW)).toBe(true);
    candidates.flush([]);

    const body = { komiteId: 3, adayId: 5, olcut: 'Özgünlük', karar: 'KABUL' } as const;
    api.vote(body).subscribe();
    const post = http.expectOne({ method: 'POST', url: API_BASE_URL + '/portal/uzman/oylar' });
    expect(post.request.body).toEqual(body);
    post.flush({});
  });
});
