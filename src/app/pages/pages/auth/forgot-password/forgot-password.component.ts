import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { MatButtonModule } from '@angular/material/button';
import { NgFor, NgIf } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../../core/auth/auth.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { AppLanguage, LanguageService } from '../../../../core/i18n/language.service';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'vex-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
  animations: [fadeInUp400ms],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatInputModule,
    NgIf,
    NgFor,
    MatButtonModule,
    MatSnackBarModule,
    TranslatePipe
  ]
})
export class ForgotPasswordComponent implements OnInit {
  readonly languages = this.languageService.languages;
  activeLanguage = this.languageService.current;
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private snackbar: MatSnackBar,
    private authService: AuthService,
    private languageService: LanguageService
  ) {}

  ngOnInit() {}

  selectLanguage(language: AppLanguage): void {
    this.activeLanguage = language;
    this.languageService.use(language);
  }

  send() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email } = this.form.getRawValue();
    const emailValue = typeof email === 'string' ? email : '';

    this.authService.forgotPassword({ email: emailValue }).subscribe({
      next: () => {
        this.snackbar.open(this.languageService.translate('auth.recovery.success'), this.languageService.translate('common.close'), {
          duration: 4000
        });
        this.router.navigate(['/login']);
      },
      error: (error: Error) => {
        this.snackbar.open(error.message || this.languageService.translate('auth.recovery.error'), this.languageService.translate('common.close'), {
          duration: 4000
        });
      }
    });
  }
}
