import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  DateAdapter,
  ErrorStateMatcher,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE
} from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  Observable,
  of,
  switchMap
} from 'rxjs';
import {
  AcademyInstructor,
  PersonOption
} from '../models/academy-management.models';
import { AcademyManagementService } from '../services/academy-management.service';
import {
  INSTRUCTOR_DATE_FORMATS,
  InstructorDateAdapter
} from './instructor-date-adapter';
import {
  instructorDateOrder,
  instructorToday,
  oneMonthBefore,
  startDateNotBefore
} from './instructor-date-rules';
import { AcademyConfirmDialogComponent } from '../shared/academy-confirm-dialog.component';

@Component({
  selector: 'bte-instructor-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatSlideToggleModule
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-CL' },
    { provide: DateAdapter, useClass: InstructorDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: INSTRUCTOR_DATE_FORMATS }
  ],
  template: ` <h2 mat-dialog-title>
      {{ data.instructor ? 'Editar' : 'Registrar' }} instructor
    </h2>
    <mat-dialog-content [formGroup]="form" class="grid">
      <mat-form-field class="wide">
        <mat-label>Persona existente</mat-label>
        <input
          matInput
          required
          placeholder="Buscar por nombre"
          [formControl]="personSearch"
          [matAutocomplete]="people" />
        <mat-autocomplete
          #people="matAutocomplete"
          [displayWith]="displayPerson"
          [requireSelection]="false"
          [autoActiveFirstOption]="true">
          <mat-option *ngFor="let person of filteredPersons" [value]="person">{{
            personLabel(person)
          }}</mat-option>
          <mat-option *ngIf="!filteredPersons.length" disabled
            >No hay personas disponibles</mat-option
          >
        </mat-autocomplete>
        <mat-hint
          >Escribe al menos dos letras y selecciona una persona con rol Coach o
          Sportman.</mat-hint
        >
        <mat-error>Selecciona una persona de la lista.</mat-error>
      </mat-form-field>
      <mat-form-field
        ><mat-label>Título</mat-label><input matInput formControlName="title"
      /></mat-form-field>
      <mat-form-field
        ><mat-label>Licencia (opcional)</mat-label
        ><input matInput formControlName="licenseNumber"
      /></mat-form-field>
      <mat-form-field>
        <mat-label>Fecha ingreso</mat-label
        ><input
          matInput
          placeholder="dd-mm-yyyy"
          [matDatepicker]="start"
          [min]="minimumStartDate"
          formControlName="startDate"
          required />
        <mat-datepicker-toggle
          matIconSuffix
          [for]="start"></mat-datepicker-toggle
        ><mat-datepicker #start></mat-datepicker>
        <mat-hint>Desde {{ minimumStartDate | date: 'dd-MM-yyyy' }}.</mat-hint>
        <mat-error *ngIf="form.controls.startDate.hasError('required')"
          >Ingresa la fecha de ingreso.</mat-error
        >
        <mat-error
          *ngIf="
            form.controls.startDate.hasError('startTooOld') ||
            form.controls.startDate.hasError('matDatepickerMin')
          "
          >La fecha de ingreso no puede ser anterior a un mes atrás.</mat-error
        >
        <mat-error
          *ngIf="form.controls.startDate.hasError('matDatepickerParse')"
          >Ingresa una fecha válida: dd-mm-yyyy.</mat-error
        >
      </mat-form-field>
      <mat-form-field>
        <mat-label>Fecha término (opcional)</mat-label
        ><input
          matInput
          placeholder="dd-mm-yyyy"
          [matDatepicker]="end"
          [min]="minimumEndDate"
          [errorStateMatcher]="endDateErrors"
          formControlName="endDate" />
        <mat-datepicker-toggle matIconSuffix [for]="end"></mat-datepicker-toggle
        ><mat-datepicker #end></mat-datepicker>
        <mat-error
          *ngIf="
            form.hasError('endNotAfterStart') ||
            form.controls.endDate.hasError('matDatepickerMin')
          "
          >La fecha de término debe ser posterior a la fecha de
          ingreso.</mat-error
        >
        <mat-error *ngIf="form.controls.endDate.hasError('matDatepickerParse')"
          >Ingresa una fecha válida: dd-mm-yyyy.</mat-error
        >
      </mat-form-field>
      <mat-slide-toggle formControlName="isActive">Activo</mat-slide-toggle>
    </mat-dialog-content>
    <mat-dialog-actions align="end"
      ><button mat-button mat-dialog-close>Cancelar</button
      ><button
        mat-flat-button
        color="primary"
        [disabled]="saving"
        (click)="save()">
        {{ saving ? 'Guardando...' : 'Guardar' }}
      </button></mat-dialog-actions
    >`,
  styles: [
    `
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        padding-top: 0.5rem;
      }
      .wide {
        grid-column: 1/-1;
      }
    `
  ]
})
export class InstructorFormDialogComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  readonly today = instructorToday();
  minimumStartDate = oneMonthBefore(this.today);
  saving = false;
  persons: PersonOption[] = [];
  personSearch = new FormControl<PersonOption | string | null>(
    null,
    (control) =>
      control.value &&
      typeof control.value === 'object' &&
      this.persons.some((person) => person.id === control.value.id)
        ? null
        : { selectionRequired: true }
  );
  form = this.fb.group(
    {
      personId: [0, [Validators.required, Validators.min(1)]],
      title: ['', Validators.maxLength(100)],
      licenseNumber: ['', Validators.maxLength(100)],
      startDate: new FormControl<Date | null>(this.today, [
        Validators.required,
        startDateNotBefore(this.minimumStartDate)
      ]),
      endDate: new FormControl<Date | null>(null),
      isActive: [true]
    },
    { validators: instructorDateOrder }
  );
  readonly endDateErrors: ErrorStateMatcher = {
    isErrorState: (control) =>
      !!control &&
      (control.touched || this.form.touched) &&
      (control.invalid || this.form.hasError('endNotAfterStart'))
  };
  get minimumEndDate(): Date | null {
    const start = this.form.controls.startDate.value;
    return start && !Number.isNaN(start.getTime())
      ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1)
      : null;
  }
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: { academyId: number; instructor?: AcademyInstructor },
    private fb: FormBuilder,
    private service: AcademyManagementService,
    private ref: MatDialogRef<InstructorFormDialogComponent>,
    private snack: MatSnackBar,
    private dialog: MatDialog
  ) {
    if (data.instructor) {
      const original = this.parseDate(data.instructor.startDate);
      const minimum = this.minimumStartDate;
      if (original && original < minimum) this.minimumStartDate = original;
      this.form.controls.startDate.setValidators([
        Validators.required,
        (control) =>
          control.value instanceof Date &&
          original &&
          control.value.getTime() === original.getTime()
            ? null
            : startDateNotBefore(minimum)(control)
      ]);
      this.form.patchValue({
        ...data.instructor,
        startDate: original,
        endDate: this.parseDate(data.instructor.endDate)
      });
    }
  }
  ngOnInit(): void {
    if (this.data.instructor) {
      const instructor = this.data.instructor;
      const selected: PersonOption = {
        id: instructor.personId,
        nombreCompleto:
          instructor.personName ?? `Persona ${instructor.personId}`
      };
      this.persons = [selected];
      this.personSearch.setValue(selected);
    }
    this.personSearch.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.form.controls.personId.setValue(
          value &&
            typeof value === 'object' &&
            this.persons.some((person) => person.id === value.id)
            ? value.id
            : 0
        );
      });
    this.personSearch.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((value) =>
          typeof value === 'string' && value.trim().length >= 2
            ? this.service
                .getInstructorCandidates(this.data.academyId, value.trim())
                .pipe(
                  catchError((error) => {
                    this.snack.open(
                      error?.error?.message ??
                        'No fue posible buscar personas.',
                      'Cerrar',
                      { duration: 4000 }
                    );
                    return of([] as PersonOption[]);
                  })
                )
            : of([] as PersonOption[])
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((rows) => {
        const selected = this.personSearch.value;
        this.persons =
          typeof selected === 'object' && selected
            ? [selected, ...rows.filter((x) => x.id !== selected.id)]
            : rows;
        this.personSearch.updateValueAndValidity({ emitEvent: false });
      });
  }
  get filteredPersons(): PersonOption[] {
    const query =
      typeof this.personSearch.value === 'string'
        ? this.normalize(this.personSearch.value)
        : '';
    return this.persons.filter((person) =>
      this.normalize(this.personLabel(person)).includes(query)
    );
  }
  personLabel(person: PersonOption): string {
    return (
      person.nombreCompleto ||
      `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() ||
      `Persona ${person.id}`
    );
  }
  displayPerson = (person: PersonOption | string | null): string =>
    typeof person === 'string'
      ? person
      : person
        ? this.personLabel(person)
        : '';
  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
  private parseDate(value: string | null): Date | null {
    if (!value) return null;
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  private serializeDate(value: Date | null): string | null {
    return value
      ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
      : null;
  }
  save(confirmed = false): void {
    if (this.saving) return;
    if (
      this.form.invalid ||
      this.personSearch.invalid ||
      !this.persons.some(
        (person) => person.id === this.form.controls.personId.value
      )
    ) {
      this.form.markAllAsTouched();
      this.personSearch.markAsTouched();
      this.snack.open(
        'Selecciona una persona válida y revisa las fechas.',
        'Cerrar',
        { duration: 4000 }
      );
      return;
    }
    if (
      !confirmed &&
      this.data.instructor?.isActive &&
      !this.form.controls.isActive.value
    ) {
      this.dialog
        .open(AcademyConfirmDialogComponent, {
          data: {
            message: '¿Desactivar este instructor? Se conservará su historial.'
          }
        })
        .afterClosed()
        .subscribe((value) => {
          if (value) this.save(true);
        });
      return;
    }
    this.saving = true;
    const value = this.form.getRawValue();
    const payload = {
      academyId: this.data.academyId,
      personId: value.personId!,
      title: value.title,
      licenseNumber: value.licenseNumber?.trim() || null,
      startDate: this.serializeDate(value.startDate),
      endDate: this.serializeDate(value.endDate),
      isActive: !!value.isActive
    };
    const request: Observable<unknown> = this.data.instructor
      ? this.service.updateInstructor(this.data.instructor.id, {
          ...this.data.instructor,
          ...payload
        })
      : this.service.createInstructor(this.data.academyId, payload);
    request
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (result) => this.ref.close(result || true),
        error: (error) =>
          this.snack.open(
            error?.error?.message ?? 'No fue posible guardar el instructor.',
            'Cerrar',
            { duration: 5000 }
          )
      });
  }
}
