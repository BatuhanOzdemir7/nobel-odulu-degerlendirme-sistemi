import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { ApiError, Komite } from '../models/records';
import { API_BASE_URL } from './api-url';
import { ResourceHttpService } from './resource-http.service';
@Injectable({ providedIn: 'root' })
export class KomiteService extends ResourceHttpService<Komite> {
  constructor() { super('komiteler'); }
  addMember(komiteId: number, uzmanId: number): Observable<void> {
    return this.http.post<void>(`${API_BASE_URL}/komiteler/${komiteId}/uyeler/${uzmanId}`, {});
  }
  removeMember(komiteId: number, uzmanId: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/komiteler/${komiteId}/uyeler/${uzmanId}`)
      .pipe(catchError((error: HttpErrorResponse) => {
        const backend = error.error as ApiError | null;
        return throwError(() => new Error(backend?.message ?? error.message));
      }));
  }
}
