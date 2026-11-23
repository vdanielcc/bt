import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { NgFor, NgIf } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AuthService } from '../../../../core/auth/auth.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { AppLanguage, LanguageService } from '../../../../core/i18n/language.service';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatePipe } from '@angular/common';
import { finalize } from 'rxjs';
import { EventInvitation } from '../../../championships/invitations/event-invitation.model';
import { EventInvitationsService } from '../../../championships/invitations/event-invitations.service';

@Component({
  selector: 'vex-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeInUp400ms],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatInputModule,
    NgIf,
    NgFor,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    MatCheckboxModule,
    RouterLink,
    MatSnackBarModule,
    DatePipe
    ,TranslatePipe
  ]
})
export class LoginComponent implements OnInit, OnDestroy {
  readonly languages = this.languageService.languages;
  activeLanguage = this.languageService.current;
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false]
  });

  inputType = 'password';
  visible = false;
  upcomingEvents: EventInvitation[] = [];
  currentEventIndex = 0;
  loadingEvents = true;
  isSubmitting = false;
  eventsLoadError = false;
  private carouselTimer?: ReturnType<typeof setInterval>;

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private cd: ChangeDetectorRef,
    private snackbar: MatSnackBar,
    private authService: AuthService,
    private languageService: LanguageService,
    private eventsService: EventInvitationsService
  ) {}

  ngOnInit(): void {
    this.loadUpcomingEvents();
  }

  ngOnDestroy(): void {
    this.stopCarousel();
  }

  get currentEvent(): EventInvitation | undefined {
    return this.upcomingEvents[this.currentEventIndex];
  }

  loadUpcomingEvents(): void {
    this.loadingEvents = true;
    this.eventsLoadError = false;
    this.eventsService.getUpcomingEvents().pipe(finalize(() => {
      this.loadingEvents = false;
      this.cd.markForCheck();
    })).subscribe({
      next: (events) => {
        this.upcomingEvents = events;
        this.currentEventIndex = 0;
        this.startCarousel();
      },
      error: () => {
        this.upcomingEvents = [];
        this.eventsLoadError = true;
      }
    });
  }

  previousEvent(): void {
    if (!this.upcomingEvents.length) return;
    this.currentEventIndex = (this.currentEventIndex - 1 + this.upcomingEvents.length) % this.upcomingEvents.length;
    this.restartCarousel();
  }

  nextEvent(): void {
    if (!this.upcomingEvents.length) return;
    this.currentEventIndex = (this.currentEventIndex + 1) % this.upcomingEvents.length;
    this.restartCarousel();
  }

  selectEvent(index: number): void {
    this.currentEventIndex = index;
    this.restartCarousel();
  }

  private startCarousel(): void {
    this.stopCarousel();
    if (this.upcomingEvents.length > 1) {
      this.carouselTimer = setInterval(() => {
        this.currentEventIndex = (this.currentEventIndex + 1) % this.upcomingEvents.length;
        this.cd.markForCheck();
      }, 6000);
    }
  }

  private restartCarousel(): void {
    this.startCarousel();
    this.cd.markForCheck();
  }

  private stopCarousel(): void {
    if (this.carouselTimer) clearInterval(this.carouselTimer);
  }

  selectLanguage(language: AppLanguage): void {
    this.activeLanguage = language;
    this.languageService.use(language);
  }

  send() {
    if (this.isSubmitting) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackbar.open(this.languageService.translate('auth.login.invalidCredentials'), this.languageService.translate('common.close'), {
        duration: 4000
      });
      return;
    }

    const { email, password, rememberMe } = this.form.getRawValue();
    const username = typeof email === 'string' ? email : '';
    const passwordValue = typeof password === 'string' ? password : '';

    this.isSubmitting = true;
    this.authService.login({ username, password: passwordValue, rememberMe: rememberMe === true }).pipe(
      finalize(() => {
        this.isSubmitting = false;
        this.cd.markForCheck();
      })
    ).subscribe({
      next: () => {
        this.snackbar.open(this.languageService.translate('auth.login.success'), this.languageService.translate('common.close'), {
          duration: 3000
        });
        this.router.navigate(['/']);
      },
      error: (error: Error) => {
        this.snackbar.open(error.message || this.languageService.translate('auth.login.error'), this.languageService.translate('common.close'), {
          duration: 4000
        });
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
