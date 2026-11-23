import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { finalize, Subscription } from 'rxjs';
import { StudentsService } from './students.service';
import { StudentDialogData, StudentDocumentConfiguration } from './students.models';
import { validStudentDocument, normalizeStudentDocument } from './student-document';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { LanguageService } from '../../../core/i18n/language.service';

@Component({
  selector: 'bte-student-dialog',
  standalone: true,
  templateUrl: './student-dialog.component.html',
  styleUrls: ['./student-dialog.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule,
    MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule, MatDatepickerModule, MatSelectModule, MatAutocompleteModule, TranslatePipe]
})
export class StudentDialogComponent implements OnInit, OnDestroy {
  documentConfiguration?: StudentDocumentConfiguration;
  loadingDocument = false;
  private documentSubscription?: Subscription;

  get documentLabel(): string { return this.documentConfiguration?.documentLabel ?? 'Documento de identidad'; }
  get documentError(): string {
    return this.documentConfiguration?.countryCode === 'BR' ? 'Ingresa un CPF válido.' :
      this.documentConfiguration?.countryCode === 'CL' ? 'Ingresa un RUT válido.' : 'Ingresa un documento válido.';
  }

  ngOnInit(): void {
    if (this.data.systemAdmin && this.data.mode === 'student') this.personForm.controls.rol.setValue('D');
    if (this.data.mode !== 'student' && this.data.mode !== 'edit') return;
    this.loadDocumentConfiguration();
  }

  loadDocumentConfiguration(): void {
    this.loadingDocument = true;
    this.errorMessage = '';
    this.documentSubscription = this.service.getDocumentConfiguration(this.data.academyId,
      this.data.systemAdmin && this.data.mode === 'edit' ? this.data.student?.id : undefined)
      .pipe(finalize(() => this.loadingDocument = false)).subscribe({
        next: configuration => {
          this.documentConfiguration = configuration;
          if (this.data.mode === 'student' || this.data.mode === 'edit') {
            const control = this.personForm.controls.documentNumber;
            control.setValidators([Validators.required, c => validStudentDocument(String(c.value ?? ''), configuration.countryCode)
              ? null : { document: true }]);
            control.updateValueAndValidity();
          }
        },
        error: () => this.errorMessage = this.language.translate('No se pudo obtener el documento del país de la academia. Reintenta la carga.')
      });
  }

  ngOnDestroy(): void { this.documentSubscription?.unsubscribe(); }
  saving = false;
  errorMessage = '';
  readonly maxBirthDate = this.birthDateLimit();

  readonly personForm = this.fb.group({
    firstName: [this.data.student?.firstName ?? '', [Validators.required, Validators.minLength(3)]],
    lastName: [this.data.student?.lastName ?? '', [Validators.required, Validators.minLength(3)]],
    documentNumber: [this.data.student?.documentNumber ?? '', Validators.required],
    birthDate: [this.toCalendarDate(this.data.student?.birthDate), Validators.required],
    gender: [this.normalizedGender(this.data.student?.gender), Validators.required],
    rol: [this.normalizedRole(this.data.student?.role), Validators.required],
    weight: [this.data.student?.weight ?? 0, [Validators.min(0)]],
    height: [this.data.student?.height || null as number | null, [Validators.min(0), Validators.max(2.5)]],
    level: [this.data.student?.level ?? ''],
    kata: [this.data.student?.modalities?.includes('KATA') ?? false],
    kumite: [this.data.student?.modalities?.includes('KUMITE') ?? false],
    paraKarate: [this.data.student?.modalities?.includes('PARA-KARATE') ?? false],
    address: [this.data.student?.address ?? ''],
    bloodType: [this.data.student?.bloodType ?? '']
  });

  readonly teamForm = this.fb.group({
    modality: ['', Validators.required],
    studentIds: [[] as number[], [Validators.required, Validators.minLength(2), Validators.maxLength(5)]]
  });

