import { Component, DestroyRef, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, of, switchMap } from 'rxjs';
import { AcademyClassListItem, ClassEnrollmentListItem, EnrollmentStatus } from '../models/academy-management.models';
import { AcademyOperationsService } from '../services/academy-operations.service';
import { ClassManagementService } from '../services/class-management.service';
import { AuthService } from '../../../core/auth/auth.service';
import { AcademyConfirmDialogComponent } from '../shared/academy-confirm-dialog.component';
import { ClassEnrollmentDialogComponent } from './class-enrollment-dialog.component';
import { enrollmentStatuses, enrollmentStatusLabel } from './enrollment-status.util';

@Component({
  standalone: true, selector: 'bte-class-enrollments',
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule, MatPaginatorModule, MatProgressBarModule, MatProgressSpinnerModule],
  template: `<section class="p-6"><div class="flex flex-wrap items-center justify-between gap-4"><h2 class="title">Alumnos inscritos</h2>
    <button *ngIf="canManage" mat-flat-button color="primary" [disabled]="course.status !== 'ACTIVE' || busy" (click)="enroll()">+ Inscribir alumno</button></div>
    <div *ngIf="course.occupiedEnrollmentCount != null" class="mb-6">
      <p>{{ course.occupiedEnrollmentCount }} / {{ course.capacity ?? 'Sin límite' }} cupos · {{ capacityLabel }}. Los alumnos pausados conservan su cupo.</p>
      <mat-progress-bar *ngIf="course.capacity" [value]="(course.occupiedEnrollmentCount || 0) * 100 / course.capacity" [color]="capacityLabel === 'Completa' ? 'warn' : 'primary'" />
    </div>
    <div class="flex flex-wrap gap-4"><mat-form-field><mat-label>Buscar alumno</mat-label><input matInput [(ngModel)]="search" (keyup.enter)="load(true)"></mat-form-field>
      <mat-form-field><mat-label>Estado</mat-label><mat-select [(ngModel)]="status" (selectionChange)="load(true)"><mat-option value="">Todos</mat-option><mat-option *ngFor="let entry of states | keyvalue" [value]="entry.key">{{ entry.value }}</mat-option></mat-select></mat-form-field>
      <button mat-button (click)="load(true)">Buscar</button></div>
    <p *ngIf="actionError" role="alert">{{ actionError }}</p>
    <mat-spinner *ngIf="loading" diameter="32" />
    <p *ngIf="!loading && error" role="alert">{{ error }} <button mat-button (click)="load()">Reintentar</button></p>
    <div *ngIf="!loading && !error" class="overflow-x-auto"><table *ngIf="rows.length" class="w-full text-left"><thead><tr><th>Alumno</th><th>Documento</th><th>Fecha inscripción / término</th><th *ngIf="showPlans">Plan / Membresía</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody><tr *ngFor="let row of rows" class="border-b"><td class="py-3">{{ row.studentName }}</td><td>{{ row.documentNumber }}</td><td>{{ row.enrollmentDate | date:'dd/MM/yyyy' }}<span *ngIf="row.endDate"> — {{ row.endDate | date:'dd/MM/yyyy' }}</span></td><td *ngIf="showPlans">{{ row.billingPlanName || 'Sin plan' }}</td><td><mat-chip [class]="'enrollment-' + row.status.toLowerCase()">{{ label(row.status) }}</mat-chip></td>
      <td><a mat-button [routerLink]="['/students',row.studentId]">Ver perfil</a><ng-container *ngIf="canManage">
        <button *ngIf="row.status === 'ACTIVE'" mat-button [disabled]="busy" (click)="transition(row,'PAUSED')">Pausar</button>
        <button *ngIf="row.status === 'PAUSED'" mat-button [disabled]="busy || course.status !== 'ACTIVE'" (click)="transition(row,'ACTIVE')">Reactivar</button>
        <ng-container *ngIf="row.status === 'ACTIVE' || row.status === 'PAUSED'">
          <button mat-button [disabled]="busy" (click)="edit(row)">Editar</button><button mat-button [disabled]="busy" (click)="transition(row,'WITHDRAWN')">Retirar</button><button mat-button [disabled]="busy" (click)="transition(row,'COMPLETED')">Completar</button>
        </ng-container>
      </ng-container></td></tr></tbody></table>
      <p *ngIf="!rows.length">{{ search || status ? 'No hay inscripciones para estos filtros.' : 'Esta clase aún no tiene alumnos inscritos.' }}</p>
      <button *ngIf="!rows.length && !search && !status && canManage && course.status === 'ACTIVE'" mat-button (click)="enroll()">Inscribir primer alumno</button>
      <mat-paginator [length]="total" [pageSize]="100" [pageIndex]="page - 1" (page)="paginate($event)" showFirstLastButtons />
    </div></section>`,
  styles: [`.enrollment-active { --mdc-chip-elevated-container-color: #bbf7d0; } .enrollment-paused { --mdc-chip-elevated-container-color: #fef08a; } .enrollment-withdrawn { --mdc-chip-elevated-container-color: #fecaca; } .enrollment-completed { --mdc-chip-elevated-container-color: #bfdbfe; } th, td { padding: .75rem; }`]
})
export class ClassEnrollmentsComponent implements OnChanges {
  @Input({ required: true }) course!: AcademyClassListItem;
  @Output() changed = new EventEmitter<AcademyClassListItem>();
  private api = inject(AcademyOperationsService); private classes = inject(ClassManagementService); private dialog = inject(MatDialog); private auth = inject(AuthService); private destroyRef = inject(DestroyRef);
  private reload = new Subject<void>();
  rows: ClassEnrollmentListItem[] = []; states = enrollmentStatuses; label = enrollmentStatusLabel;
  page = 1; total = 0; status = ''; search = ''; loading = false; busy = false; error = ''; actionError = '';
  get canManage(): boolean { return ['admin','academy_admin'].includes((this.auth.getCurrentUser()?.rol || '').toLowerCase()); }
  get showPlans(): boolean { return true; }
  get capacityLabel(): string { const count = this.course.occupiedEnrollmentCount ?? 0; const cap = this.course.capacity; return cap && count >= cap ? 'Completa' : cap && count / cap >= .8 ? 'Casi completa' : 'Disponible'; }
  constructor() {
    this.reload.pipe(switchMap(() => { this.loading = true; this.error = ''; return this.api.getEnrollments(this.course.id, this.page, this.status, this.search).pipe(catchError(error => { this.error = error.error?.message || 'No fue posible cargar las inscripciones.'; return of(null); })); }), takeUntilDestroyed(this.destroyRef)).subscribe(result => { this.loading = false; if (result) { this.rows = result.items; this.total = result.total; } });
  }
  ngOnChanges(): void { this.load(); }
  load(reset = false): void { if (reset) this.page = 1; this.reload.next(); }
  paginate(event: PageEvent): void { this.page = event.pageIndex + 1; this.load(); }
  enroll(): void { this.open(); }
  edit(row: ClassEnrollmentListItem): void { this.open(row); }
  private open(row?: ClassEnrollmentListItem): void {
    this.dialog.open(ClassEnrollmentDialogComponent, { width: '600px', maxWidth: '95vw', data: { course: this.course, row } }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(saved => { if (saved) this.refresh(); });
  }
  private refresh(): void {
    this.load();
    this.classes.getClass(this.course.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: course => { this.course = course; this.changed.emit(course); }, error: () => this.actionError = 'La inscripción se guardó, pero no fue posible actualizar los cupos. Recarga la clase.' });
  }
  transition(row: ClassEnrollmentListItem, status: EnrollmentStatus): void {
    if (this.busy) return;
    this.busy = true; this.actionError = '';
    const message = status === 'PAUSED' ? 'El alumno conservará su cupo mientras la inscripción permanezca pausada.' : status === 'WITHDRAWN' || status === 'COMPLETED' ? 'La inscripción quedará en el historial y dejará de ocupar un cupo. Se utilizará la fecha actual como término.' : 'La inscripción volverá a estar activa.';
    this.dialog.open(AcademyConfirmDialogComponent, { data: { title: `${this.label(status)}: ${row.studentName}`, action: 'Confirmar', message: `${row.studentName} · ${this.course.name}. ${message}` } }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(ok => {
      if (!ok) { this.busy = false; return; }
      this.api.updateEnrollment(row.id, { startDate: row.startDate, endDate: null, status, billingPlanId: row.billingPlanId, notes: row.notes }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.busy = false; this.refresh(); }, error: error => { this.busy = false; this.actionError = error.error?.message || 'No fue posible cambiar el estado.'; } });
    });
  }
}
