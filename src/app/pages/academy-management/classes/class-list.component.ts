import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { Subject, catchError, debounceTime, forkJoin, of, switchMap } from 'rxjs';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { AcademyClassListItem, AcademyClassSummary, AcademyRoom, ClassStatus, TrainingModality } from '../models/academy-management.models';
import { AcademyManagementService } from '../services/academy-management.service';
import { ClassManagementService } from '../services/class-management.service';
import { ClassStatusActionsComponent } from './class-status-actions.component';
import { classStatusLabel } from './class-status.util';

@Component({
  standalone: true, selector: 'bte-class-list',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressSpinnerModule, MatTableModule,
    VexBreadcrumbsComponent, VexPageLayoutComponent, VexPageLayoutContentDirective, VexPageLayoutHeaderDirective, ClassStatusActionsComponent],
  template: `<vex-page-layout><vex-page-layout-header class="pb-16">
    <div class="px-6 flex flex-wrap items-center justify-between gap-4">
      <div><vex-breadcrumbs [crumbs]="['Academia','Gestión de clases','Clases']" />
        <h1 class="title mt-2 mb-0">Clases</h1><p class="text-secondary mt-1">Administra las clases y grupos de entrenamiento de tu academia.</p></div>
      <a mat-flat-button color="primary" [routerLink]="['new']">+ Nueva clase</a>
    </div></vex-page-layout-header><vex-page-layout-content class="-mt-6">
    <div *ngIf="summary" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6" aria-label="Resumen de todas las clases de la academia">
      <div class="card p-4"><p class="text-secondary">Total</p><strong class="text-2xl">{{ summary.total }}</strong></div>
      <div class="card p-4"><p class="text-secondary">Clases activas</p><strong class="text-2xl">{{ summary.active }}</strong></div>
      <div class="card p-4"><p class="text-secondary">Clases inactivas</p><strong class="text-2xl">{{ summary.inactive }}</strong></div>
      <div class="card p-4"><p class="text-secondary">Clases cerradas</p><strong class="text-2xl">{{ summary.closed }}</strong></div>
    </div>
    <div class="card p-4 mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" [formGroup]="filters">
      <mat-form-field><mat-label>Buscar por código o nombre</mat-label><input matInput formControlName="search" /></mat-form-field>
      <mat-form-field><mat-label>Modalidad</mat-label><mat-select formControlName="trainingModalityId"><mat-option [value]="null">Todas</mat-option><mat-option *ngFor="let item of modalities" [value]="item.id">{{ item.name }}</mat-option></mat-select></mat-form-field>
      <mat-form-field><mat-label>Sala principal</mat-label><mat-select formControlName="roomId"><mat-option [value]="null">Todas</mat-option><mat-option *ngFor="let item of rooms" [value]="item.id">{{ item.name }}</mat-option></mat-select></mat-form-field>
      <mat-form-field><mat-label>Estado</mat-label><mat-select formControlName="status"><mat-option value="">Todos</mat-option><mat-option value="ACTIVE">Activa</mat-option><mat-option value="INACTIVE">Inactiva</mat-option><mat-option value="CLOSED">Cerrada</mat-option></mat-select></mat-form-field>
    </div>
    <p *ngIf="metadataError" role="alert" class="mb-4">{{ metadataError }} <button mat-button (click)="loadMetadata()">Reintentar</button></p>
    <div class="card overflow-auto">
      <div *ngIf="loading" class="p-12 flex justify-center"><mat-spinner diameter="42" /></div>
      <div *ngIf="!loading && error" class="p-8" role="alert">{{ error }} <button mat-button (click)="load()">Reintentar</button></div>
      <div *ngIf="!loading && !error && !courses.length" class="p-8 text-center">
        <h2 class="text-xl mb-3">{{ hasFilters ? 'No hay clases que coincidan con los filtros.' : 'Aún no existen clases.' }}</h2>
        <p *ngIf="!hasFilters" class="mb-4">Crea la primera clase para comenzar a organizar las actividades de tu academia.</p>
        <a *ngIf="!hasFilters" mat-flat-button color="primary" [routerLink]="['new']">Crear primera clase</a>
        <button *ngIf="hasFilters" mat-button (click)="clearFilters()">Limpiar filtros</button>
      </div>
      <table *ngIf="!loading && !error && courses.length" mat-table [dataSource]="courses" class="w-full">
        <ng-container matColumnDef="code"><th mat-header-cell *matHeaderCellDef>Código</th><td mat-cell *matCellDef="let row">{{ row.code || '—' }}</td></ng-container>
        <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Clase</th><td mat-cell *matCellDef="let row"><a class="text-primary-600 font-medium" [routerLink]="[row.id]">{{ row.name }}</a></td></ng-container>
        <ng-container matColumnDef="modality"><th mat-header-cell *matHeaderCellDef>Modalidad</th><td mat-cell *matCellDef="let row">{{ row.trainingModalityName }}</td></ng-container>
        <ng-container matColumnDef="room"><th mat-header-cell *matHeaderCellDef>Sala principal</th><td mat-cell *matCellDef="let row">{{ row.defaultRoomName || 'Sin sala' }}</td></ng-container>
        <ng-container matColumnDef="enrollments"><th mat-header-cell *matHeaderCellDef>Alumnos (cupos)</th><td mat-cell *matCellDef="let row">{{ row.occupiedEnrollmentCount ?? '?' }} / {{ row.capacity ?? 'Sin l?mite' }}</td></ng-container>
        <ng-container matColumnDef="capacity"><th mat-header-cell *matHeaderCellDef>Capacidad</th><td mat-cell *matCellDef="let row">{{ row.capacity ?? 'Sin límite' }}</td></ng-container>
        <ng-container matColumnDef="validity"><th mat-header-cell *matHeaderCellDef>Vigencia</th><td mat-cell *matCellDef="let row" class="whitespace-nowrap">{{ row.startDate ? (row.startDate | date:'dd/MM/yyyy') : 'Sin inicio' }}<br />{{ row.endDate ? (row.endDate | date:'dd/MM/yyyy') : 'Sin término' }}</td></ng-container>
        <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Estado</th><td mat-cell *matCellDef="let row">{{ statusLabel(row.status) }}</td></ng-container>
        <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>Acciones</th><td mat-cell *matCellDef="let row"><bte-class-status-actions [course]="row" [academyId]="academyId" (changed)="onChanged()" /></td></ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr><tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
    </div></vex-page-layout-content></vex-page-layout>`
})
export class ClassListComponent implements OnInit {
  private route = inject(ActivatedRoute); private service = inject(ClassManagementService);
  private academy = inject(AcademyManagementService); private destroyRef = inject(DestroyRef);
  private reload = new Subject<void>(); private metadataReload = new Subject<void>();
  filters = inject(FormBuilder).nonNullable.group({ search: '', status: '' as ClassStatus | '', trainingModalityId: null as number | null, roomId: null as number | null });
  academyId = 0; courses: AcademyClassListItem[] = []; modalities: TrainingModality[] = []; rooms: AcademyRoom[] = [];
  summary?: AcademyClassSummary; loading = true; error = ''; metadataError = '';
  columns = ['code', 'name', 'modality', 'room', 'enrollments', 'capacity', 'validity', 'status', 'actions'];
  statusLabel = classStatusLabel;
  get hasFilters(): boolean { const f = this.filters.getRawValue(); return !!(f.search.trim() || f.status || f.trainingModalityId || f.roomId); }
  ngOnInit(): void {
    this.reload.pipe(switchMap(() => {
      this.loading = true; this.error = '';
      return this.service.getClasses(this.academyId, this.filters.getRawValue()).pipe(catchError(error => { this.error = error.error?.message || 'No fue posible cargar las clases.'; return of([]); }));
    }), takeUntilDestroyed(this.destroyRef)).subscribe(courses => { this.courses = courses; this.loading = false; });
    this.metadataReload.pipe(switchMap(() => {
      this.metadataError = '';
      return forkJoin({ summary: this.service.getClassesSummary(this.academyId), modalities: this.academy.getTrainingModalities(this.academyId), rooms: this.academy.getRooms(this.academyId) })
        .pipe(catchError(() => { this.metadataError = 'No fue posible cargar el resumen y los filtros.'; return of(null); }));
    }), takeUntilDestroyed(this.destroyRef)).subscribe(value => { if (value) { this.summary = value.summary; this.modalities = value.modalities; this.rooms = value.rooms; } });
    this.filters.valueChanges.pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.academyId = Number(params.get('academyId')); this.summary = undefined; this.modalities = []; this.rooms = [];
      this.loadMetadata(); this.load();
    });
  }
  load(): void { this.reload.next(); }
  loadMetadata(): void { this.metadataReload.next(); }
  clearFilters(): void { this.filters.reset({ search: '', status: '', trainingModalityId: null, roomId: null }); }
  onChanged(): void { this.load(); this.loadMetadata(); }
}
