import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../services/api-url';
import { AuthService, LOGIN_URL } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  const api = `${API_BASE_URL}/kategoriler`;
  let http: HttpClient;
  let requests: HttpTestingController;
  const auth = { token: 'signed-token' as string | null, logout: vi.fn() };
  const router = { url: '/admin/kayitlar', navigate: vi.fn() };

  beforeEach(() => {
    auth.token = 'signed-token';
    auth.logout.mockReset().mockImplementation(() => { auth.token = null; });
    router.navigate.mockReset().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => requests.verify());

  it('adds the bearer header to the configured API path only', async () => {
    const authorized = firstValueFrom(http.get(api));
    const request = requests.expectOne(api);
    expect(request.request.headers.get('Authorization')).toBe('Bearer signed-token');
    request.flush([]);
    await authorized;

    for (const url of ['https://example.org/api/kategoriler', 'http://localhost:8080/apiv2', `${API_BASE_URL}/../other`]) {
      const result = firstValueFrom(http.get(url));
      const external = requests.expectOne(url);
      expect(external.request.headers.has('Authorization')).toBe(false);
      external.flush([]);
      await result;
    }
  });

  it('clears expired sessions and redirects to login with the current route', async () => {
    await respondWithError(firstValueFrom(http.get(api)), api, 401);
    expect(auth.logout).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { reason: 'expired', returnUrl: '/admin/kayitlar' },
    });
  });

  it('redirects 403 to forbidden and keeps the session', async () => {
    await respondWithError(firstValueFrom(http.get(api)), api, 403);
    expect(auth.logout).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/forbidden']);
  });

  it('leaves a login 401 to the login component', async () => {
    await respondWithError(firstValueFrom(http.post(LOGIN_URL, {})), LOGIN_URL, 401);
    expect(auth.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('does not clear a newer session when an older request fails', async () => {
    const older = firstValueFrom(http.get(api));
    auth.token = 'newer-token';
    await respondWithError(older, api, 401);
    expect(auth.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  async function respondWithError(result: Promise<unknown>, url: string, status: number): Promise<void> {
    const rejected = expect(result).rejects.toMatchObject({ status } satisfies Partial<HttpErrorResponse>);
    requests.expectOne(url).flush(null, { status, statusText: 'Erişim hatası' });
    await rejected;
  }
});
