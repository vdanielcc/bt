import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { normalizeStudentDocument } from '../../../championships/students/student-document';
import {
  AbstractControl,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { NgFor, NgIf } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../../core/auth/auth.service';
import { Country } from '../../../../core/auth/auth.models';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';

interface DocumentConfig {
  type: string;
  label: string;
  placeholder: string;
  maxLength: number;
  inputMode: 'text' | 'numeric';
  errorMessage: string;
  validator: ValidatorFn;
  formatter: (value: string) => string;
}

@Component({
  selector: 'vex-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  animations: [fadeInUp400ms],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatTooltipModule,
    NgFor,
    NgIf,
    MatIconModule,
    MatCheckboxModule,
    RouterLink
    ,TranslatePipe
  ]
})
export class RegisterComponent implements OnInit {
  form: UntypedFormGroup = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(3)]],
    documentType: ['RUN', Validators.required],
    documentNumber: ['', [Validators.required, Validators.minLength(6)]],
    countryId: [null, Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    passwordConfirm: ['', Validators.required]
  });

  inputType = 'password';
  visible = false;
  countries: Country[] = [];
  submitting = false;
  documentConfig: DocumentConfig = this.getDocumentConfig('');

  constructor(
    private router: Router,
    private fb: UntypedFormBuilder,
    private cd: ChangeDetectorRef,
    private snackbar: MatSnackBar,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.getCountries().subscribe({
      next: (countries) => {
        this.countries = countries;
        this.cd.markForCheck();
      },
      error: (error: Error) => {
        this.snackbar.open(error.message || 'No fue posible cargar los países.', 'Cerrar', {
          duration: 4000
        });
      }
    });
  }

  onCountryChange(countryId: number): void {
    const country = this.countries.find((item) => item.id === Number(countryId));
    this.documentConfig = this.getDocumentConfig(country?.code ?? '');
    this.form.controls['documentType'].setValue(this.documentConfig.type);
    this.form.controls['documentNumber'].reset('');
    this.form.controls['documentNumber'].setValidators([
      Validators.required,
      this.documentConfig.validator
    ]);
    this.form.controls['documentNumber'].updateValueAndValidity();
  }

  formatDocument(): void {
    const control = this.form.controls['documentNumber'];
    const formatted = this.documentConfig.formatter(String(control.value ?? ''));
    control.setValue(formatted, { emitEvent: false });
    control.updateValueAndValidity({ emitEvent: false });
  }

  private getDocumentConfig(countryCode: string): DocumentConfig {
    const generic = (
      type: string,
      label: string,
      maxLength = 20
    ): DocumentConfig => ({
      type,
      label,
      placeholder: 'Ingrese su documento',
      maxLength,
      inputMode: 'text',
      errorMessage: `Ingrese un ${label} válido.`,
      validator: this.patternValidator(/^[A-Za-z0-9.-]{5,20}$/),
      formatter: (value) => value.trim().toUpperCase()
    });

    const configs: Record<string, DocumentConfig> = {
      CL: {
        type: 'RUN', label: 'RUN', placeholder: '12.345.678-5', maxLength: 12,
        inputMode: 'text', errorMessage: 'Ingrese un RUN chileno válido.',
        validator: (control) => this.validateChileanRun(control.value) ? null : { document: true },
        formatter: (value) => this.formatChileanRun(value)
      },
      PE: this.numericDocument('DNI', 'DNI', 8, 8),
      AR: this.numericDocument('DNI', 'DNI', 7, 8),
      BR: {
        type: 'CPF', label: 'CPF', placeholder: '123.456.789-09', maxLength: 14,
        inputMode: 'numeric', errorMessage: 'Ingrese un CPF brasileño válido.',
        validator: (control) => this.validateBrazilianCpf(control.value) ? null : { document: true },
        formatter: (value) => this.formatBrazilianCpf(value)
      },
      VE: {
        ...generic('CI', 'Cédula de identidad', 9),
        placeholder: 'V12345678',
        errorMessage: 'La cédula debe comenzar con V o E y contener entre 6 y 8 números.',
        validator: this.patternValidator(/^[VE]\d{6,8}$/),
        formatter: (value) => value.replace(/[^0-9VE]/gi, '').toUpperCase().slice(0, 9)
      },
      BO: generic('CI', 'Cédula de identidad'),
      CO: generic('CC', 'Cédula de ciudadanía'),
      EC: generic('CI', 'Cédula de identidad'),
      GY: generic('ID', 'Documento de identidad'),
      PY: generic('CI', 'Cédula de identidad'),
      SR: generic('ID', 'Documento de identidad'),
      UY: generic('CI', 'Cédula de identidad')
    };

    return configs[countryCode] ?? generic('DOCUMENT', 'Documento de identidad');
  }

  private numericDocument(type: string, label: string, min: number, max: number): DocumentConfig {
    return {
      type, label, placeholder: '0'.repeat(max), maxLength: max, inputMode: 'numeric',
      errorMessage: `El ${label} debe contener entre ${min} y ${max} números.`,
      validator: this.patternValidator(new RegExp(`^\\d{${min},${max}}$`)),
      formatter: (value) => value.replace(/\D/g, '').slice(0, max)
    };
  }

  private patternValidator(pattern: RegExp): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null =>
      pattern.test(String(control.value ?? '')) ? null : { document: true };
  }

  private formatChileanRun(value: string): string {
    const clean = value.replace(/[^0-9kK]/g, '').toUpperCase().slice(0, 9);
    if (clean.length < 2) return clean;
    const body = clean.slice(0, -1);
    return `${body}-${clean.slice(-1)}`;
  }

  private validateChileanRun(value: string): boolean {
    const clean = String(value ?? '').replace(/\./g, '').replace('-', '').toUpperCase();
    if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;
    const body = clean.slice(0, -1);
    let sum = 0;
    let multiplier = 2;
    for (let index = body.length - 1; index >= 0; index--) {
      sum += Number(body[index]) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    const result = 11 - (sum % 11);
    const verifier = result === 11 ? '0' : result === 10 ? 'K' : String(result);
    return verifier === clean.slice(-1);
  }

  private formatBrazilianCpf(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits.replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2');
  }

  private validateBrazilianCpf(value: string): boolean {
    const digits = String(value ?? '').replace(/\D/g, '');
    if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
    const calculate = (length: number) => {
      let sum = 0;
      for (let index = 0; index < length; index++) sum += Number(digits[index]) * (length + 1 - index);
      const remainder = (sum * 10) % 11;
      return remainder === 10 ? 0 : remainder;
    };
    return calculate(9) === Number(digits[9]) && calculate(10) === Number(digits[10]);
  }

  send() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackbar.open('Completa todos los campos correctamente.', 'Cerrar', {
        duration: 4000
      });
      return;
    }

    const { firstName, countryId, documentType, documentNumber, email, password, passwordConfirm } = this.form.getRawValue();
    const country = this.countries.find((item) => item.id === Number(countryId));

    if (!country) {
      this.snackbar.open('Selecciona un país válido.', 'Cerrar', { duration: 4000 });
      return;
    }

    if (password !== passwordConfirm) {
      this.snackbar.open('Las contraseñas no coinciden.', 'Cerrar', {
        duration: 4000
      });
      return;
    }

    this.submitting = true;
    this.authService
      .register({
        firstName: String(firstName).trim(),
        countryId: country.id,
        countryName: country.name,
        countryCode: country.code,
        documentType: String(documentType).trim().toUpperCase(),
        documentTypeId: 0,
        documentNumber: normalizeStudentDocument(String(documentNumber), country.code),
        email: String(email).trim(),
        password
      })
      .subscribe({
        next: () => {
          this.snackbar.open('Registro exitoso. Ya puedes iniciar sesión.', 'Cerrar', {
            duration: 3000
          });
          setTimeout(() => this.router.navigateByUrl('/login'), 3000);
        },
        error: (error: Error) => {
          this.submitting = false;
          this.snackbar.open(error.message || 'No fue posible crear la cuenta.', 'Cerrar', {
            duration: 4000
          });
          this.cd.markForCheck();
        }
      });
  }

  toggleVisibility() {
    if (this.visible) {
      this.inputType = 'password';
      this.visible = false;
      this.cd.markForCheck();
    } else {
      this.inputType = 'text';
      this.visible = true;
      this.cd.markForCheck();
    }
  }
}
