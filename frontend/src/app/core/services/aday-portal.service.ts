import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CandidateSummary } from '../models/portal.models';
import { API_BASE_URL } from './api-url';

@Injectable({ providedIn: 'root' })
export class AdayPortalService {
  private readonly http = inject(HttpClient);

  summary() { return this.http.get<CandidateSummary>(API_BASE_URL + '/portal/aday/ozet'); }
}
