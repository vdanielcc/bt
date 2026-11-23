import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { AcademyClassListItem, ClassStatus } from '../models/academy-management.models';
import { ClassManagementService } from '../services/class-management.service';
import { AcademyConfirmDialogComponent } from '../shared/academy-confirm-dialog.component';

@Component({
  standalone: true, selector: 'bte-class-status-actions',
  imports: [CommonModule, RouterLink, MatButtonModule],
  template: `<div class="flex flex-wrap gap-1">
    <a *ngIf="showView" mat-button [routerLink]="['/academies', academyId, 'classes', course.id]">Ver</a>
    <a mat-button [routerLink]="['/academies', academyId, 'classes', course.id, 'edit']">Editar</a>
    <button *ngIf="course.status === 'ACTIVE'" mat-button [disabled]="saving || confirming" (click)="change('INACTIVE')">Desactivar</button>
    <button *ngIf="course.status === 'INACTIVE'" mat-button [disabled]="saving || confirming" (click)="change('ACTIVE')">Activar</button>
    <button *ngIf="course.status !== 'CLOSED'" mat-button color="warn" [disabled]="saving || confirming" (click)="change('CLOSED')">Cerrar</button>
    <span *ngIf="saving" class="p-2">Actualizando...</span>
  </div>`
})
export class ClassStatusActionsComponent {
  @Input({ required: true }) course!: AcademyClassListItem;
  @Input({ required: true }) academyId = 0;
  @Input() showView = true;
  @Output() changed = new EventEmitter<AcademyClassListItem>();
  private service = inject(ClassManagementService); private dialog = inject(MatDialog); private snack = inject(MatSnackBar);
  saving = false; confirming = false;
  change(status: ClassStatus, confirmed = false): void {
    if (this.saving || this.confirming) return;
    if (status !== 'ACTIVE' && !confirmed) {
      this.confirming = true;
      this.dialog.open(AcademyConfirmDialogComponent, {
        data: { title: status === 'CLOSED' ? 'Cerrar clase' : 'Desactivar clase', action: status === 'CLOSED' ? 'Cerrar clase' : 'Desactivar',
          message: status === 'CLOSED' ? 'Esta clase quedará cerrada y se conservará su historial. ¿Deseas continuar?' : 'Esta clase quedará temporalmente inactiva y se conservará su historial. ¿Deseas continuar?' }
      }).afterClosed().subscribe(ok => { this.confirming = false; if (ok) this.change(status, true); });
      return;
    }
    this.saving = true;
    this.service.changeClassStatus(this.course.id, status).pipe(finalize(() => this.saving = false)).subscribe({
      next: course => { this.course = course; this.changed.emit(course); this.snack.open('Estado de la clase actualizado.', 'Cerrar', { duration: 3500 }); },
      error: error => this.snack.open(error.error?.message || 'No fue posible cambiar el estado.', 'Cerrar', { duration: 5000 })
    });
  }
}
