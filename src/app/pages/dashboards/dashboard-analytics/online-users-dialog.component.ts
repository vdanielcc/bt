import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { catchError, finalize, of, switchMap, timer } from 'rxjs';
import { AnalyticsService, OnlineUser } from '../../../core/analytics/analytics.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Usuarios en línea</h2>
    <mat-dialog-content>
      <p>Tiempo transcurrido desde el inicio de la conexión activa. Actualización cada 15 segundos.</p>
      <p *ngIf="loading" role="status">Cargando usuarios…</p>
      <p *ngIf="error" role="alert">{{ error }}</p>
      <p *ngIf="message" role="status">{{ message }}</p>
      <p *ngIf="!loading && !error && !users.length">No hay usuarios en línea.</p>
      <div class="overflow-x-auto" *ngIf="users.length">
        <table class="w-full">
          <thead><tr><th class="p-3 text-left">Usuario</th><th class="p-3 text-left">Tiempo conectado</th><th class="p-3 text-left">Acciones</th></tr></thead>
          <tbody><tr *ngFor="let user of users">
            <td class="p-3">{{ user.email }} <span *ngIf="user.userId === currentUserId">(Tú)</span></td>
            <td class="p-3" [title]="user.connectedAt | date:'dd/MM/yyyy HH:mm:ss'">{{ duration(user.connectedAt) }}</td>
            <td class="p-3">
              <button mat-button color="warn" *ngIf="confirming !== user.userId" [disabled]="busy !== null || user.userId === currentUserId" (click)="confirming = user.userId">Cerrar sesión</button>
              <ng-container *ngIf="confirming === user.userId">
                <p>¿Cerrar todas sus sesiones activas?</p>
                <button mat-button color="warn" [disabled]="busy !== null" (click)="logout(user)">Confirmar cierre</button>
                <button mat-button [disabled]="busy !== null" (click)="confirming = null">Cancelar</button>
              </ng-container>
            </td>
          </tr></tbody>
        </table>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end"><button mat-button mat-dialog-close>Cerrar</button></mat-dialog-actions>`
})
export class OnlineUsersDialogComponent {
  private readonly analytics = inject(AnalyticsService);
  private readonly destroyRef = inject(DestroyRef);
  readonly currentUserId = inject(AuthService).getCurrentUser()?.id;
  users: OnlineUser[] = [];
  loading = true;
  error = '';
  message = '';
  confirming: number | null = null;
  busy: number | null = null;
  now = Date.now();
  constructor() {
    timer(0, 15000).pipe(
      switchMap(() => this.analytics.getOnlineUsers().pipe(catchError(() => of(null)))),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(users => {
      this.loading = false;
      this.now = Date.now();
      this.error = users ? '' : 'No se pudieron actualizar los usuarios. Intente nuevamente.';
      if (users) this.users = users;
    });
  }
  duration(start: string): string {
    const seconds = Math.max(0, Math.floor((this.now - Date.parse(start)) / 1000));
    return `${Math.floor(seconds / 3600)} h ${Math.floor(seconds / 60) % 60} min ${seconds % 60} s`;
  }
  logout(user: OnlineUser): void {
    if (this.busy !== null || user.userId === this.currentUserId) return;
    this.busy = user.userId;
    this.error = ''; this.message = '';
    this.analytics.logoutUser(user.userId).pipe(
      finalize(() => { this.busy = null; }), takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.users = this.users.filter(item => item.userId !== user.userId);
        this.confirming = null;
        this.message = `Se cerraron las sesiones de ${user.email}.`;
      },
      error: () => { this.error = 'No se pudo cerrar la sesión. Intente nuevamente.'; }
    });
  }
}
