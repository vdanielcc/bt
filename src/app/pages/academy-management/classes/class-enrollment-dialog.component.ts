import { planAvailable } from '../billing/billing-plan.util';
import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, finalize, of, switchMap } from 'rxjs';
import { AcademyOperationsService } from '../services/academy-operations.service';
import { ClassManagementService } from '../services/class-management.service';
import { AcademyClassListItem, BillingPlan, ClassEnrollmentListItem, EnrollmentCandidate } from '../models/academy-management.models';
import { enrollmentStatusLabel, localDate } from './enrollment-status.util';

@Component({
  standalone: true, selector: 'bte-class-enrollment-dialog',
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatProgressSpinnerModule],
  template: `<h2 mat-dialog-title>{{ data.row ? 'Editar inscripción' : 'Inscribir alumno' }}</h2>
  <mat-dialog-content><p>{{ data.course.name }}</p>
    <p *ngIf="data.row">{{ data.row.studentName }}</p>
    <mat-form-field *ngIf="!data.row" class="w-full"><mat-label>Buscar alumno por nombre o documento</mat-label>
      <input matInput [formControl]="student" [matAutocomplete]="auto" autocomplete="off">
      <mat-autocomplete #auto="matAutocomplete" [displayWith]="displayStudent"><mat-option *ngFor="let candidate of candidates" [value]="candidate">{{ candidate.fullName }} · {{ candidate.documentNumber }}</mat-option></mat-autocomplete>
      <mat-hint>Escribe al menos 2 caracteres. Solo alumnos activos de esta academia.</mat-hint>
    </mat-form-field>
    <p *ngIf="searchError" role="alert">{{ searchError }}</p>
    <p *ngIf="searched && !searching && !candidates.length && !searchError">Sin alumnos elegibles para esta búsqueda.</p>
    <mat-spinner *ngIf="searching" diameter="22" />
    <mat-form-field class="w-full mt-4"><mat-label>Fecha de inscripción</mat-label><input matInput type="date" [formControl]="date" [readonly]="!!data.row"></mat-form-field>
    <mat-form-field *ngIf="plans.length" class="w-full"><mat-label>Plan / Membresía (opcional)</mat-label><mat-select [formControl]="plan"><mat-option [value]="null">Sin plan</mat-option><mat-option *ngFor="let p of plans" [value]="p.id" [disabled]="!available(p)">{{ p.name }}{{ available(p) ? '' : ' (histórico)' }}</mat-option></mat-select></mat-form-field>
    <p *ngIf="!plans.length && !planError">Esta clase aún no tiene planes o membresías configurados.</p>
    <p *ngIf="data.row?.billingPlanId && !plans.length">Plan actual: {{ data.row?.billingPlanName }} (histórico).</p>
    <p *ngIf="planError" role="alert">{{ planError }} <button mat-button (click)="loadPlans()">Reintentar</button></p>
    <mat-form-field class="w-full"><mat-label>Observaciones</mat-label><textarea matInput [formControl]="notes" maxlength="500"></textarea></mat-form-field>
    <p *ngIf="error" role="alert" class="text-red-600">{{ error }}</p>
  </mat-dialog-content><mat-dialog-actions align="end"><button mat-button [disabled]="saving" (click)="ref.close()">Cancelar</button>
    <button mat-flat-button color="primary" [disabled]="saving || !date.value || (!data.row && !selected)" (click)="save()">{{ saving ? 'Guardando…' : 'Guardar' }}</button><mat-spinner *ngIf="saving" diameter="22" />
  </mat-dialog-actions>`
})
export class ClassEnrollmentDialogComponent {
  data = inject<{ course: AcademyClassListItem; row?: ClassEnrollmentListItem }>(MAT_DIALOG_DATA);
  ref = inject(MatDialogRef<ClassEnrollmentDialogComponent>);
  private api = inject(AcademyOperationsService); private classes = inject(ClassManagementService); private destroyRef = inject(DestroyRef);
  student = new FormControl<string | EnrollmentCandidate>('');
  date = new FormControl(this.data.row?.enrollmentDate ?? localDate(), { nonNullable: true });
  plan = new FormControl<number | null>(this.data.row?.billingPlanId ?? null);
  notes = new FormControl(this.data.row?.notes ?? '', { nonNullable: true });
  candidates: EnrollmentCandidate[] = []; plans: BillingPlan[] = []; error = ''; searchError = ''; planError = ''; searching = false; searched = false; saving = false;
  get selected(): EnrollmentCandidate | null { return typeof this.student.value === 'object' ? this.student.value : null; }
  displayStudent(value: EnrollmentCandidate | string | null): string { return typeof value === 'object' ? value?.fullName ?? '' : value ?? ''; }
  constructor() {
    this.loadPlans();
    this.date.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadPlans());
    this.student.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), switchMap(value => {
      this.searchError = ''; this.searched = false; this.candidates = [];
      if (typeof value !== 'string' || value.trim().length < 2) return of([]);
      this.searching = true; this.searched = true;
      return this.api.availableStudents(this.data.course.id, value.trim()).pipe(catchError(error => { this.searchError = error.error?.message || 'No fue posible buscar alumnos.'; return of([]); }), finalize(() => this.searching = false));
    }), takeUntilDestroyed(this.destroyRef)).subscribe(rows => this.candidates = rows);
  }
  loadPlans(): void {
    this.planError = '';
    this.classes.getBillingPlans(this.data.course.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: rows => {
      this.plans = rows.filter(p => planAvailable(p, this.data.row ? localDate() : this.date.value) || p.id === this.data.row?.billingPlanId);
      if (!this.data.row && !this.plan.dirty) this.plan.setValue(this.plans.find(p => p.isDefault)?.id ?? null);
    }, error: () => this.planError = 'No fue posible cargar los planes; puedes guardar sin asignar uno.' });
  }
  available(p: BillingPlan): boolean { return planAvailable(p, this.data.row ? localDate() : this.date.value); }
  save(): void {
    if (this.saving || !this.date.value || (!this.data.row && !this.selected)) return;
    this.saving = true; this.error = ''; this.ref.disableClose = true;
    const row = this.data.row;
    const request = row ? this.api.updateEnrollment(row.id, { startDate: row.startDate, endDate: row.endDate, status: row.status, billingPlanId: this.plan.value, notes: this.notes.value || null })
      : this.api.enroll(this.data.course.id, { studentId: this.selected!.studentId, enrollmentDate: this.date.value, billingPlanId: this.plan.value, notes: this.notes.value || null });
    request.pipe(finalize(() => { this.saving = false; this.ref.disableClose = false; }), takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => this.ref.close(true), error: error => this.error = error.error?.message || 'No fue posible guardar la inscripción.' });
  }
}
