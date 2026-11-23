import {
  Component,
  DestroyRef,
  HostBinding,
  inject,
  OnInit
} from '@angular/core';
import { VexLayoutService } from '@vex/services/vex-layout.service';
import { VexConfigService } from '@vex/config/vex-config.service';
import { filter, map, startWith } from 'rxjs/operators';
import { NavigationService } from '../../../core/navigation/navigation.service';
import { Observable } from 'rxjs';
import { NavigationComponent } from '../navigation/navigation.component';
import { ToolbarUserComponent } from './toolbar-user/toolbar-user.component';
import { ToolbarNotificationsComponent } from './toolbar-notifications/toolbar-notifications.component';
import { NavigationItemComponent } from '../navigation/navigation-item/navigation-item.component';
import { MatMenuModule } from '@angular/material/menu';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NavigationItem } from '../../../core/navigation/navigation-item.interface';
import { checkRouterChildsData } from '@vex/utils/check-router-childs-data';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppLanguage, LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'vex-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    NgIf,
    RouterLink,
    MatMenuModule,
    NgFor,
    NavigationItemComponent,
    ToolbarNotificationsComponent,
    ToolbarUserComponent,
    NavigationComponent,
    AsyncPipe,
    TranslatePipe
  ]
})
export class ToolbarComponent implements OnInit {
  readonly auth = inject(AuthService);
  returning = false;
  returnError = '';

  returnToAdministrator(): void {
    if (this.returning) return;
    this.returning = true;
    this.returnError = '';
    this.auth.returnToAdministrator().subscribe({
      next: () => window.location.assign(new URL('.', document.baseURI).href),
      error: () => {
        this.returning = false;
        this.returnError = 'No fue posible recuperar la sesión del administrador. Inicia sesión nuevamente.';
        void this.router.navigateByUrl('/login');
      }
    });
  }
  private readonly languageService = inject(LanguageService);
  readonly languages = this.languageService.languages;
  activeLanguage = this.languageService.current;

  @HostBinding('class.shadow-b')
  showShadow: boolean = false;

  navigationItems$: Observable<NavigationItem[]> =
    this.navigationService.items$;

  isHorizontalLayout$: Observable<boolean> = this.configService.config$.pipe(
    map((config) => config.layout === 'horizontal')
  );
  isVerticalLayout$: Observable<boolean> = this.configService.config$.pipe(
    map((config) => config.layout === 'vertical')
  );
  isNavbarInToolbar$: Observable<boolean> = this.configService.config$.pipe(
    map((config) => config.navbar.position === 'in-toolbar')
  );
  isNavbarBelowToolbar$: Observable<boolean> = this.configService.config$.pipe(
    map((config) => config.navbar.position === 'below-toolbar')
  );
  userVisible$: Observable<boolean> = this.configService.config$.pipe(
    map((config) => config.toolbar.user.visible)
  );
  title$: Observable<string> = this.configService.select(
    (config) => config.sidenav.title
  );

  isDesktop$: Observable<boolean> = this.layoutService.isDesktop$;
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  constructor(
    private readonly layoutService: VexLayoutService,
    private readonly configService: VexConfigService,
    private readonly navigationService: NavigationService,
    private readonly router: Router
  ) {}

  ngOnInit() {
    this.languageService.language$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((language) => this.activeLanguage = language);
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith(null),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.showShadow = checkRouterChildsData(
          this.router.routerState.root.snapshot,
          (data) => data.toolbarShadowEnabled ?? false
        );
      });
  }

  selectLanguage(language: AppLanguage): void {
    this.languageService.use(language);
  }

  openQuickpanel(): void {
    this.layoutService.openQuickpanel();
  }

  openSidenav(): void {
    this.layoutService.openSidenav();
  }

  openSearch(): void {
    this.layoutService.openSearch();
  }
}
