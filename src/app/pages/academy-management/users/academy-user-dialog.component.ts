import { Component, DestroyRef, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { normalizeStudentDocument, validStudentDocument } from '../../championships/students/student-document';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, debounceTime, finalize, of, startWith, switchMap } from 'rxjs';
import { ACADEMY_USER_ROLES, ADMIN_USER_ROLES, AcademyUser, AcademyUserOptions, AcademyUserRole, AcademyUsersService,
  CreateAcademyUser, UserPersonOption, userManagementError } from './academy-users.service';

@Component({
  selector: 'bte-academy-user-dialog', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatRadioModule, MatCheckboxModule, MatProgressSpinnerModule],
  templateUrl: './academy-user-dialog.component.html',
  styles: [`mat-dialog-content{padding-top:8px!important}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 16px}.full{grid-column:1/-1}mat-form-field{width:100%}mat-radio-group{display:flex;gap:16px;flex-wrap:wrap;margin:8px 0 20px}.error{color:#b91c1c;margin:12px 0}.hint{margin:8px 0 16px;opacity:.8}.person-name{font-size:18px;font-weight:500;margin-bottom:16px}@media(max-width:540px){.grid{grid-template-columns:1fr}}`]
})
export class AcademyUserDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  get roles(): ReadonlyArray<{ value: AcademyUserRole; label: string }> {
    return this.data.systemAdmin ? ADMIN_USER_ROLES : ACADEMY_USER_ROLES;
  }
  readonly today = new Date().toISOString().slice(0, 10);
  readonly mode = this.fb.nonNullable.control<'existing' | 'new'>('existing');
  readonly search = this.fb.nonNullable.control('');
  readonly personId = this.fb.control<number | null>(null, Validators.required);
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    role: ['alumno' as AcademyUserRole, Validators.required],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    passwordConfirm: ['', Validators.required],
    isActive: true
  });
  readonly person = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)]],
    lastName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)]],
    birthDate: ['', Validators.required],
    gender: ['', Validators.required],
    documentTypeId: [0, [Validators.required, Validators.min(1)]],
    documentNumber: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/\S/)]]
  });
  options?: AcademyUserOptions;
  people: UserPersonOption[] = [];
  loadingPeople = false;
  loadingOptions = false;
  peopleError = '';
  optionsError = '';
  error = '';
  saving = false;
  showPassword = false;
  constructor(@Inject(MAT_DIALOG_DATA) public readonly data: {
    academyId: number; academyName?: string; systemAdmin?: boolean; user?: AcademyUser
  },
    private readonly api: AcademyUsersService, private readonly ref: MatDialogRef<AcademyUserDialogComponent>) {}

  ngOnInit(): void {
    if (this.data.user) {
      this.form.patchValue(this.data.user);
      this.form.controls.password.disable();
      this.form.controls.passwordConfirm.disable();
      return;
    }
    this.loadOptions();
    this.search.valueChanges.pipe(startWith(''), debounceTime(250), switchMap(term => {
      this.loadingPeople = true;
      this.peopleError = '';
      this.personId.reset();
      return this.api.people(this.data.academyId, term).pipe(
        catchError(error => { this.peopleError = userManagementError(error); return of([]); }),
        finalize(() => this.loadingPeople = false)
      );
    }), takeUntilDestroyed(this.destroyRef)).subscribe(people => this.people = people);
  }

  loadOptions(): void {
    this.loadingOptions = true;
    this.optionsError = '';
    this.api.options(this.data.academyId).pipe(takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loadingOptions = false)).subscribe({
      next: options => this.options = options,
      error: error => this.optionsError = userManagementError(error)
    });
  }
  retryPeople(): void { this.search.setValue(this.search.value); }
  get passwordMismatch(): boolean {
    return !this.data.user && this.form.controls.password.value !== this.form.controls.passwordConfirm.value;
  }
  save(): void {
    if (this.saving) return;
    this.error = '';
    this.form.markAllAsTouched();
    if (this.form.invalid || this.passwordMismatch) return;
    const value = this.form.getRawValue();
    let request;
    if (this.data.user) {
      request = this.api.update(this.data.academyId, this.data.user.id,
        { email: value.email.trim(), role: value.role, isActive: value.isActive });
    } else {
      const body: CreateAcademyUser = { email: value.email.trim(), role: value.role, password: value.password };
      if (this.mode.value === 'existing') {
        this.personId.markAsTouched();
        if (this.personId.invalid || !this.people.some(p => p.id === this.personId.value)) return;
        body.personId = this.personId.value!;
      } else {
        this.person.markAllAsTouched();
        if (this.person.invalid || !this.options || this.loadingOptions || this.optionsError) return;
        if (this.person.controls.birthDate.value > this.today) {
          this.error = 'La fecha de nacimiento no puede ser futura.'; return;
        }
        body.person = this.person.getRawValue();
        const type = this.options.documentTypes.find(t => t.id === body.person!.documentTypeId);
        const code = (type?.code ?? '').trim().toUpperCase();
        const country = code === 'RUN' || code === 'RUT' ? 'CL' : code === 'CPF' ? 'BR' : '';
        if (country && !validStudentDocument(body.person.documentNumber, country)) {
          this.error = 'Ingresa un documento válido.'; return;
        }
        body.person.documentNumber = normalizeStudentDocument(body.person.documentNumber, country);
      }
      request = this.api.create(this.data.academyId, body);
    }
    this.saving = true;
    this.ref.disableClose = true;
    request.pipe(finalize(() => { this.saving = false; this.ref.disableClose = false; }))
      .subscribe({ next: () => this.ref.close(true), error: error => this.error = userManagementError(error) });
  }
}
