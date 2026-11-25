import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CommitteeCandidate, DecisionRequest, EvaluationResult, ExpertCommittee, ExpertVoteRequest, VoteResult } from '../models/portal.models';
import { API_BASE_URL, SHOW_FORBIDDEN_IN_VIEW } from './api-url';

@Injectable({ providedIn: 'root' })
export class UzmanPortalService {
  private readonly http = inject(HttpClient);
  private readonly url = API_BASE_URL + '/portal/uzman';

  committees() { return this.http.get<ExpertCommittee[]>(this.url + '/komitelerim'); }
  criteria() { return this.http.get<string[]>(this.url + '/olcutler'); }
  candidates(committeeId: number) {
    return this.http.get<CommitteeCandidate[]>(this.url + '/komiteler/' + committeeId + '/adaylar', this.options());
  }
  vote(request: ExpertVoteRequest) {
    return this.http.post<VoteResult>(this.url + '/oylar', request, this.options());
  }
  finalize(request: DecisionRequest) {
    return this.http.post<EvaluationResult>(this.url + '/karar-kesinlestir', request, this.options());
  }

  private options() {
    return { context: new HttpContext().set(SHOW_FORBIDDEN_IN_VIEW, true) };
  }
}
