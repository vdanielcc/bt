import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, convertToParamMap, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { academyAdminGuard, systemAdminGuard } from './auth.guard';

describe('academyAdminGuard', () => {
  function check(role: string, academyId: number, authenticated = true): unknown {
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: {
      isAuthenticated: () => authenticated, getCurrentUser: () => ({ rol: role, academieId: 7 })
    } }] });
    const route = { paramMap: convertToParamMap({}), parent: { paramMap: convertToParamMap({ academyId }) } } as ActivatedRouteSnapshot;
    const result = TestBed.runInInjectionContext(() => academyAdminGuard(route, {} as RouterStateSnapshot));
    return result === true ? true : TestBed.inject(Router).serializeUrl(result as any);
  }
  it('allows an academy administrator in their own academy', () => expect(check('academy_admin', 7)).toBe(true));
  it('rejects another academy even with an administrator session', () => expect(check('academy_admin', 8)).toBe('/'));
  for (const role of ['instructor', 'apoderado', 'alumno']) {
    it(`rejects the ${role} profile`, () => expect(check(role, 7)).toBe('/'));
  }
  it('redirects an expired session to login', () => expect(check('academy_admin', 7, false)).toBe('/login'));
});

describe('systemAdminGuard', () => {
  for (const role of ['admin', 'academy_admin', 'instructor', 'apoderado', 'alumno']) {
    it(`checks access for ${role}`, () => {
      TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: {
        isAuthenticated: () => true, getCurrentUser: () => ({ rol: role })
      } }] });
      const result = TestBed.runInInjectionContext(() => systemAdminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
      if (role === 'admin') expect(result).toBe(true);
      else expect(TestBed.inject(Router).serializeUrl(result as any)).toBe('/');
    });
  }
  it('returns to login for an expired admin session', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: { isAuthenticated: () => false } }] });
    const result = TestBed.runInInjectionContext(() => systemAdminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    expect(TestBed.inject(Router).serializeUrl(result as any)).toBe('/login');
  });
});
