import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize, forkJoin } from 'rxjs';
import { AcademyClass, AcademyClassListItem, AcademyClassRequest, AcademyRoom, ClassStatus, TrainingModality } from '../models/academy-management.models';
import { AcademyManagementService } from '../services/academy-management.service';
import { ClassManagementService } from '../services/class-management.service';
import { requiredTrimmed } from '../catalog/academy-catalog.validators';
import { AcademyConfirmDialogComponent } from '../shared/academy-confirm-dialog.component';

export function classDateOrder(control: AbstractControl): ValidationErrors | null {
  const start = control.get('startDate')?.value;
  const end = control.get('endDate')?.value;
  return start && end && start > end ? { dateOrder: true } : null;
}

@Component({
  standalone: true, selector: 'bte-class-editor',
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressSpinnerModule],
  template: `<div *ngIf="loading" class="p-6 flex justify-center"><mat-spinner diameter="42" /></div>
    <div *ngIf="loadError" class="p-6" role="alert">{{ loadError }} <button mat-button (click)="loadOptions()">Reintentar</button></div>
    <form *ngIf="!loading && !loadError" [formGroup]="form" (ngSubmit)="save()" class="p-6">
      <h2 class="text-xl mb-4">Datos generales</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <mat-form-field><mat-label>Código (opcional)</mat-label><input matInput formControlName="code" maxlength="30" /><mat-error>Máximo 30 caracteres.</mat-error></mat-form-field>
        <mat-form-field><mat-label>Nombre</mat-label><input matInput formControlName="name" maxlength="120" /><mat-error>Ingresa un nombre de hasta 120 caracteres.</mat-error></mat-form-field>
        <mat-form-field><mat-label>Modalidad de entrenamiento</mat-label><mat-select formControlName="trainingModalityId"><mat-option *ngFor="let item of modalities" [value]="item.id">{{ item.name }}{{ item.isActive ? '' : ' (Inactiva)' }}</mat-option></mat-select><mat-error>Selecciona una modalidad.</mat-error></mat-form-field>
        <mat-form-field><mat-label>Descripción (opcional)</mat-label><textarea matInput formControlName="description" maxlength="1000" rows="3"></textarea><mat-error>Máximo 1000 caracteres.</mat-error></mat-form-field>
      </div>
      <p *ngIf="!modalities.length" class="mb-4">Crea una modalidad activa en Gestión de clases → Modalidades antes de crear una clase.</p>
      <h2 class="text-xl mb-4">Configuración</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <mat-form-field><mat-label>Sala principal (opcional)</mat-label><mat-select formControlName="defaultRoomId"><mat-option [value]="null">Sin sala principal</mat-option><mat-option *ngFor="let item of rooms" [value]="item.id">{{ item.name }}{{ item.isActive ? '' : ' (Inactiva)' }}</mat-option></mat-select></mat-form-field>
        <mat-form-field><mat-label>Capacidad (opcional)</mat-label><input matInput type="number" min="1" step="1" formControlName="capacity" /><mat-hint>Sin valor: sin límite configurado.</mat-hint><mat-error>Ingresa un número entero mayor que cero.</mat-error></mat-form-field>
        <mat-form-field><mat-label>Fecha inicio (opcional)</mat-label><input matInput type="date" formControlName="startDate" /></mat-form-field>
        <mat-form-field><mat-label>Fecha término (opcional)</mat-label><input matInput type="date" formControlName="endDate" /></mat-form-field>
        <mat-form-field><mat-label>Estado</mat-label><mat-select formControlName="status"><mat-option value="ACTIVE">Activa</mat-option><mat-option value="INACTIVE">Inactiva</mat-option><mat-option value="CLOSED">Cerrada</mat-option></mat-select></mat-form-field>
      </div>
      <p *ngIf="form.hasError('dateOrder')" role="alert" class="text-red-600 mb-4">La fecha de inicio no puede ser posterior a la fecha de término.</p>
      <p *ngIf="error" role="alert" class="text-red-600 mb-4">{{ error }}</p>
      <div class="flex flex-wrap gap-3 mt-4"><button mat-flat-button color="primary" type="submit" [disabled]="saving || !modalities.length">{{ saving ? 'Guardando...' : 'Guardar clase' }}</button>
      <button mat-button type="button" [disabled]="saving" (click)="cancelled.emit()">Cancelar</button></div>
    </form>`
})
export class ClassEditorComponent implements OnInit {
  @Input({ required: true }) academyId = 0;
  @Input() course?: AcademyClass;
  @Output() saved = new EventEmitter<AcademyClassListItem>();
  @Output() cancelled = new EventEmitter<void>();
  private academy = inject(AcademyManagementService);
  private classes = inject(ClassManagementService);
  private dialog = inject(MatDialog);
  form = inject(FormBuilder).group({
    code: ['', Validators.maxLength(30)], name: ['', [requiredTrimmed, Validators.maxLength(120)]],
    description: ['', Validators.maxLength(1000)], trainingModalityId: [null as number | null, [Validators.required, Validators.min(1)]],
    defaultRoomId: [null as number | null], capacity: [null as number | null, [Validators.min(1), (control: AbstractControl<number | null>) => control.value == null || Number.isInteger(control.value) ? null : { integer: true }]],
    startDate: [''], endDate: [''], status: ['ACTIVE' as ClassStatus, Validators.required]
  }, { validators: classDateOrder });
  modalities: TrainingModality[] = []; rooms: AcademyRoom[] = [];
  loading = true; saving = false; confirming = false; loadError = ''; error = '';
  ngOnInit(): void {
    if (this.course) this.form.patchValue({ ...this.course, status: this.course.status as ClassStatus, startDate: this.course.startDate?.slice(0, 10) || '', endDate: this.course.endDate?.slice(0, 10) || '' });
    this.loadOptions();
  }
  loadOptions(): void {
    this.loading = true; this.loadError = '';
    forkJoin({ modalities: this.academy.getTrainingModalities(this.academyId), rooms: this.academy.getRooms(this.academyId) })
      .pipe(finalize(() => this.loading = false)).subscribe({
        next: value => {
          this.modalities = value.modalities.filter(x => x.isActive || x.id === this.course?.trainingModalityId);
          this.rooms = value.rooms.filter(x => x.isActive || x.id === this.course?.defaultRoomId);
        },
        error: () => this.loadError = 'No fue posible cargar modalidades y salas.'
      });
  }
  save(confirmed = false): void {
    if (this.loading || this.loadError || this.saving || this.confirming) return;
    const raw = this.form.getRawValue();
    this.form.patchValue({ name: raw.name?.trim() || '', code: raw.code?.trim() || '', description: raw.description?.trim() || '' });
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (!confirmed && raw.status === 'CLOSED' && this.course?.status !== 'CLOSED') {
      this.confirming = true;
      this.dialog.open(AcademyConfirmDialogComponent, { data: { title: 'Cerrar clase', action: 'Cerrar clase', message: 'Esta clase quedará cerrada y se conservará su historial. ¿Deseas continuar?' } })
        .afterClosed().subscribe(ok => { this.confirming = false; if (ok) this.save(true); });
      return;
    }
    const value = this.form.getRawValue();
    const payload: AcademyClassRequest = {
      code: value.code || null, name: value.name!, description: value.description || null,
      trainingModalityId: value.trainingModalityId!, defaultRoomId: value.defaultRoomId, capacity: value.capacity,
      startDate: value.startDate || null, endDate: value.endDate || null, status: value.status!
    };
    this.saving = true; this.error = ''; this.form.disable();
    const request = this.course ? this.classes.updateClass(this.course.id, payload) : this.classes.createClass(this.academyId, payload);
    request.pipe(finalize(() => { this.saving = false; this.form.enable(); })).subscribe({
      next: course => this.saved.emit(course),
      error: error => this.error = error.error?.message || 'No fue posible guardar la clase.'
    });
  }
}
