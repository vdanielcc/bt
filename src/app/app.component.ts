import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from './core/i18n/language.service';
import { SessionExpirationService } from './core/auth/session-expiration.service';
import { AnalyticsService } from './core/analytics/analytics.service';

@Component({
  selector: 'vex-root',
  templateUrl: './app.component.html',
  standalone: true,
  imports: [RouterOutlet]
})
export class AppComponent implements OnInit {
  constructor(
    private readonly languageService: LanguageService,
    private readonly sessionExpiration: SessionExpirationService,
    private readonly analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.languageService.initialize();
    this.sessionExpiration.start();
    this.analytics.start();
  }
}
