import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, finalize, map, shareReplay, switchMap, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  AuthSession,
  Country,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest
} from './auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private refreshRequest?: Observable<AuthSession>;
  get refreshing(): boolean { return !!this.refreshRequest; }

  get expiresAt(): number | null {
    const token = this.getCurrentUser()?.token;
    if (!token || token.split('.').length !== 3) return null;
    try {
      const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const exp = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, '='))).exp;
      return typeof exp === 'number' ? exp * 1000 : null;
    } catch { return null; }
  }

  refreshSession(rememberMe = false): Observable<AuthSession> {
    if (this.refreshRequest) return this.refreshRequest;
    const current = this.getCurrentUser();
    if (!current?.refreshToken) return throwError(() => new Error('No es posible renovar esta sesión. Inicia sesión nuevamente.'));
    this.refreshRequest = this.http.post<any>(`${this.apiUrl}/auth/refresh`, { refreshToken: current.refreshToken, ...(rememberMe ? { rememberMe: true } : {}) }).pipe(
      timeout(15000),
      map(response => {
        const payload = this.extractData<any>(response, 'refresh');
        const token = payload.token ?? payload.Token ?? payload.accessToken ?? payload.AccessToken;
        const refreshToken = payload.refreshToken ?? payload.RefreshToken;
        if (!token || !refreshToken || !this.isTokenActive(token)) throw new Error('La API no devolvió una sesión válida.');
        if (this.getCurrentUser() !== current) throw new Error('La sesión cambió durante la renovación.');
        const session = { ...current, token, refreshToken };
        this.setSession(session);
        return session;
      }),
      finalize(() => this.refreshRequest = undefined),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.refreshRequest;
  }
  private readonly storageKey = 'bte-auth-session';
  private readonly apiUrl = environment.apiBaseUrl;

  private currentUserSubject = new BehaviorSubject<AuthSession | null>(
    this.loadSession()
  );

  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  get impersonating(): boolean {
    return !!sessionStorage.getItem('bte-impersonated-session');
  }

  impersonate(academyId: number): Observable<AuthSession> {
    if (this.getCurrentUser()?.rol !== 'admin' || this.impersonating || this.refreshing) {
      return throwError(() => new Error('Este acceso requiere una sesión de administrador disponible.'));
    }
    const administrator = this.getCurrentUser();
    return this.http.post<any>(`${this.apiUrl}/auth/impersonate/${academyId}`, {}).pipe(
      map(response => this.extractData<AuthSession>(response, 'login')),
      map(session => {
        if (this.getCurrentUser() !== administrator) throw new Error('La sesión cambió. Intenta nuevamente.');
        if (!session.token || !this.isTokenActive(session.token) || session.rol !== 'academy_admin'
            || session.academieId !== academyId) throw new Error('La API no devolvió una sesión válida de la academia.');
        // Mantener el acceso delegado en esta pestaña y conservar la sesión del admin.
        sessionStorage.setItem('bte-impersonated-session', JSON.stringify(session));
        this.currentUserSubject.next(session);
        return session;
      }),
      catchError(error => this.handleError(error))
    );
  }

  returnToAdministrator(): Observable<AuthSession> {
    const delegated = this.getCurrentUser();
    if (!this.impersonating || this.refreshing) return throwError(() => new Error('La sesión no está disponible para volver.'));
    const revoke = delegated?.refreshToken && this.isTokenActive(delegated.token)
      ? this.http.post(`${this.apiUrl}/auth/logout`, { refreshToken: delegated.refreshToken }).pipe(catchError(() => of(null)))
      : of(null);
    return revoke.pipe(map(() => {
      sessionStorage.removeItem('bte-impersonated-session');
      const administrator = this.loadSession();
      this.currentUserSubject.next(administrator);
      if (!administrator || administrator.rol !== 'admin') throw new Error('Inicia sesión nuevamente como administrador.');
      return administrator;
    }), switchMap(administrator => this.isTokenActive(administrator.token) ? of(administrator) : this.refreshSession()));
  }

  login(request: LoginRequest): Observable<AuthSession> {
    return this.http
      .post<any>(`${this.apiUrl}/auth/login`, request)
      .pipe(
        map((response): AuthSession => this.extractData<AuthSession>(response, 'login')),
        map((session: AuthSession) => {
          sessionStorage.removeItem('bte-impersonated-session');
          this.setSession(session);
          return session;
        }),
        catchError((error) => this.handleError(error))
      );
  }

  register(request: RegisterRequest): Observable<RegisterResponse> {
    return this.http
      .post<any>(`${this.apiUrl}/auth/register`, request)
      .pipe(
        map((response): RegisterResponse => this.extractData<RegisterResponse>(response, 'register')),
        catchError((error) => this.handleError(error))
      );
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<void> {
    return this.http
      .post<any>(`${this.apiUrl}/auth/forgot-password`, request)
      .pipe(
        map((response) => this.extractData(response, 'forgot-password')),
        map(() => undefined),
        catchError((error) => this.handleError(error))
      );
  }

  resetPassword(request: ResetPasswordRequest): Observable<void> {
    return this.http
      .post<any>(`${this.apiUrl}/auth/reset-password`, request)
      .pipe(
        map((response) => this.extractData(response, 'reset-password')),
        map(() => undefined),
        catchError((error) => this.handleError(error))
      );
  }

  logout(): Observable<void> {
    const refreshToken = this.getCurrentUser()?.refreshToken?.trim();

    if (!refreshToken) {
      this.clearSession();
      return of(undefined);
    }

    return this.http
      .post<void>(`${this.apiUrl}/auth/logout`, { refreshToken })
      .pipe(finalize(() => this.clearSession()));
  }

  clearSession(): void {
    const analytics = ['analytics-visitor', 'analytics-session', 'analytics-last-activity', 'analytics-session-account']
      .map(key => [key, localStorage.getItem(key)] as const);
    localStorage.clear();
    analytics.forEach(([key, value]) => { if (value) localStorage.setItem(key, value); });
    sessionStorage.clear();
    this.clearCookies();
    this.currentUserSubject.next(null);
  }

  getCountries(): Observable<Country[]> {
    return this.http.get<any>(`${this.apiUrl}/Countries`).pipe(
      map((response) => {
        const payload = response?.data ?? response?.Data ?? response;
        const countries = Array.isArray(payload)
          ? payload
          : payload?.countries ?? payload?.Countries ?? [];

        return countries.map((country: any) => ({
          id: Number(country.id ?? country.Id),
          name: country.name ?? country.Name ?? country.nombre ?? country.Nombre ?? '',
          code: String(
            country.code ?? country.Code ?? country.isoCode ?? country.IsoCode ?? ''
          ).toUpperCase()
        }));
      }),
      catchError((error) => this.handleError(error))
    );
  }

  private clearCookies(): void {
    const hostname = window.location.hostname;
    const paths = this.cookiePaths();

    document.cookie.split(';').forEach((cookie) => {
      const separatorIndex = cookie.indexOf('=');
      const name = (separatorIndex >= 0 ? cookie.slice(0, separatorIndex) : cookie).trim();

      if (!name) {
        return;
      }

      paths.forEach((path) => {
        document.cookie = `${name}=; Max-Age=0; path=${path}`;
        document.cookie = `${name}=; Max-Age=0; path=${path}; domain=${hostname}`;
        document.cookie = `${name}=; Max-Age=0; path=${path}; domain=.${hostname}`;
      });
    });
  }

  private cookiePaths(): string[] {
    const segments = window.location.pathname.split('/').filter(Boolean);
    const paths = ['/'];

    while (segments.length) {
      paths.push(`/${segments.join('/')}`);
      segments.pop();
    }

    return [...new Set(paths)];
  }

  getCurrentUser(): AuthSession | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    if (this.refreshing && this.getCurrentUser()) return true;
    const token = this.getCurrentUser()?.token?.trim();

    if (!token || !this.isTokenActive(token)) {
      if (this.getCurrentUser()) {
        this.clearSession();
      }
      return false;
    }

    return true;
  }

  syncStoredSession(): void {
    this.currentUserSubject.next(this.loadSession());
  }

  private isTokenActive(token: string): boolean {
    const parts = token.split('.');

    // Los tokens opacos solo pueden ser validados por el backend. El interceptor
    // cerrará la sesión si una petición autenticada recibe 401.
    if (parts.length !== 3) {
      return true;
    }

    try {
      const normalizedPayload = parts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
      const payload = JSON.parse(atob(normalizedPayload)) as { exp?: number };

      return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  private setSession(session: AuthSession): void {
    if (this.impersonating) sessionStorage.setItem('bte-impersonated-session', JSON.stringify(session));
    else localStorage.setItem(this.storageKey, JSON.stringify(session));
    this.currentUserSubject.next(session);
  }

  private loadSession(): AuthSession | null {
    const delegated = sessionStorage.getItem('bte-impersonated-session');
    const storage = delegated ? sessionStorage : localStorage;
    const key = delegated ? 'bte-impersonated-session' : this.storageKey;
    const rawSession = storage.getItem(key);

    if (!rawSession) {
      return null;
    }

    try {
      const storedSession = JSON.parse(rawSession) as any;
      const payload = storedSession?.data ?? storedSession?.Data ?? storedSession;

      if (!this.isLoginPayload(payload)) {
        storage.removeItem(key);
        return null;
      }

      const session = this.mapLoginPayload(payload);

      // Migra contratos antiguos (Token/Data) al formato interno actual.
      storage.setItem(key, JSON.stringify(session));
      return session;
    } catch {
      storage.removeItem(key);
      return null;
    }
  }

  private extractData<T>(response: any | null, action: string): T {
    if (!response) {
      throw new Error(`No se recibió una respuesta válida desde ${action}.`);
    }

    const estado = response.estado ?? response.Estado;
    const message = response.message ?? response.Message ?? '';
    const data = response.data ?? response.Data;

    if (estado === 'error') {
      throw new Error(message || 'La solicitud falló.');
    }

    const payload = data ?? response;

    if (payload === null || payload === undefined) {
      throw new Error('La API no devolvió datos.');
    }

    if (action === 'login' && this.isLoginPayload(payload)) {
      return this.mapLoginPayload(payload) as T;
    }

    return payload as T;
  }

  private isLoginPayload(payload: any): boolean {
    return !!payload && typeof payload === 'object' && (
      'Id' in payload ||
      'id' in payload ||
      'Token' in payload ||
      'token' in payload ||
      'AccessToken' in payload ||
      'accessToken' in payload
    );
  }

  private mapLoginPayload(payload: any): AuthSession {
    return {
      id: payload.id ?? payload.Id ?? 0,
      email: payload.email ?? payload.Email ?? '',
      academieId: payload.academieId ?? payload.AcademieId ?? 0,
      personId: payload.personId ?? payload.PersonId ?? 0,
      nombreCompleto: payload.nombreCompleto ?? payload.NombreCompleto ?? '',
      rol: payload.rol ?? payload.Rol ?? '',
      membresia: payload.membresia ?? payload.Membresia ?? '',
      token:
        payload.token ??
        payload.Token ??
        payload.accessToken ??
        payload.AccessToken ??
        '',
      refreshToken:
        payload.refreshToken ??
        payload.RefreshToken ??
        ''
    };
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    const payload = error?.error;
    const message =
      payload?.message ||
      payload?.mensaje ||
      payload?.Message ||
      payload?.Mensaje ||
      error?.message ||
      'No fue posible completar la solicitud.';

    return throwError(() => new Error(message));
  }
}
