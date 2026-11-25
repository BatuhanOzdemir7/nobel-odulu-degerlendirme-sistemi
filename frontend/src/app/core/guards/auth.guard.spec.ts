import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { Rol } from '../models/auth.models';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';
import { roleGuard } from './role.guard';

describe('authentication and role guards', () => {
  const role = signal<Rol | null>(null);
  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/admin' } as RouterStateSnapshot;
  let router: Router;

  beforeEach(() => {
    role.set(null);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => role() !== null,
            hasRole: (required: Rol) => role() === required,
          },
        },
      ],
    });
    router = TestBed.inject(Router);
  });

  it('redirects an unauthenticated visit to login with its original destination', () => {
    const result = TestBed.runInInjectionContext(() => authGuard(route, state)) as UrlTree;
    expect(router.serializeUrl(result)).toBe('/login?returnUrl=%2Fadmin');
  });

  it('allows authenticated users and enforces the route role', () => {
    role.set('ADMIN');
    expect(TestBed.runInInjectionContext(() => authGuard(route, state))).toBe(true);
    expect(TestBed.runInInjectionContext(() => roleGuard('ADMIN')(route, state))).toBe(true);
    role.set('KURULUS');
    const result = TestBed.runInInjectionContext(() => roleGuard('ADMIN')(route, state)) as UrlTree;
    expect(router.serializeUrl(result)).toBe('/forbidden');
  });

  it('also redirects a signed-out visit when only the role guard is used', () => {
    const result = TestBed.runInInjectionContext(() => roleGuard('UZMAN')(route, state)) as UrlTree;
    expect(router.serializeUrl(result)).toBe('/login?returnUrl=%2Fadmin');
  });
});
