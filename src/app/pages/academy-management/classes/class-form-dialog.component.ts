import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { AcademyClass } from '../models/academy-management.models';
import { ClassEditorComponent } from './class-editor.component';

// Retained for callers that use the original dialog; both entry points share the editor.
@Component({
  standalone: true, selector: 'bte-class-form-dialog',
  imports: [MatDialogModule, ClassEditorComponent],
  template: `<h2 mat-dialog-title>{{ data.course ? 'Editar' : 'Crear' }} clase</h2>
    <mat-dialog-content><bte-class-editor [academyId]="data.academyId" [course]="data.course"
      (saved)="ref.close($event)" (cancelled)="ref.close()" /></mat-dialog-content>`
})
export class ClassFormDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { academyId: number; course?: AcademyClass },
    public ref: MatDialogRef<ClassFormDialogComponent>) {}
}
