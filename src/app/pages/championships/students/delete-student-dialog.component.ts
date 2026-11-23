import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { finalize } from 'rxjs';
import { AcademyStudent } from './students.models';
import { StudentsService } from './students.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { LanguageService } from '../../../core/i18n/language.service';

@Component({
  selector: 'bte-delete-student-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ 'Confirmar eliminación' | translate }}</h2>
    <mat-dialog-content>
      <p>{{ '¿Deseas eliminar este registro del dojo?' | translate }}</p>
      <p><strong>{{ data.firstName }} {{ data.lastName }}</strong></p>
      <p *ngIf="errorMessage" role="alert">{{ errorMessage }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false" [disabled]="deleting">{{ 'Cancelar' | translate }}</button>
      <button mat-flat-button color="warn" (click)="confirm()" [disabled]="deleting">
        {{ (deleting ? 'Eliminando...' : 'Eliminar') | translate }}
      </button>
    </mat-dialog-actions>
  `
})
export class DeleteStudentDialogComponent {
  deleting = false;
  errorMessage = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) readonly data: AcademyStudent,
    private readonly service: StudentsService,
    private readonly language: LanguageService,
    private readonly dialogRef: MatDialogRef<DeleteStudentDialogComponent>
  ) {}

  confirm(): void {
    if (this.deleting) return;
    this.deleting = true;
    this.errorMessage = '';
    this.dialogRef.disableClose = true;
    this.service.deleteStudent(this.data.id).pipe(finalize(() => {
      this.deleting = false;
      this.dialogRef.disableClose = false;
    })).subscribe({
      next: () => this.dialogRef.close(true),
      error: error => this.errorMessage = error?.error?.message
        ?? this.language.translate('No fue posible eliminar el registro.')
    });
  }
}
