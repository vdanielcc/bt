import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { finalize, Subscription } from 'rxjs';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { AuthService } from '../../../../core/auth/auth.service';

export function passwordsMatch(control: AbstractControl) {
  return control.get('newPassword')?.value === control.get('confirmPassword')?.value
    ? null : { passwordMismatch: true };
}

@Component({
  selector: 'bte-reset-password',
  standalone: true,
  templateUrl: './reset-password.component.html',
  styleUrls: ['../forgot-password/forgot-password.component.scss'],
  animations: [fadeInUp400ms],
  imports: [NgIf, ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule]
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  token = '';
  submitting = false;
  completed = false;
  showPassword = false;
  errorMessage = '';
  private readonly subscriptions = new Subscription();
  private redirectTimer?: ReturnType<typeof setTimeout>;
  readonly form = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d])\S{8,}$/)]],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordsMatch });

  constructor(private readonly fb: FormBuilder, private readonly route: ActivatedRoute,
    private readonly router: Router, private readonly auth: AuthService) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';
  }

  send(): void {
    if (!this.token || this.submitting || this.completed) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.errorMessage = '';
    this.submitting = true;
    const newPassword = this.form.getRawValue().newPassword;
    this.subscriptions.add(this.auth.resetPassword({ token: this.token, newPassword })
      .pipe(finalize(() => { this.submitting = false; }))
      .subscribe({
        next: () => {
          this.completed = true;
          this.form.reset();
          this.token = '';
          this.auth.clearSession();
          void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
          this.redirectTimer = setTimeout(() => {
            void this.router.navigate(['/login'], { replaceUrl: true });
          }, 2500);
        },
        error: (error: Error) => {
          this.errorMessage = error.message || 'No fue posible actualizar la contraseña. Inténtalo nuevamente.';
        }
      }));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.redirectTimer) clearTimeout(this.redirectTimer);
  }
}
