import { TestBed } from '@angular/core/testing';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('AuthInterceptor permission responses', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.setItem('bte-auth-session', JSON.stringify({ token: 'test-token' }));
    auth = jasmine.createSpyObj('AuthService', ['clearSession', 'getCurrentUser']);
    auth.getCurrentUser.and.returnValue({ token: 'test-token' } as any);
    router = jasmine.createSpyObj('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [
      { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
      { provide: AuthService, useValue: auth }, { provide: Router, useValue: router }
    ] });
    http = TestBed.inject(HttpClient); backend = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { backend.verify(); localStorage.removeItem('bte-auth-session'); sessionStorage.clear(); });
  it('sends the academy token while impersonating', () => {
    sessionStorage.setItem('bte-impersonated-session', JSON.stringify({ token: 'academy-token' }));
    http.get('https://apidemo.budotournaments.net/api/academies/7/users').subscribe();
    const req = backend.expectOne('https://apidemo.budotournaments.net/api/academies/7/users');
    expect(req.request.headers.get('Authorization')).toBe('Bearer academy-token');
    req.flush([]);
  });
  it('does not expose bearer tokens to another origin or a sibling API path', () => {
    for (const url of ['https://attacker.test/api/users', 'https://apidemo.budotournaments.net/api-foreign/users', '/assets/file.json']) {
      http.get(url).subscribe();
      const req = backend.expectOne(url);
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush({});
    }
  });
  it('keeps the session on a forbidden academy operation', () => {
    let status = 0;
    http.get('https://apidemo.budotournaments.net/api/academies/8/users').subscribe({ error: error => status = error.status });
    backend.expectOne('https://apidemo.budotournaments.net/api/academies/8/users').flush({}, { status: 403, statusText: 'Forbidden' });
    expect(status).toBe(403); expect(auth.clearSession).not.toHaveBeenCalled(); expect(router.navigate).not.toHaveBeenCalled();
  });
  it('returns to login when the API rejects the session', () => {
    http.get('https://apidemo.budotournaments.net/api/academies/7/users').subscribe({ error: () => {} });
    backend.expectOne('https://apidemo.budotournaments.net/api/academies/7/users').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.clearSession).toHaveBeenCalled(); expect(router.navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  });
  it('does not discard a renewed session for a late response to an old token', () => {
    http.get('https://apidemo.budotournaments.net/api/academies/7/users').subscribe({ error: () => {} });
    auth.getCurrentUser.and.returnValue({ token: 'renewed-token' } as any);
    backend.expectOne('https://apidemo.budotournaments.net/api/academies/7/users').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.clearSession).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
