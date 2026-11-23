import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Observable } from 'rxjs';
import { AcademyRoom, ClassSchedule } from '../models/academy-management.models';
import { AcademyManagementService } from '../services/academy-management.service';
import { ClassManagementService } from '../services/class-management.service';
import { localDate } from './enrollment-status.util';
@Component({ selector: 'bte-schedule-form-dialog', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule, MatProgressSpinnerModule],
  template: `<h2 mat-dialog-title>{{ data.schedule ? 'Editar' : 'Agregar' }} horario</h2><mat-dialog-content><form [formGroup]="form" class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2" (ngSubmit)="save()" id="schedule-form">
    <mat-form-field><mat-label>Día</mat-label><mat-select formControlName="dayOfWeek"><mat-option *ngFor="let day of days; let i=index" [value]="i+1">{{ day }}</mat-option></mat-select></mat-form-field>
    <mat-form-field><mat-label>Sala</mat-label><mat-select formControlName="roomId"><mat-option [value]="null">Sala principal de la clase</mat-option><mat-option *ngFor="let room of rooms" [value]="room.id">{{ room.name }}{{ room.isActive ? '' : ' (Inactiva)' }}</mat-option></mat-select></mat-form-field>
    <mat-form-field><mat-label>Inicio</mat-label><input matInput type="time" formControlName="startTime"></mat-form-field><mat-form-field><mat-label>Fin</mat-label><input matInput type="time" formControlName="endTime"></mat-form-field>
    <mat-form-field><mat-label>Vigente desde</mat-label><input matInput type="date" formControlName="effectiveFrom"></mat-form-field><mat-form-field><mat-label>Vigente hasta</mat-label><input matInput type="date" formControlName="effectiveTo" [min]="form.controls.effectiveFrom.value || ''"></mat-form-field>
    <mat-slide-toggle formControlName="isActive">Activo</mat-slide-toggle>
    <p *ngIf="data.schedule" class="sm:col-span-2 text-secondary">Si el horario tiene sesiones generadas, indica una vigencia posterior para guardar los cambios como nueva versión. Las sesiones existentes conservan sus datos.</p>
    <p *ngIf="data.mustRemainActive" class="sm:col-span-2 text-secondary">Este es el último horario activo; debe permanecer activo mientras la clase esté activa.</p>
  </form><p *ngIf="roomsError" role="alert">{{ roomsError }} <button mat-button (click)="loadRooms()">Reintentar</button></p><p *ngIf="error" role="alert">{{ error }}</p></mat-dialog-content>
  <mat-dialog-actions align="end"><button mat-button [disabled]="saving" (click)="ref.close()">Cancelar</button><button mat-flat-button color="primary" type="submit" form="schedule-form" [disabled]="saving || loadingRooms || !!roomsError">{{ saving ? 'Guardando…' : 'Guardar' }}</button><mat-spinner *ngIf="saving" diameter="22" /></mat-dialog-actions>` })
export class ScheduleFormDialogComponent {
  data = inject<{ academyId: number; classId: number; schedule?: ClassSchedule; mustRemainActive?: boolean }>(MAT_DIALOG_DATA);
  ref = inject(MatDialogRef<ScheduleFormDialogComponent>); private fb = inject(FormBuilder); private academy = inject(AcademyManagementService); private api = inject(ClassManagementService); private destroyRef = inject(DestroyRef);
  rooms: AcademyRoom[] = []; saving = false; loadingRooms = true; error = ''; roomsError = '';
  days = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  form = this.fb.group({ dayOfWeek: [1, [Validators.required, Validators.min(1), Validators.max(7)]], roomId: [null as number | null], startTime: ['18:00', Validators.required], endTime: ['19:00', Validators.required], effectiveFrom: [localDate(), Validators.required], effectiveTo: [''], isActive: [true] });
  constructor() {
    if (this.data.schedule) this.form.patchValue({ ...this.data.schedule, startTime: this.data.schedule.startTime.slice(0,5), endTime: this.data.schedule.endTime.slice(0,5) });
    if (this.data.mustRemainActive) this.form.controls.isActive.disable();
    this.loadRooms();
  }
  loadRooms(): void {
    this.loadingRooms = true; this.roomsError = '';
    this.academy.getRooms(this.data.academyId).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loadingRooms = false)).subscribe({ next: rows => this.rooms = rows.filter(room => room.isActive || room.id === this.data.schedule?.roomId), error: error => this.roomsError = error.error?.message || 'No fue posible cargar las salas.' });
  }
  save(): void {
    if (this.saving || this.loadingRooms || this.roomsError) return;
    this.error = ''; if (this.form.invalid) { this.form.markAllAsTouched(); this.error = 'Completa los campos obligatorios.'; return; }
    const value = this.form.getRawValue();
    if (value.startTime! >= value.endTime!) { this.error = 'La hora de término debe ser posterior a la hora de inicio.'; return; }
    if (value.effectiveTo && value.effectiveTo < value.effectiveFrom!) { this.error = 'La fecha de término no puede preceder al inicio.'; return; }
    if (this.data.mustRemainActive && !value.isActive) { this.error = 'La clase activa debe conservar su último horario activo.'; return; }
    const payload = { classId: this.data.classId, roomId: value.roomId, dayOfWeek: value.dayOfWeek!, startTime: value.startTime! + ':00', endTime: value.endTime! + ':00', effectiveFrom: value.effectiveFrom!, effectiveTo: value.effectiveTo || null, isActive: !!value.isActive };
    this.saving = true; this.form.disable(); this.ref.disableClose = true;
    const request: Observable<unknown> = this.data.schedule ? this.api.updateSchedule(this.data.schedule.id, { ...this.data.schedule, ...payload }) : this.api.createSchedule(this.data.classId, payload);
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => { this.saving = false; this.form.enable(); if (this.data.mustRemainActive) this.form.controls.isActive.disable(); this.ref.disableClose = false; })).subscribe({ next: () => this.ref.close(true), error: error => this.error = error.error?.message || 'No fue posible guardar el horario.' });
  }
}
