import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('normaliza la respuesta de login del backend al modelo de sesión del frontend', () => {
    let session: any;

    service.login({ username: 'admin@test.com', password: 'secret123' }).subscribe((value) => {
      session = value;
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`);
    expect(req.request.method).toBe('POST');

    req.flush({
      estado: 'success',
      codigo: 200,
      message: 'Usuario logiado correctamente.',
      data: {
        Id: 7,
        Email: 'admin@test.com',
        AcademieId: 3,
        PersonId: 4,
        NombreCompleto: 'Admin Test',
        Rol: 'admin',
        Membresia: 'plata',
        Token: 'jwt-token'
      }
    });

    expect(session?.token).toBe('jwt-token');
    expect(session?.email).toBe('admin@test.com');
    expect(session?.rol).toBe('admin');
    expect(localStorage.getItem('bte-auth-session')).toContain('jwt-token');
  });
  function administrator(): void {
    localStorage.setItem('bte-auth-session', JSON.stringify({ id: 1, rol: 'admin', token: 'admin-token', refreshToken: 'admin-refresh' }));
    service.syncStoredSession();
  }

  it('uses a real academy session only in this tab and restores the administrator', () => {
    administrator();
    service.impersonate(7).subscribe();
    httpMock.expectOne(`${environment.apiBaseUrl}/auth/impersonate/7`).flush({ data: {
      Id: 20, Rol: 'academy_admin', AcademieId: 7, Token: 'academy-token', RefreshToken: 'academy-refresh'
    }});
    expect(service.getCurrentUser()?.id).toBe(20);
    expect(service.impersonating).toBe(true);
    expect(JSON.parse(localStorage.getItem('bte-auth-session')!).token).toBe('admin-token');
    service.syncStoredSession();
    expect(service.getCurrentUser()?.token).toBe('academy-token');
    service.returnToAdministrator().subscribe();
    const logout = httpMock.expectOne(`${environment.apiBaseUrl}/auth/logout`);
    expect(logout.request.body.refreshToken).toBe('academy-refresh');
    logout.flush({});
    expect(service.getCurrentUser()?.rol).toBe('admin');
    expect(service.impersonating).toBe(false);
  });

  it('preserves the administrator when the academy has no available principal account', () => {
    administrator();
    service.impersonate(7).subscribe({ error: () => {} });
    httpMock.expectOne(`${environment.apiBaseUrl}/auth/impersonate/7`).flush({ message: 'No disponible' }, { status: 409, statusText: 'Conflict' });
    expect(service.getCurrentUser()?.rol).toBe('admin');
    expect(service.impersonating).toBe(false);
  });

  it('rejects a response for a different academy', () => {
    administrator();
    service.impersonate(7).subscribe({ error: () => {} });
    httpMock.expectOne(`${environment.apiBaseUrl}/auth/impersonate/7`).flush({ data: {
      Rol: 'academy_admin', AcademieId: 8, Token: 'academy-token'
    }});
    expect(service.getCurrentUser()?.rol).toBe('admin');
    expect(service.impersonating).toBe(false);
  });

  it('does not send impersonation requests from an academy administrator', () => {
    localStorage.setItem('bte-auth-session', JSON.stringify({ rol: 'academy_admin', token: 'academy-token' }));
    service.syncStoredSession();
    let rejected = false;
    service.impersonate(7).subscribe({ error: () => rejected = true });
    expect(rejected).toBe(true);
    httpMock.expectNone(`${environment.apiBaseUrl}/auth/impersonate/7`);
  });

  it('renews an expired administrator session when returning', () => {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 }));
    localStorage.setItem('bte-auth-session', JSON.stringify({ id: 1, rol: 'admin', token: `header.${payload}.signature`, refreshToken: 'admin-refresh' }));
    sessionStorage.setItem('bte-impersonated-session', JSON.stringify({ id: 20, rol: 'academy_admin', token: 'academy-token', refreshToken: 'academy-refresh' }));
    service.syncStoredSession();
    service.returnToAdministrator().subscribe();
    httpMock.expectOne(`${environment.apiBaseUrl}/auth/logout`).flush({});
    const refresh = httpMock.expectOne(`${environment.apiBaseUrl}/auth/refresh`);
    expect(refresh.request.body.refreshToken).toBe('admin-refresh');
    refresh.flush({ data: { accessToken: 'renewed-admin-token', refreshToken: 'renewed-admin-refresh' } });
    expect(service.getCurrentUser()?.token).toBe('renewed-admin-token');
    expect(service.getCurrentUser()?.rol).toBe('admin');
  });
});
