import { environment } from '../../../environments/environment';
import { Injectable, Injector } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthSession } from './auth.models';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private injector: Injector,
    private router: Router
  ) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    const api = new URL(environment.apiBaseUrl, window.location.origin);
    const target = new URL(request.url, window.location.origin);
    const apiPath = api.pathname.replace(/\/$/, '');
    if (target.origin !== api.origin || !(target.pathname === apiPath || target.pathname.startsWith(apiPath + '/'))) {
      return next.handle(request);
    }
    const rawSession = sessionStorage.getItem('bte-impersonated-session') ?? localStorage.getItem('bte-auth-session');

    if (!rawSession) {
      return next.handle(request);
    }

    try {
      const storedSession = JSON.parse(rawSession) as AuthSession & {
        Token?: string;
        accessToken?: string;
        AccessToken?: string;
        data?: Record<string, unknown>;
        Data?: Record<string, unknown>;
      };
      const payload = storedSession.data ?? storedSession.Data ?? storedSession;
      const token = String(
        payload.token ??
          payload.Token ??
          payload.accessToken ??
          payload.AccessToken ??
          ''
      ).trim();

      if (!token) {
        return next.handle(request);
      }

      const authRequest = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });

      return next.handle(authRequest).pipe(
        catchError((error) => {
          if (error?.status === 401) {
            const auth = this.injector.get(AuthService);
            if (!auth.refreshing && auth.getCurrentUser()?.token === token) {
              auth.clearSession();
              void this.router.navigate(['/login'], { replaceUrl: true });
            }
          }

          return throwError(() => error);
        })
      );
    } catch {
      return next.handle(request);
    }
  }
}
