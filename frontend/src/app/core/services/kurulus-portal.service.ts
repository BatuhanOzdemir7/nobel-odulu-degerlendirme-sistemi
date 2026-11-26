import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CandidateSearchResult, NominationRequest, NominationResponse, NominationView, PrizeOption } from '../models/portal.models';
import { API_BASE_URL } from './api-url';

@Injectable({ providedIn: 'root' })
export class KurulusPortalService {
  private readonly http = inject(HttpClient);
  private readonly url = API_BASE_URL + '/portal/kurulus';

  awards() { return this.http.get<PrizeOption[]>(this.url + '/oduller'); }
  search(query: string) {
    return this.http.get<CandidateSearchResult[]>(this.url + '/aday-ara', { params: { q: query } });
  }
  nominations() { return this.http.get<NominationView[]>(this.url + '/aday-gostermeler'); }
  nominate(request: NominationRequest) {
    return this.http.post<NominationResponse>(this.url + '/aday-gostermeler', request);
  }
}
