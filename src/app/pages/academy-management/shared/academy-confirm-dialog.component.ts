import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatDialogModule, MatButtonModule],
  template: `<h2 mat-dialog-title>{{ data.title || 'Confirmar desactivación' }}</h2>
    <mat-dialog-content><p>{{ data.message }}</p><mat-form-field *ngIf="data.reasonRequired" class="w-full"><mat-label>Motivo del reembolso</mat-label><textarea matInput required [maxlength]="data.reasonMaxLength||500" [(ngModel)]="reason"></textarea><mat-hint>Obligatorio, máximo {{data.reasonMaxLength||500}} caracteres.</mat-hint></mat-form-field></mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Cancelar</button>
      <button mat-flat-button color="warn" [disabled]="data.reasonRequired&&(!reason.trim()||reason.length>(data.reasonMaxLength||500))" [mat-dialog-close]="data.reasonRequired?{reason:reason.trim()}:true">
        {{ data.action || 'Desactivar' }}
      </button>
    </mat-dialog-actions>`
})
export class AcademyConfirmDialogComponent {
  reason='';
  constructor(@Inject(MAT_DIALOG_DATA) public data: { message: string; title?: string; action?: string; reasonRequired?: boolean; reasonMaxLength?: number }) {}
}
