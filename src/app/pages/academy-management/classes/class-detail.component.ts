import { ClassBillingPlansComponent } from './class-billing-plans.component';
import { AttendanceHistoryComponent } from '../attendance/attendance-history.component';
import { ClassSessionsComponent } from './class-sessions.component';
import { ClassSchedulesComponent } from './class-schedules.component';
import { ClassInstructorsComponent } from './class-instructors.component';
import { ClassEnrollmentsComponent } from './class-enrollments.component';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { Subject, catchError, of, switchMap } from 'rxjs';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { AcademyClassListItem } from '../models/academy-management.models';
import { ClassManagementService } from '../services/class-management.service';
import { ClassStatusActionsComponent } from './class-status-actions.component';
import { classStatusLabel } from './class-status.util';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  standalone: true, selector: 'bte-class-detail',
  imports: [ClassBillingPlansComponent, AttendanceHistoryComponent, ClassSessionsComponent, ClassSchedulesComponent, ClassInstructorsComponent, ClassEnrollmentsComponent, CommonModule, RouterLink, MatButtonModule, MatProgressSpinnerModule, MatTabsModule, ClassStatusActionsComponent,
    VexBreadcrumbsComponent, VexPageLayoutComponent, VexPageLayoutContentDirective, VexPageLayoutHeaderDirective],
  template: `<vex-page-layout><vex-page-layout-header class="pb-16"><div class="px-6">
    <vex-breadcrumbs [crumbs]="['Academia','Gestión de clases','Clases',course?.name || 'Detalle']" />
    <h1 class="title mt-2">{{ course?.name || 'Detalle de clase' }}</h1>
    <p *ngIf="course" class="text-secondary">{{ course.code || 'Sin código' }} · {{ statusLabel(course.status) }}</p>
    <a mat-button [routerLink]="['/academies',academyId,'classes']">Volver a clases</a>
  </div></vex-page-layout-header><vex-page-layout-content class="-mt-6">
    <div *ngIf="loading" class="card p-12 flex justify-center"><mat-spinner diameter="42" /></div>
    <div *ngIf="!loading && error" class="card p-8" role="alert">{{ error }} <button mat-button (click)="load()">Reintentar</button></div>
    <div *ngIf="!loading && !error && course" class="card overflow-hidden">
      <div *ngIf="canManage" class="p-4 border-b"><bte-class-status-actions [course]="course" [academyId]="academyId" [showView]="false" (changed)="course = $event" /></div>
      <mat-tab-group><mat-tab label="Resumen"><dl class="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div><dt class="text-secondary">Código</dt><dd>{{ course.code || 'Sin código' }}</dd></div>
        <div><dt class="text-secondary">Nombre</dt><dd>{{ course.name }}</dd></div>
        <div><dt class="text-secondary">Estado</dt><dd>{{ statusLabel(course.status) }}</dd></div>
        <div><dt class="text-secondary">Modalidad</dt><dd>{{ course.trainingModalityName }}{{ course.trainingModality.isActive ? '' : ' (Inactiva)' }}</dd></div>
        <div><dt class="text-secondary">Sala principal</dt><dd>{{ course.defaultRoomName || 'Sin sala principal' }}{{ course.defaultRoom && !course.defaultRoom.isActive ? ' (Inactiva)' : '' }}</dd></div>
        <div *ngIf="course.activeEnrollmentCount != null"><dt class="text-secondary">Alumnos activos</dt><dd>{{ course.activeEnrollmentCount }}</dd></div>
        <div *ngIf="course.capacity != null && course.occupiedEnrollmentCount != null"><dt class="text-secondary">Cupos disponibles</dt><dd>{{ course.capacity - course.occupiedEnrollmentCount }}</dd></div>
        <div><dt class="text-secondary">Capacidad</dt><dd>{{ course.capacity ?? 'Sin límite configurado' }}</dd></div>
        <div><dt class="text-secondary">Fecha inicio</dt><dd>{{ course.startDate ? (course.startDate | date:'dd/MM/yyyy') : 'Sin fecha de inicio' }}</dd></div>
        <div><dt class="text-secondary">Fecha término</dt><dd>{{ course.endDate ? (course.endDate | date:'dd/MM/yyyy') : 'Sin fecha de término' }}</dd></div>
        <div><dt class="text-secondary">Creada</dt><dd>{{ course.createdAt ? (course.createdAt | date:'dd/MM/yyyy HH:mm') : '—' }}</dd></div>
        <div><dt class="text-secondary">Última actualización</dt><dd>{{ course.updatedAt ? (course.updatedAt | date:'dd/MM/yyyy HH:mm') : '—' }}</dd></div>
        <div class="md:col-span-2 lg:col-span-3"><dt class="text-secondary">Descripción</dt><dd class="whitespace-pre-wrap">{{ course.description || 'Sin descripción' }}</dd></div>
      </dl></mat-tab><mat-tab label="Horarios"><ng-template matTabContent><bte-class-schedules [course]="course" /></ng-template></mat-tab><mat-tab label="Instructores"><ng-template matTabContent><bte-class-instructors [course]="course" /></ng-template></mat-tab><mat-tab label="Sesiones"><ng-template matTabContent><bte-class-sessions [course]="course" /></ng-template></mat-tab><mat-tab label="Planes / Membresías"><ng-template matTabContent><bte-class-billing-plans [course]="course" /></ng-template></mat-tab><mat-tab label="Alumnos"><ng-template matTabContent><bte-class-enrollments [course]="course" (changed)="course = $event" /></ng-template></mat-tab><mat-tab label="Asistencia"><ng-template matTabContent><bte-attendance-history [classId]="classId" [academyId]="academyId" /></ng-template></mat-tab></mat-tab-group>
    </div></vex-page-layout-content></vex-page-layout>`
})
export class ClassDetailComponent implements OnInit {
  private auth = inject(AuthService);
  get canManage(): boolean { return ['admin','academy_admin'].includes((this.auth.getCurrentUser()?.rol || '').toLowerCase()); }
  private route = inject(ActivatedRoute); private service = inject(ClassManagementService); private destroyRef = inject(DestroyRef);
  private reload = new Subject<void>();
  academyId = 0; classId = 0; course?: AcademyClassListItem; loading = true; error = '';
  statusLabel = classStatusLabel;
  ngOnInit(): void {
    this.reload.pipe(switchMap(() => {
      this.loading = true; this.error = ''; this.course = undefined;
      return this.service.getClass(this.classId).pipe(catchError(error => { this.error = error.error?.message || 'No fue posible cargar la clase.'; return of(null); }));
    }), takeUntilDestroyed(this.destroyRef)).subscribe(course => {
      if (course && course.academyId !== this.academyId) this.error = 'La clase no pertenece a esta academia.';
      else if (course) this.course = course;
      this.loading = false;
    });
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.academyId = Number(params.get('academyId')); this.classId = Number(params.get('classId')); this.load();
    });
  }
  load(): void { this.reload.next(); }
}
