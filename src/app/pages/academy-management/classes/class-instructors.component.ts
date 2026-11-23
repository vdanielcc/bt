import { Component, DestroyRef, Input, OnChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, forkJoin, of, switchMap } from 'rxjs';
import { AcademyClassListItem, AcademyInstructor, ClassInstructorAssignment } from '../models/academy-management.models';
import { AcademyOperationsService } from '../services/academy-operations.service';
import { AcademyManagementService } from '../services/academy-management.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ClassInstructorDialogComponent, instructorRoles } from './class-instructor-dialog.component';
import { AcademyConfirmDialogComponent } from '../shared/academy-confirm-dialog.component';
@Component({ standalone: true, selector: 'bte-class-instructors', imports: [CommonModule, MatButtonModule, MatProgressSpinnerModule],
  template: `<section class="p-6"><div class="flex flex-wrap justify-between gap-4"><h2 class="title">Instructores asignados</h2><button *ngIf="canManage" mat-flat-button color="primary" [disabled]="loading || busy || !!error || course.status === 'CLOSED'" (click)="edit()">+ Asignar instructor</button></div>
    <mat-spinner *ngIf="loading" diameter="32" /><p *ngIf="error" role="alert">{{ error }} <button mat-button (click)="load()">Reintentar</button></p><p *ngIf="actionError" role="alert">{{ actionError }}</p>
    <div *ngIf="!loading && !error" class="overflow-x-auto"><table *ngIf="rows.length" class="w-full text-left"><thead><tr><th>Instructor</th><th>Rol</th><th>Principal</th><th>Vigencia</th><th>Estado</th><th *ngIf="canManage">Acciones</th></tr></thead><tbody><tr *ngFor="let row of rows" class="border-b"><td>{{ instructorName(row) }}</td><td>{{ roleLabel(row.role) }}</td><td>{{ row.isPrimary ? 'Sí' : 'No' }}</td><td>{{ row.startDate ? (row.startDate | date:'dd/MM/yyyy') : 'Sin inicio definido' }} · {{ row.endDate ? (row.endDate | date:'dd/MM/yyyy') : 'Sin término' }}</td><td>{{ row.status === 'ACTIVE' ? 'Activa' : 'Inactiva' }}</td><td *ngIf="canManage"><button mat-button [disabled]="busy || course.status === 'CLOSED'" (click)="edit(row)">Editar</button><button mat-button color="warn" [disabled]="busy || course.status === 'CLOSED'" (click)="remove(row)">Desvincular</button></td></tr></tbody></table>
    <p *ngIf="!rows.length" class="py-4">Esta clase aún no tiene instructores asignados.</p><p class="mt-4 text-secondary">Se muestran las asignaciones activas. Al desvincular un instructor se conserva su historial.</p></div></section>`, styles: ['th,td { padding: .75rem; }'] })
export class ClassInstructorsComponent implements OnChanges {
  @Input({ required: true }) course!: AcademyClassListItem;
  private api = inject(AcademyOperationsService); private academy = inject(AcademyManagementService); private auth = inject(AuthService); private dialog = inject(MatDialog); private destroyRef = inject(DestroyRef); private reload = new Subject<void>();
  rows: ClassInstructorAssignment[] = []; instructors: AcademyInstructor[] = []; loading = true; busy = false; error = ''; actionError = '';
  get canManage(): boolean { return ['admin','academy_admin'].includes((this.auth.getCurrentUser()?.rol || '').toLowerCase()); }
  constructor() {
    this.reload.pipe(switchMap(() => { this.loading = true; this.error = ''; return forkJoin({ rows: this.api.getClassInstructors(this.course.id), instructors: this.canManage ? this.academy.getInstructors(this.course.academyId) : of([] as AcademyInstructor[]) }).pipe(catchError(error => { this.error = error.error?.message || 'No fue posible cargar los instructores de la clase.'; return of(null); })); }), takeUntilDestroyed(this.destroyRef)).subscribe(result => { this.loading = false; if (result) { this.rows = result.rows; this.instructors = result.instructors; } });
  }
  ngOnChanges(): void { this.load(); }
  load(): void { this.reload.next(); }
  roleLabel(role: string): string { return instructorRoles[role as keyof typeof instructorRoles] || role; }
  instructorName(row: ClassInstructorAssignment): string { return row.instructorName || this.instructors.find(i => i.id === row.academyInstructorId)?.personName || `Instructor ${row.academyInstructorId}`; }
  edit(assignment?: ClassInstructorAssignment): void {
    if (!this.canManage || this.busy || this.loading || this.error || this.course.status === 'CLOSED') return;
    this.busy = true; this.actionError = '';
    this.dialog.open(ClassInstructorDialogComponent, { width: '580px', maxWidth: '95vw', data: { classId: this.course.id, academyId: this.course.academyId, assignment, assignments: this.rows, instructors: this.instructors } }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(saved => { this.busy = false; if (saved) this.load(); });
  }
  remove(row: ClassInstructorAssignment): void {
    if (!this.canManage || this.busy || this.course.status === 'CLOSED') return;
    this.busy = true; this.actionError = '';
    this.dialog.open(AcademyConfirmDialogComponent, { data: { title: 'Desvincular instructor', action: 'Desvincular', message: `¿Desvincular a ${this.instructorName(row)} de ${this.course.name}? Su asignación quedará inactiva y se conservará en el historial.` } }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(ok => {
      if (!ok) { this.busy = false; return; }
      this.api.removeInstructor(row.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.busy = false; this.load(); }, error: error => { this.busy = false; this.actionError = error.error?.message || 'No fue posible desvincular al instructor.'; } });
    });
  }
}
