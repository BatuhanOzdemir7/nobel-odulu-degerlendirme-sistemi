import { HttpClient, HttpContext, HttpContextToken, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, Observable, tap } from 'rxjs';
import { AuthUser, LoginRequest, LoginResponse, Rol } from '../models/auth.models';
import { API_BASE_URL } from './api-url';

export const AUTH_TOKEN_STORAGE_KEY = 'nobel.accessToken';
export const LOGIN_URL = `${API_BASE_URL}/auth/login`;
export const RESTORING_SESSION = new HttpContextToken(() => false);

const HOMES: Record<Rol, string> = {
  ADMIN: '/admin',
  KURULUS: '/portal/kurulus',
  ADAY: '/portal/aday',
  UZMAN: '/portal/uzman',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly currentUser = signal<AuthUser | null>(null);
  private accessToken: string | null = null;

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);

  get token(): string | null {
    return this.accessToken;
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(LOGIN_URL, request).pipe(
      tap(({ accessToken, user }) => {
        this.accessToken = accessToken;
        this.currentUser.set(user);
        try {
          sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, accessToken);
        } catch {
          // Oturum, tarayıcı depolamayı engellese de bu sayfada çalışır.
        }
      }),
    );
  }

  logout(): void {
    this.accessToken = null;
    this.currentUser.set(null);
    try {
      sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    } catch {
      // Bellekteki oturum zaten temizlendi.
    }
  }

  async restore(): Promise<void> {
    let savedToken: string | null;
    try {
      savedToken = sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    } catch {
      return;
    }
    if (!savedToken) return;

    this.accessToken = savedToken;
    try {
      const user = await firstValueFrom(this.http.get<AuthUser>(`${API_BASE_URL}/auth/me`, {
        context: new HttpContext().set(RESTORING_SESSION, true),
        timeout: 5000,
      }));
      if (this.accessToken === savedToken) this.currentUser.set(user);
    } catch (error) {
      if (this.accessToken !== savedToken) return;
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.logout();
        return;
      }
      // A temporary connection failure leaves the stored token available for a later reload.
      this.accessToken = null;
      this.currentUser.set(null);
    }
  }

  hasRole(...roller: Rol[]): boolean {
    const user = this.user();
    return user !== null && roller.includes(user.rol);
  }

  homeFor(rol: Rol): string {
    return HOMES[rol];
  }
}
