import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';

export interface SessionWarningActions { continue: (rememberMe?: boolean) => void; logout: () => void; }

@Component({
  selector: 'bte-session-warning-dialog', standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatCheckboxModule],
  template: `
    <h2 mat-dialog-title>Tu sesión está por finalizar</h2>
    <mat-dialog-content>
      <p aria-live="polite">La sesión se cerrará en {{ seconds }} segundos.</p>
      <mat-checkbox [(ngModel)]="rememberMe" [disabled]="busy">Mantener sesión por 12 horas</mat-checkbox>
      <p *ngIf="busy" role="status">Renovando sesión…</p>
      <p *ngIf="error" role="alert">{{ error }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="actions.logout()" [disabled]="busy">Cerrar sesión</button>
      <button mat-flat-button color="primary" (click)="actions.continue(rememberMe)" [disabled]="busy">{{ rememberMe ? 'Guardar' : 'Continuar' }}</button>
    </mat-dialog-actions>`
})
export class SessionWarningDialogComponent {
  seconds = 20;
  busy = false;
  error = '';
  rememberMe = false;
  constructor(@Inject(MAT_DIALOG_DATA) readonly actions: SessionWarningActions) {}
}