  readonly attorneyForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(3)]],
    lastName: ['', [Validators.required, Validators.minLength(3)]],
    run: ['', Validators.required],
    birthDate: [null as Date | null, Validators.required],
    gender: ['', Validators.required],
    rol: ['AP', Validators.required],
    studentId: [null as number | string | null, [Validators.required,
      (control: AbstractControl) => this.sportStudents.some(student => student.id === control.value)
        ? null : { studentSelection: true }]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: StudentsService,
    private readonly language: LanguageService,
    private readonly dialogRef: MatDialogRef<StudentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) readonly data: StudentDialogData
  ) {}

  get title(): string {
    if (this.data.systemAdmin) return this.data.mode === 'student' ? 'Inscribir Alumno' : 'Editar Alumno';
    return ({ student: 'Agregar Deportista / Coach', team: 'Agregar Equipo',
      attorney: 'Agregar Apoderado', edit: 'Editar Deportista / Coach' })[this.data.mode];
  }

  get sportStudents() {
    return this.data.students.filter(
      (student) => student.role === 'Sportman' || student.role === 'D'
    );
  }

  readonly displayStudent = (value: number | string | null): string => {
    if (typeof value === 'string') return value;
    const student = this.sportStudents.find(student => student.id === value);
    return student ? `${student.firstName} ${student.lastName}` : '';
  };

  get filteredAttorneyStudents() {
    const value = this.attorneyForm.controls.studentId.value;
    const normalize = (text: string) => text.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const terms = normalize(typeof value === 'string' ? value : '').split(/\s+/).filter(Boolean);
    return this.sportStudents.filter(student => {
      const name = normalize(`${student.firstName} ${student.lastName}`);
      return terms.every(term => name.includes(term));
    });
  }

  get teamCandidates() {
    const modality = this.teamForm.value.modality ?? '';
    if (modality.includes('Mixto')) return this.sportStudents;
    const expectedGender = modality.includes('Femenino') ? 'F' : 'M';
    return this.sportStudents.filter(
      (student) => this.normalizedGender(student.gender) === expectedGender
    );
  }

  submit(): void {
    this.errorMessage = '';
    const request$ = this.buildRequest();
    if (!request$) return;
    this.saving = true;
    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => this.dialogRef.close(true),
      error: (error) => (this.errorMessage = Object.values(error?.error?.errors ?? {}).flat().join(' ') || error?.error?.message || error?.error?.mensaje || this.language.translate('No fue posible guardar la información.'))
    });
  }

  isTeam(student: { role: string }): boolean {
    return student.role === 'Team' || student.role === 'Equipo';
  }

  private buildRequest() {
    if (this.saving) return null;
    if (this.data.mode === 'team') {
      if (this.teamForm.invalid) { this.teamForm.markAllAsTouched(); return null; }
      const value = this.teamForm.getRawValue();
      return this.service.createTeam(value.modality!, value.studentIds ?? []);
    }
    if (this.data.mode === 'attorney') {
      if (this.attorneyForm.invalid || !this.validRut(this.attorneyForm.value.run ?? '')) {
        this.attorneyForm.markAllAsTouched(); this.errorMessage = this.language.translate('Ingresa un RUN válido.'); return null;
      }
      const value = this.attorneyForm.getRawValue();
      const run = normalizeStudentDocument(value.run!, 'CL');
      return this.service.createAttorney({ ...value, run, birthDate: this.toApiDate(value.birthDate!), rutDv: run });
    }
    if (!this.documentConfiguration) {
      this.errorMessage = this.language.translate('No se pudo obtener el documento del país de la academia. Reintenta la carga.'); return null;
    }
    if (this.personForm.invalid) {
      this.personForm.markAllAsTouched(); this.errorMessage = this.language.translate('Completa los campos obligatorios.'); return null;
    }
    const value = this.personForm.getRawValue();
    const modalities = [value.kata && 'KATA', value.kumite && 'KUMITE', value.paraKarate && 'PARA-KARATE'].filter(Boolean) as string[];
    const request = {
      firstName: value.firstName!, lastName: value.lastName!, weight: Number(value.weight),
      height: value.height ? Number(value.height) : null, birthDate: this.toApiDate(value.birthDate!), gender: value.gender!, rol: value.rol!,
      level: value.rol === 'C' ? '' : value.level ?? '', modalities: value.rol === 'C' ? [] : modalities,
      countryId: this.documentConfiguration.countryId, documentTypeId: this.documentConfiguration.documentTypeId,
      documentNumber: normalizeStudentDocument(value.documentNumber!, this.documentConfiguration.countryCode),
    };
    return this.data.mode === 'edit'
      ? this.data.systemAdmin ? this.service.updateStudent(this.data.student!.id, request, true) : this.service.updateStudent(this.data.student!.id, request)
      : this.service.createStudent({ ...request, documentName: '', documentMimeType: '', documentSize: null, documentFile: '' }, this.data.academyId, this.data.systemAdmin);
  }

  private validRut(value: string): boolean {
    const clean = value.replace(/[^0-9kK]/g, '').toUpperCase();
    if (clean.length < 2) return false;
    const body = clean.slice(0, -1); let sum = 0; let multiplier = 2;
    for (let index = body.length - 1; index >= 0; index--) { sum += Number(body[index]) * multiplier; multiplier = multiplier === 7 ? 2 : multiplier + 1; }
    const result = 11 - (sum % 11); const dv = result === 11 ? '0' : result === 10 ? 'K' : String(result);
    return clean.slice(-1) === dv;
  }

  private normalizedRole(role?: string): string { return role === 'Sportman' || role === 'D' ? 'D' : role ? 'C' : ''; }
  private normalizedGender(gender?: string): string { return gender === 'Female' || gender === 'F' ? 'F' : gender ? 'M' : ''; }
  private birthDateLimit(): Date {
    const today = new Date();
    const year = today.getFullYear() - 3;
    const month = today.getMonth();
    const day = Math.min(today.getDate(), new Date(year, month + 1, 0).getDate());
    return new Date(year, month, day);
  }

  private toCalendarDate(value?: string): Date | null {
    if (!value) return null;
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private toApiDate(value: Date): string {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
}
