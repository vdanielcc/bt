import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { SessionExpirationService } from './session-expiration.service';
import { MatDialog } from '@angular/material/dialog';
import { HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('SessionExpirationService', () => {
  let service: SessionExpirationService;
  let router: jasmine.SpyObj<Router>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let reference: any;

  function configure(expiresInSeconds?: number): void {
    localStorage.removeItem('bte-auth-session');
    if (expiresInSeconds !== undefined) {
      const payload = btoa(JSON.stringify({ exp: Date.now() / 1000 + expiresInSeconds }));
      localStorage.setItem('bte-auth-session', JSON.stringify({ token: `header.${payload}.signature`, refreshToken: 'old-refresh', academieId: 9 }));
    }
    router = jasmine.createSpyObj('Router', ['navigateByUrl']);
    router.navigateByUrl.and.returnValue(Promise.resolve(true));
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    reference = { componentInstance: {}, close: jasmine.createSpy('close') };
    dialog.open.and.returnValue(reference);
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: Router, useValue: router }, { provide: MatDialog, useValue: dialog }]
    });
    service = TestBed.inject(SessionExpirationService);
  }

  afterEach(() => {
    service.ngOnDestroy();
    localStorage.removeItem('bte-auth-session');
  });

  it('redirects an idle session when its JWT expires, only once', fakeAsync(() => {
    configure(2);
    service.start();
    tick(1000);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    tick(1000);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login', { replaceUrl: true });
    expect(localStorage.getItem('bte-auth-session')).toBeNull();
    tick(3000);
    expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
    service.ngOnDestroy();
  }));

  it('redirects a stored expired session immediately', () => {
    configure(-1);
    service.start();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login', { replaceUrl: true });
  });

  it('keeps public pages accessible without a session', fakeAsync(() => {
    configure();
    service.start();
    tick(2000);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    service.ngOnDestroy();
  }));

  it('checks expiration when the window regains focus', () => {
    configure(60);
    service.start();
    spyOn(Date, 'now').and.returnValue(Date.now() + 61000);
    window.dispatchEvent(new Event('focus'));
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login', { replaceUrl: true });
  });

  it('opens once at 20 seconds and updates the countdown', fakeAsync(() => {
    configure(21); service.start();
    expect(dialog.open).not.toHaveBeenCalled();
    tick(1000);
    expect(reference.componentInstance.seconds).toBe(20);
    tick(3000);
    expect(reference.componentInstance.seconds).toBe(17);
    expect(dialog.open).toHaveBeenCalledTimes(1);
    service.ngOnDestroy();
  }));

  it('renews both tokens and preserves the screen and academy, even when renewal crosses expiry', fakeAsync(() => {
    configure(1); service.start();
    const actions = (dialog.open.calls.mostRecent().args[1] as any).data;
    actions.continue(); actions.continue();
    const http = TestBed.inject(HttpTestingController);
    const req = http.expectOne(request => request.url.endsWith('/auth/refresh'));
    expect(req.request.body).toEqual({ refreshToken: 'old-refresh' });
    tick(2000);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    const token = `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 }))}.signature`;
    req.flush({ data: { accessToken: token, refreshToken: 'new-refresh' } });
    expect(TestBed.inject(AuthService).getCurrentUser()?.academieId).toBe(9);
    expect(TestBed.inject(AuthService).getCurrentUser()?.refreshToken).toBe('new-refresh');
    expect(JSON.parse(localStorage.getItem('bte-auth-session')!).token).toBe(token);
    expect(reference.close).toHaveBeenCalled();
    tick(1000);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    http.verify(); service.ngOnDestroy();
  }));

  it('allows retry after a refresh failure and closes on expiry', fakeAsync(() => {
    configure(5); service.start();
    (dialog.open.calls.mostRecent().args[1] as any).data.continue();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(request => request.url.endsWith('/auth/refresh')).flush({}, { status: 500, statusText: 'Error' });
    expect(reference.componentInstance.busy).toBeFalse();
    expect(reference.componentInstance.error).toContain('No se pudo renovar');
    tick(5000);
    expect(router.navigateByUrl).toHaveBeenCalled();
    http.verify(); service.ngOnDestroy();
  }));

  it('saves a twelve hour session and keeps it active until its server-issued expiration', fakeAsync(() => {
    configure(10); service.start();
    (dialog.open.calls.mostRecent().args[1] as any).data.continue(true);
    const http = TestBed.inject(HttpTestingController);
    const req = http.expectOne(request => request.url.endsWith('/auth/refresh'));
    expect(req.request.body).toEqual({ refreshToken: 'old-refresh', rememberMe: true });
    const token = `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 43200 }))}.signature`;
    req.flush({ data: { accessToken: token, refreshToken: 'long-refresh' } });
    tick(16 * 60 * 1000);
    expect(TestBed.inject(AuthService).isAuthenticated()).toBeTrue();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('bte-auth-session')!).token).toBe(token);
    tick((43200 - 16 * 60) * 1000);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login', { replaceUrl: true });
    http.verify(); service.ngOnDestroy();
  }));

  it('closes immediately when the user chooses logout and revokes the refresh token', () => {
    configure(20); service.start();
    (dialog.open.calls.mostRecent().args[1] as any).data.logout();
    expect(localStorage.getItem('bte-auth-session')).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalled();
    const http = TestBed.inject(HttpTestingController);
    const req = http.expectOne(request => request.url.endsWith('/auth/logout'));
    expect(req.request.body.refreshToken).toBe('old-refresh');
    req.flush({}); http.verify();
  });
});
