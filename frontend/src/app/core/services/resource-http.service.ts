import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-url';

export abstract class ResourceHttpService<T> {
  protected readonly http = inject(HttpClient);

  protected constructor(private readonly resource: string) {}

  list(): Observable<T[]> { return this.http.get<T[]>(`${API_BASE_URL}/${this.resource}`); }
  create(values: Partial<T> | Record<string, unknown>): Observable<T> {
    return this.http.post<T>(`${API_BASE_URL}/${this.resource}`, values);
  }
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/${this.resource}/${id}`);
  }
}
