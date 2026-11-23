import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { SessionWarningDialogComponent } from './session-warning-dialog.component';
import { timeout } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class SessionExpirationService implements OnDestroy {
  private intervalId?: ReturnType<typeof setInterval>;
  private warning?: MatDialogRef<SessionWarningDialogComponent>;

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly zone: NgZone,
    private readonly dialog: MatDialog
  ) {}

  start(): void {
    if (this.intervalId !== undefined) return;

    // También valida al recuperar una pestaña que el navegador haya suspendido.
    this.zone.runOutsideAngular(() => {
      this.intervalId = setInterval(this.checkSession, 1000);
      window.addEventListener('focus', this.checkSession);
      document.addEventListener('visibilitychange', this.checkSession);
      window.addEventListener('storage', this.storageChanged);
    });
    this.checkSession();
  }

  private readonly checkSession = (): void => {
    if (!this.auth.getCurrentUser()) { this.closeWarning(); return; }

    this.zone.run(() => {
      const expiresAt = this.auth.expiresAt;
      const seconds = expiresAt === null ? null : Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      if (this.warning && seconds !== null) this.warning.componentInstance.seconds = seconds;
      if (this.auth.refreshing) return;
      if (!this.auth.isAuthenticated()) {
        this.closeWarning();
        void this.router.navigateByUrl('/login', { replaceUrl: true });
      } else if (seconds !== null && seconds <= 20) {
        if (!this.warning) {
          this.warning = this.dialog.open(SessionWarningDialogComponent, {
            width: '440px', maxWidth: '95vw', disableClose: true, closeOnNavigation: false,
            data: { continue: (rememberMe = false) => this.continueSession(rememberMe), logout: () => this.logout() }
          });
        }
        this.warning.componentInstance.seconds = seconds;
      } else {
        this.closeWarning();
      }
    });
  };

  private readonly storageChanged = (event: StorageEvent): void => {
    if (event.key !== 'bte-auth-session' && event.key !== null) return;
    this.zone.run(() => {
      this.auth.syncStoredSession();
      this.checkSession();
      if (!this.auth.getCurrentUser()) void this.router.navigateByUrl('/login', { replaceUrl: true });
    });
  };

  private continueSession(rememberMe = false): void {
    if (!this.warning || this.auth.refreshing) return;
    const instance = this.warning.componentInstance;
    instance.busy = true;
    instance.error = '';
    this.auth.refreshSession(rememberMe).subscribe({
      next: () => this.closeWarning(),
      error: () => {
        instance.busy = false;
        instance.error = 'No se pudo renovar la sesión. Intenta nuevamente antes de que termine la cuenta regresiva.';
      }
    });
  }

  private logout(): void {
    const request = this.auth.logout();
    this.auth.clearSession();
    this.closeWarning();
    void this.router.navigateByUrl('/login', { replaceUrl: true });
    request.pipe(timeout(10000)).subscribe({ error: () => {} });
  }

  private closeWarning(): void { this.warning?.close(); this.warning = undefined; }

  ngOnDestroy(): void {
    this.closeWarning();
    clearInterval(this.intervalId);
    this.intervalId = undefined;
    window.removeEventListener('focus', this.checkSession);
    document.removeEventListener('visibilitychange', this.checkSession);
    window.removeEventListener('storage', this.storageChanged);
  }
}
