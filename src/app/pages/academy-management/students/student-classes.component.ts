import { Component, DestroyRef, Input, OnChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, of, switchMap } from 'rxjs';
import { AcademyOperationsService } from '../services/academy-operations.service';
import { StudentClassListItem } from '../models/academy-management.models';
import { enrollmentStatusLabel } from '../classes/enrollment-status.util';
@Component({ standalone: true, selector: 'bte-student-classes', imports: [CommonModule, RouterLink, MatButtonModule, MatPaginatorModule, MatProgressSpinnerModule],
  template: `<section class="p-6"><h2 class="title">Clases</h2><mat-spinner *ngIf="loading" diameter="32" />
    <p *ngIf="error" role="alert">{{ error }} <button mat-button (click)="load()">Reintentar</button></p>
    <div *ngIf="!loading && !error" class="overflow-x-auto"><table class="w-full text-left" *ngIf="rows.length"><thead><tr><th>Clase</th><th>Modalidad</th><th>Horario</th><th>Inscripción / término</th><th>Estado</th></tr></thead><tbody><tr *ngFor="let row of rows" class="border-b"><td class="p-3"><a mat-button [routerLink]="['/academies',row.academyId,'classes',row.classId]">{{ row.classCode }} {{ row.className }}</a></td><td>{{ row.trainingModalityName }}</td><td>{{ row.scheduleSummary || 'Sin horarios activos' }}</td><td>{{ row.enrollmentDate | date:'dd/MM/yyyy' }}<span *ngIf="row.endDate"> — {{ row.endDate | date:'dd/MM/yyyy' }}</span></td><td>{{ label(row.status) }}</td></tr></tbody></table>
    <p *ngIf="!rows.length">El alumno aún no tiene inscripciones a clases.</p><mat-paginator [length]="total" [pageSize]="20" [pageIndex]="page-1" (page)="paginate($event)" showFirstLastButtons /></div></section>` })
export class StudentClassesComponent implements OnChanges {
  @Input({ required: true }) studentId = 0;
  private api = inject(AcademyOperationsService); private destroyRef = inject(DestroyRef); private reload = new Subject<void>();
  rows: StudentClassListItem[] = []; total = 0; page = 1; loading = true; error = ''; label = enrollmentStatusLabel;
  constructor() { this.reload.pipe(switchMap(() => { this.loading = true; this.error = ''; return this.api.getStudentClasses(this.studentId, this.page).pipe(catchError(error => { this.error = error.error?.message || 'No fue posible cargar las clases.'; return of(null); })); }), takeUntilDestroyed(this.destroyRef)).subscribe(result => { this.loading = false; if (result) { this.rows = result.items; this.total = result.total; } }); }
  ngOnChanges(): void { this.page = 1; this.load(); }
  load(): void { this.reload.next(); }
  paginate(event: PageEvent): void { this.page = event.pageIndex + 1; this.load(); }
}
