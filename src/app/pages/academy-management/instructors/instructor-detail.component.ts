import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import { AcademyInstructor } from '../models/academy-management.models';
import { AcademyManagementService } from '../services/academy-management.service';
import { InstructorFormDialogComponent } from './instructor-form-dialog.component';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatDialogModule,
    MatProgressSpinnerModule
  ],
  template: `<div class="p-6">
    <a mat-button [routerLink]="['..']">Volver a instructores</a>
    <h1>Detalle de instructor</h1>
    <mat-spinner *ngIf="loading" diameter="40"></mat-spinner>
    <div *ngIf="!loading && error">
      {{ error }} <button mat-button (click)="load()">Reintentar</button>
    </div>
    <section *ngIf="!loading && instructor as row" class="card p-6">
      <h2>{{ row.personName || 'Nombre no disponible' }}</h2>
      <dl class="grid grid-cols-2 gap-4">
        <dt>Título</dt>
        <dd>{{ row.title || '—' }}</dd>
        <dt>Licencia</dt>
        <dd>{{ row.licenseNumber || '—' }}</dd>
        <dt>Estado</dt>
        <dd>{{ row.isActive ? 'Activo' : 'Inactivo' }}</dd>
        <dt>Fecha ingreso</dt>
        <dd>
          {{ row.startDate ? (row.startDate | date: 'dd-MM-yyyy') : '—' }}
        </dd>
        <dt>Fecha término</dt>
        <dd>{{ row.endDate ? (row.endDate | date: 'dd-MM-yyyy') : '—' }}</dd>
      </dl>
      <button mat-flat-button color="primary" class="mt-6" (click)="edit(row)">
        Editar instructor
      </button>
    </section>
  </div>`
})
export class InstructorDetailComponent implements OnInit {
  loading = true;
  error = '';
  instructor: AcademyInstructor | null = null;
  academyId = 0;
  id = 0;
  constructor(
    private route: ActivatedRoute,
    private service: AcademyManagementService,
    private dialog: MatDialog
  ) {}
  ngOnInit(): void {
    this.academyId = Number(this.route.snapshot.paramMap.get('academyId'));
    this.id = Number(this.route.snapshot.paramMap.get('instructorId'));
    this.load();
  }
  load(): void {
    this.loading = true;
    this.error = '';
    this.instructor = null;
    this.service
      .getInstructor(this.id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (value) => {
          if (value.academyId !== this.academyId)
            this.error = 'El instructor no pertenece a esta academia.';
          else this.instructor = value;
        },
        error: (error) =>
          (this.error =
            error?.error?.message ?? 'No fue posible cargar el instructor.')
      });
  }
  edit(instructor: AcademyInstructor): void {
    this.dialog
      .open(InstructorFormDialogComponent, {
        width: '700px',
        maxWidth: '95vw',
        data: { academyId: this.academyId, instructor }
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.load();
      });
  }
}
