import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { AuthUser, LoginResponse } from '../models/auth.models';
import { API_BASE_URL } from './api-url';
import { AUTH_TOKEN_STORAGE_KEY, AuthService, LOGIN_URL } from './auth.service';

describe('AuthService', () => {
  const user: AuthUser = {
    kullaniciId: 1, kullaniciAdi: 'admin', rol: 'ADMIN', displayName: 'Yönetici',
    kurulusNo: null, adayId: null, uzmanId: null,
  };
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  });

  it('stores the authenticated session in the current tab and clears it on logout', async () => {
    const credentials = { kullaniciAdi: 'admin', sifre: 'admin123' };
    const login = firstValueFrom(auth.login(credentials));
    const request = http.expectOne({ method: 'POST', url: LOGIN_URL });
    expect(request.request.body).toEqual(credentials);
    request.flush({ accessToken: 'signed-token', tokenType: 'Bearer', expiresAt: '2026-11-25T14:00:00Z', user } satisfies LoginResponse);
    await login;

    expect(auth.user()).toEqual(user);
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.hasRole('ADMIN')).toBe(true);
    expect(auth.homeFor('ADMIN')).toBe('/admin');
    expect(sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe('signed-token');
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();

    auth.logout();
    expect(auth.user()).toBeNull();
    expect(auth.token).toBeNull();
    expect(sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('restores a valid token using the authenticated profile', async () => {
    sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'saved-token');
    const restore = auth.restore();
    const profile = http.expectOne(`${API_BASE_URL}/auth/me`);
    expect(profile.request.headers.get('Authorization')).toBe('Bearer saved-token');
    profile.flush(user);

    await restore;
    expect(auth.user()).toEqual(user);
  });

  it('clears a rejected token during session restoration', async () => {
    sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'expired-token');
    const restore = auth.restore();
    http.expectOne(`${API_BASE_URL}/auth/me`).flush(null, { status: 401, statusText: 'Unauthorized' });

    await restore;
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.token).toBeNull();
    expect(sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('allows the application to start signed out if the profile API is unreachable', async () => {
    sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'saved-token');
    const restore = auth.restore();
    http.expectOne(`${API_BASE_URL}/auth/me`).error(new ProgressEvent('error'));

    await restore;
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.token).toBeNull();
    expect(sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe('saved-token');
  });
});
