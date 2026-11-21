import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';

export abstract class ResourceHttpService<T> {
  protected readonly http = inject(HttpClient);
  private readonly api = 'http://localhost:8080/api';

  protected constructor(private readonly resource: string) {}

  list(): Observable<T[]> { return this.http.get<T[]>(`${this.api}/${this.resource}`); }
  create(values: Partial<T> | Record<string, unknown>): Observable<T> {
    return this.http.post<T>(`${this.api}/${this.resource}`, values);
  }
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${this.resource}/${id}`);
  }
}
