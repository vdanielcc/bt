import { Component, DestroyRef, Input, OnChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, forkJoin, of, switchMap } from 'rxjs';
import { AcademyClassListItem, AcademyRoom, ClassSchedule } from '../models/academy-management.models';
import { ClassManagementService } from '../services/class-management.service';
import { AcademyManagementService } from '../services/academy-management.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ScheduleFormDialogComponent } from './schedule-form-dialog.component';
import { AcademyConfirmDialogComponent } from '../shared/academy-confirm-dialog.component';

@Component({ standalone: true, selector: 'bte-class-schedules', imports: [CommonModule, MatButtonModule, MatProgressSpinnerModule],
  template: `<section class="p-6"><div class="flex flex-wrap justify-between gap-4"><h2 class="title">Horarios de la clase</h2>
    <button *ngIf="canManage" mat-flat-button color="primary" [disabled]="busy || loading || !!error || course.status === 'CLOSED'" (click)="edit()">+ Agregar horario</button></div>
    <p *ngIf="!loading && !error && !activeCount" role="alert" class="my-4">Esta clase necesita al menos un horario activo para inscribir o reactivar alumnos.</p>
    <mat-spinner *ngIf="loading" diameter="32" /><p *ngIf="error" role="alert">{{ error }} <button mat-button (click)="load()">Reintentar</button></p>
    <p *ngIf="actionError" role="alert">{{ actionError }}</p>
    <div *ngIf="!loading && !error" class="overflow-x-auto"><table *ngIf="rows.length" class="w-full text-left"><thead><tr><th>Día</th><th>Horario</th><th>Sala</th><th>Vigencia</th><th>Estado</th><th *ngIf="canManage">Acciones</th></tr></thead>
      <tbody><tr *ngFor="let row of rows" class="border-b"><td>{{ days[row.dayOfWeek - 1] }}</td><td class="whitespace-nowrap">{{ row.startTime.slice(0,5) }} – {{ row.endTime.slice(0,5) }}</td><td>{{ roomName(row) }}</td>
      <td>{{ row.effectiveFrom | date:'dd/MM/yyyy' }} · {{ row.effectiveTo ? (row.effectiveTo | date:'dd/MM/yyyy') : 'Sin término' }}</td><td>{{ row.isActive ? 'Activo' : 'Inactivo' }}</td>
      <td *ngIf="canManage"><button mat-button [disabled]="busy || course.status === 'CLOSED'" (click)="edit(row)">Editar</button><button *ngIf="row.isActive" mat-button [disabled]="busy || course.status === 'CLOSED' || (course.status === 'ACTIVE' && activeCount === 1)" (click)="deactivate(row)">Desactivar</button></td></tr></tbody></table>
      <p *ngIf="!rows.length" class="py-4">Esta clase aún no tiene horarios.</p>
      <p *ngIf="course.status === 'ACTIVE' && activeCount === 1" class="mt-4 text-secondary">Una clase activa debe conservar al menos un horario activo. Agrega otro horario o desactiva la clase antes de desactivar el último.</p>
    </div></section>`, styles: ['th,td { padding: .75rem; }'] })
export class ClassSchedulesComponent implements OnChanges {
  @Input({ required: true }) course!: AcademyClassListItem;
  private api = inject(ClassManagementService); private academy = inject(AcademyManagementService); private auth = inject(AuthService); private dialog = inject(MatDialog); private destroyRef = inject(DestroyRef);
  private reload = new Subject<void>(); rows: ClassSchedule[] = []; rooms: AcademyRoom[] = []; loading = true; busy = false; error = ''; actionError = '';
  days = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  get canManage(): boolean { return ['admin','academy_admin'].includes((this.auth.getCurrentUser()?.rol || '').toLowerCase()); }
  get activeCount(): number { return this.rows.filter(row => row.isActive).length; }
  constructor() {
    this.reload.pipe(switchMap(() => { this.loading = true; this.error = ''; return forkJoin({ rows: this.api.getSchedules(this.course.id), rooms: this.canManage ? this.academy.getRooms(this.course.academyId) : of([] as AcademyRoom[]) }).pipe(catchError(error => { this.error = error.error?.message || 'No fue posible cargar los horarios.'; return of(null); })); }), takeUntilDestroyed(this.destroyRef)).subscribe(result => { this.loading = false; if (result) { this.rows = result.rows.sort((a,b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)); this.rooms = result.rooms; } });
  }
  ngOnChanges(): void { this.load(); }
  load(): void { this.reload.next(); }
  roomName(row: ClassSchedule): string { return row.roomId == null ? this.course.defaultRoomName || 'Sin sala principal' : this.rooms.find(room => room.id === row.roomId)?.name || `Sala ${row.roomId}`; }
  edit(schedule?: ClassSchedule): void {
    if (!this.canManage || this.busy || this.loading || this.error || this.course.status === 'CLOSED') return;
    this.busy = true; this.actionError = '';
    this.dialog.open(ScheduleFormDialogComponent, { width: '620px', maxWidth: '95vw', data: { academyId: this.course.academyId, classId: this.course.id, schedule, mustRemainActive: this.course.status === 'ACTIVE' && !!schedule?.isActive && this.activeCount === 1 } }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(saved => { this.busy = false; if (saved) this.load(); });
  }
  deactivate(row: ClassSchedule): void {
    if (!this.canManage || this.busy || this.course.status === 'CLOSED') return;
    if (this.course.status === 'ACTIVE' && this.activeCount <= 1) { this.actionError = 'La clase activa debe conservar al menos un horario activo.'; return; }
    this.busy = true; this.actionError = '';
    this.dialog.open(AcademyConfirmDialogComponent, { data: { title: 'Desactivar horario', action: 'Desactivar', message: `¿Desactivar el horario del ${this.days[row.dayOfWeek - 1]} a las ${row.startTime.slice(0,5)}? El registro se conservará.` } }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(ok => {
      if (!ok) { this.busy = false; return; }
      this.api.deleteSchedule(row.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.busy = false; this.load(); }, error: error => { this.busy = false; this.actionError = error.error?.message || 'No fue posible desactivar el horario.'; } });
    });
  }
}
