import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AcademyInstructor, ClassInstructorAssignment, ClassInstructorRequest } from '../models/academy-management.models';
import { AcademyOperationsService } from '../services/academy-operations.service';
import { localDate } from './enrollment-status.util';
export const instructorRoles = { HEAD_INSTRUCTOR: 'Instructor jefe', INSTRUCTOR: 'Instructor', ASSISTANT: 'Asistente' };
@Component({ standalone: true, selector: 'bte-class-instructor-dialog', imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, MatProgressSpinnerModule],
  template: `<h2 mat-dialog-title>{{ data.assignment ? 'Editar asignación' : 'Asignar instructor' }}</h2><mat-dialog-content><form [formGroup]="form" (ngSubmit)="save()" id="instructor-form" class="flex flex-col gap-3 pt-2">
    <mat-form-field><mat-label>Instructor de la academia</mat-label><mat-select formControlName="academyInstructorId"><mat-option *ngFor="let instructor of available" [value]="instructor.id">{{ instructor.personName || ('Instructor ' + instructor.id) }}{{ instructor.isActive ? '' : ' (Inactivo)' }}</mat-option></mat-select><mat-hint>Selecciona un instructor ya registrado en la academia.</mat-hint></mat-form-field>
    <p *ngIf="!available.length">No hay instructores disponibles para asignar.</p>
    <mat-form-field><mat-label>Rol</mat-label><mat-select formControlName="role"><mat-option *ngFor="let role of roles | keyvalue" [value]="role.key">{{ role.value }}</mat-option></mat-select></mat-form-field>
    <mat-checkbox formControlName="isPrimary">Instructor principal</mat-checkbox>
    <mat-form-field><mat-label>Desde</mat-label><input matInput type="date" formControlName="startDate"></mat-form-field><mat-form-field><mat-label>Hasta (opcional)</mat-label><input matInput type="date" formControlName="endDate" [min]="form.controls.startDate.value || ''"></mat-form-field>
  </form><p *ngIf="error" role="alert">{{ error }}</p></mat-dialog-content><mat-dialog-actions align="end"><button mat-button [disabled]="saving" (click)="ref.close()">Cancelar</button><button mat-flat-button color="primary" type="submit" form="instructor-form" [disabled]="saving || !available.length">{{ saving ? 'Guardando…' : 'Guardar' }}</button><mat-spinner *ngIf="saving" diameter="22" /></mat-dialog-actions>` })
export class ClassInstructorDialogComponent {
  data = inject<{ classId: number; academyId: number; instructors: AcademyInstructor[]; assignments: ClassInstructorAssignment[]; assignment?: ClassInstructorAssignment }>(MAT_DIALOG_DATA);
  ref = inject(MatDialogRef<ClassInstructorDialogComponent>); private fb = inject(FormBuilder); private api = inject(AcademyOperationsService); private destroyRef = inject(DestroyRef);
  saving = false; error = ''; roles = instructorRoles;
  form = this.fb.group({ academyInstructorId: [0, [Validators.required, Validators.min(1)]], role: ['INSTRUCTOR' as ClassInstructorRequest['role'], Validators.required], isPrimary: [false], startDate: [localDate() as string | null], endDate: [null as string | null] });
  get available(): AcademyInstructor[] { return this.data.instructors.filter(i => i.academyId === this.data.academyId && (i.isActive || i.id === this.data.assignment?.academyInstructorId) && !this.data.assignments.some(a => a.id !== this.data.assignment?.id && a.academyInstructorId === i.id && a.status === 'ACTIVE')); }
  constructor() { if (this.data.assignment) this.form.patchValue({ ...this.data.assignment, role: this.data.assignment.role as ClassInstructorRequest['role'] }); }
  save(): void {
    if (this.saving) return;
    this.error = ''; if (this.form.invalid) { this.form.markAllAsTouched(); this.error = 'Selecciona un instructor y su rol.'; return; }
    const value = this.form.getRawValue();
    if (!this.available.some(i => i.id === value.academyInstructorId)) { this.error = 'Selecciona un instructor disponible de esta academia.'; return; }
    if (value.endDate && value.startDate && value.endDate < value.startDate) { this.error = 'La fecha de término no puede preceder al inicio.'; return; }
    if (value.isPrimary && this.data.assignments.some(a => a.id !== this.data.assignment?.id && a.isPrimary && a.status === 'ACTIVE')) { this.error = 'La clase ya tiene un instructor principal. Edita primero su asignación.'; return; }
    const payload: ClassInstructorRequest = { academyInstructorId: value.academyInstructorId!, role: value.role!, isPrimary: !!value.isPrimary, startDate: value.startDate || null, endDate: value.endDate || null };
    this.saving = true; this.ref.disableClose = true; this.form.disable();
    const request = this.data.assignment ? this.api.updateClassInstructor(this.data.assignment.id, payload) : this.api.assignInstructor(this.data.classId, payload);
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => { this.saving = false; this.ref.disableClose = false; this.form.enable(); })).subscribe({ next: () => this.ref.close(true), error: error => this.error = error.error?.message || 'No fue posible guardar la asignación.' });
  }
}
