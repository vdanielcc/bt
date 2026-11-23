import { event60SelectionError } from './event-60-enrollment-policy';
import { eventMapUrl } from '../../../core/security/safe-map-url';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { finalize } from 'rxjs';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { AuthService } from '../../../core/auth/auth.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { LanguageService } from '../../../core/i18n/language.service';
import { EventInvitation } from './event-invitation.model';
import { EventInvitationsService } from './event-invitations.service';
import { EventEnrollmentDialogComponent } from './event-enrollment-dialog.component';
import { enrollmentErrorMessage } from './enrollment-error-message';
import { KudoRepechageFixtureComponent } from '../my-events/kudo-repechage-fixture.component';
import { ScoreOnlyFixtureComponent } from '../my-events/score-only-fixture.component';
import { KataJkaFixtureComponent } from '../my-events/kata-jka-fixture.component';

@Component({
  selector: 'bte-event-detail',
  standalone: true,
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KudoRepechageFixtureComponent, ScoreOnlyFixtureComponent, KataJkaFixtureComponent, CommonModule, RouterLink, MatButtonModule, MatCardModule, MatCheckboxModule,
    MatExpansionModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatTabsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatPaginatorModule, MatSelectModule, VexBreadcrumbsComponent, VexPageLayoutComponent,
    VexPageLayoutContentDirective, VexPageLayoutHeaderDirective, TranslatePipe]
})
// Coordinates the event tabs and opens the enrollment workflow.
export class EventDetailComponent implements OnInit, OnDestroy {
  private registrationTimer?: ReturnType<typeof setTimeout>;
  eventId = 0;
  event?: EventInvitation;
  students: any[] = [];
  categories: any[] = [];
  eligibleCategories: any[] = [];
  selectedStudent?: any;
  selectedCategoryIds = new Set<number>();
  description?: string;
  mapUrl?: SafeResourceUrl;
  loading = true;
  loadError = false;
  loadingCategories = false;
  loadingEventCategories = false;
  categoriesError = false;
  enrolling = false;
  studentSearch = '';
  studentPageIndex = 0;
  studentPageSize = 10;
  fixtureCategories: any[] = [];
  selectedFixtureCategoryId = 0;
  latestFixture: any;
  loadingFixtureCategories = false;
  loadingFixture = false;
  fixtureCategoriesError = false;

  constructor(private route: ActivatedRoute, private service: EventInvitationsService,
    private auth: AuthService, private sanitizer: DomSanitizer,
    private snackBar: MatSnackBar, private cdr: ChangeDetectorRef,
    private language: LanguageService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.eventId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(this.eventId) || this.eventId <= 0) {
      this.loadError = true; this.loading = false; return;
    }
    this.service.getEvent(this.eventId).pipe(finalize(() => {
      this.loading = false; this.cdr.markForCheck();
    })).subscribe({
      next: (event) => {
        this.event = event;
        this.scheduleRegistrationClose();
        this.description = event.descriptions || '';
        const map = eventMapUrl(event);
        this.mapUrl = map ? this.sanitizer.bypassSecurityTrustResourceUrl(map) : undefined;
        this.loadStudents();
        this.loadCategories();
        this.loadFixtureCategories();
      },
      error: () => { this.loadError = true; }
    });
  }

  get registrationClosed(): boolean {
    const checkin = new Date(this.event?.registrationClosesAtUtc || this.event?.eventDateCheckin || '');
    return !Number.isNaN(checkin.getTime()) && Date.now() >= checkin.getTime();
  }

  ngOnDestroy(): void { clearTimeout(this.registrationTimer); }

  private scheduleRegistrationClose(): void {
    clearTimeout(this.registrationTimer);
    const deadline = new Date(this.event?.registrationClosesAtUtc || this.event?.eventDateCheckin || '').getTime();
    if (!Number.isFinite(deadline) || deadline <= Date.now()) return;
    this.registrationTimer = setTimeout(() => {
      this.cdr.markForCheck();
      this.scheduleRegistrationClose();
    }, Math.min(deadline - Date.now(), 2147483647));
  }

  loadStudents(): void {
    const academyId = this.auth.getCurrentUser()?.academieId;
    if (!academyId) return;
    this.service.getAcademyStudents(academyId).subscribe({
      next: (students) => { this.students = students; this.cdr.markForCheck(); },
      error: () => { this.students = []; this.cdr.markForCheck(); }
    });
  }

  loadCategories(): void {
    this.loadingEventCategories = true;
    this.categoriesError = false;
    this.service.getCategoriesWithCompetitors(this.eventId)
      .pipe(finalize(() => {
        this.loadingEventCategories = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (categories) => { this.categories = categories; },
        error: () => { this.categories = []; this.categoriesError = true; }
      });
  }

  loadFixtureCategories(): void {
    this.loadingFixtureCategories = true;
    this.fixtureCategoriesError = false;
    this.service.getEventCategories(this.eventId).pipe(finalize(() => {
      this.loadingFixtureCategories = false; this.cdr.markForCheck();
    })).subscribe({
      next: (categories) => { this.fixtureCategories = categories; },
      error: () => { this.fixtureCategories = []; this.fixtureCategoriesError = true; }
    });
  }

  selectFixtureCategory(): void {
    this.latestFixture = undefined;
    const category = this.selectedFixtureCategory;
    if (!category || this.fixtureVersion(category) <= 0) { this.cdr.markForCheck(); return; }
    this.loadingFixture = true;
    this.service.getLatestFixture(this.eventId, this.selectedFixtureCategoryId)
      .pipe(finalize(() => { this.loadingFixture = false; this.cdr.markForCheck(); }))
      .subscribe({ next: (fixture) => { this.latestFixture = fixture; }, error: () => { this.latestFixture = undefined; } });
  }

  selectStudent(student: any): void {
    this.selectedStudent = student;
    this.selectedCategoryIds.clear();
    this.loadingCategories = true;
    const id = Number(student.id ?? student.Id);
    const role = this.isTeam(student) ? 'Team' : student.role ?? student.rol ?? student.Rol ?? 'deportista';
    this.service.getEligibleCategories(this.eventId, id, role).pipe(finalize(() => {
      this.loadingCategories = false; this.cdr.markForCheck();
    })).subscribe({
      next: (categories) => { this.eligibleCategories = categories; },
      error: () => { this.eligibleCategories = []; }
    });
  }

  toggleCategory(category: any, checked: boolean): void {
    const id = Number(category.id ?? category.Id);
    if (checked) {
      const candidate = new Set(this.selectedCategoryIds).add(id);
      const error = event60SelectionError(this.eventId, this.isTeam(this.selectedStudent ?? {}), candidate, this.eligibleCategories);
      if (error) { this.snackBar.open(error, undefined, { duration: 3500 }); return; }
    }
    checked ? this.selectedCategoryIds.add(id) : this.selectedCategoryIds.delete(id);
  }

  enroll(): void {
    if (this.registrationClosed) return;
    if (!this.selectedStudent || !this.selectedCategoryIds.size) {
      this.snackBar.open(this.language.translate('Seleccione al menos una categoría'), undefined, { duration: 3500 }); return;
    }
    const selectionError = event60SelectionError(this.eventId, this.isTeam(this.selectedStudent), this.selectedCategoryIds, this.eligibleCategories);
    if (selectionError) { this.snackBar.open(selectionError, undefined, { duration: 3500 }); return; }
    const max = this.event?.maxCategoriesPerRegistration || 0;
    if (max && this.selectedCategoryIds.size > max) {
      this.snackBar.open(`${this.language.translate('Máximo')} ${max} ${this.language.translate('categorías')}`, undefined, { duration: 3500 }); return;
    }
    this.enrolling = true;
    const id = Number(this.selectedStudent.id ?? this.selectedStudent.Id);
    const request = this.isTeam(this.selectedStudent)
      ? this.service.enrollTeam(this.eventId, id, [...this.selectedCategoryIds])
      : this.service.enroll(this.eventId, id, [...this.selectedCategoryIds]);
    request
      .pipe(finalize(() => { this.enrolling = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: () => { this.snackBar.open(this.language.translate('Inscripción realizada correctamente'), undefined, { duration: 3500 }); this.loadCategories(); },
        error: error => this.snackBar.open(enrollmentErrorMessage(error), undefined, { duration: 6000 })
      });
  }

  fullName(item: any): string {
    return item.fullName ?? item.FullName ?? `${item.firstName ?? item.FirstName ?? ''} ${item.lastName ?? item.LastName ?? ''}`.trim();
  }

  firstName(item: any): string { return item.firstName ?? item.FirstName ?? item.nombres ?? item.Nombres ?? ''; }
  lastName(item: any): string { return item.lastName ?? item.LastName ?? item.apellidos ?? item.Apellidos ?? ''; }
  role(item: any): string {
    const role = item.role ?? item.rol ?? item.Rol ?? '';
    return this.isTeam(item) ? this.language.translate('Equipo') : role === 'Sportman' ? this.language.translate('Deportista') : role === 'Coach' ? this.language.translate('Coach') : role;
  }
  birthDate(item: any): string { return this.isTeam(item) ? '' : item.birthDate ?? item.BirthDate ?? item.fechaNacimiento ?? item.FechaNacimiento ?? ''; }
  isTeam(item: any): boolean { return ['team', 'equipo'].includes(String(item.role ?? item.rol ?? item.Rol ?? '').toLowerCase()); }

  get filteredStudents(): any[] {
    const term = this.studentSearch.trim().toLocaleLowerCase();
    return this.students.filter((student) =>
      (!term || `${this.firstName(student)} ${this.lastName(student)} ${this.role(student)}`.toLocaleLowerCase().includes(term)));
  }

  get pagedStudents(): any[] {
    const start = this.studentPageIndex * this.studentPageSize;
    return this.filteredStudents.slice(start, start + this.studentPageSize);
  }

  applyStudentFilter(value: string): void { this.studentSearch = value; this.studentPageIndex = 0; }
  changeStudentPage(event: PageEvent): void { this.studentPageIndex = event.pageIndex; this.studentPageSize = event.pageSize; }

  openEnrollment(student: any): void {
    if (!this.event || (this.registrationClosed && !this.event.canOverrideRegistrationClose)) return;
    const dialogRef = this.dialog.open(EventEnrollmentDialogComponent, {
      width: '760px', maxWidth: '95vw', maxHeight: '90vh',
      data: { event: this.event, student }
    });
    dialogRef.afterClosed().subscribe((saved) => { if (saved) this.loadCategories(); });
  }

  categoryName(item: any): string {
    return `${item.code ?? item.Code ?? item.categoryCode ?? item.CategoryCode ?? ''} ${item.name ?? item.Name ?? item.categoryName ?? item.CategoryName ?? ''}`.trim();
  }
  competitors(item: any): any[] { return item.competitors ?? item.Competitors ?? []; }
  categoryId(item: any): number { return Number(item.id ?? item.Id ?? item.categoryId ?? item.CategoryId); }
  fixtureVersion(item: any): number { return Number(item.fixtureVersion ?? item.FixtureVersion ?? item.latestFixtureVersion ?? item.LatestFixtureVersion ?? item.version ?? item.Version ?? 0); }
  categoryCompetitorCount(item: any): number { return Number(item.competitorCount ?? item.CompetitorCount ?? item.totalCompetitors ?? item.TotalCompetitors ?? item.competitorsCount ?? item.CompetitorsCount ?? 0); }
  get selectedFixtureCategory(): any { return this.fixtureCategories.find((item) => this.categoryId(item) === this.selectedFixtureCategoryId); }
  get fixtureLightCorner(): boolean {
    if (['KATAJKA', 'ELIMINACIONKUDO', 'KUDOREPECHAGE'].includes(this.savedFixtureType)) return true;
    const category = this.selectedFixtureCategory;
    const modalityId = Number(category?.modalityId ?? category?.ModalityId ?? category?.modality?.id ?? 0);
    const modality = category?.modality?.name ?? category?.Modality?.Name ??
      ({ 2: 'Kumite', 4: 'Kumite equipos femenino', 5: 'Kumite equipos masculino' } as Record<number, string>)[modalityId] ?? '';
    return (this.event?.associationType?.trim().toUpperCase() === 'JKA' && /kumite/i.test(modality)) ||
      ['tradicional', 'jka', 'shotokan', 'shobu ippon'].some(value => String(this.event?.eventType ?? '').toLowerCase().includes(value));
  }
  get fixtureTopLabel(): string { return ['ELIMINACIONKUDO', 'KUDOREPECHAGE'].includes(this.savedFixtureType) ? 'AO' : 'AKA'; }
  get fixtureTopColor(): string { return ['ELIMINACIONKUDO', 'KUDOREPECHAGE'].includes(this.savedFixtureType) ? '#0957d9' : '#dc2626'; }
  get fixtureBottomLabel(): string { return this.fixtureLightCorner ? 'SHIRO' : 'AO'; }
  get fixtureColorCaption(): string {
    if (['ELIMINACIONKUDO', 'KUDOREPECHAGE'].includes(this.savedFixtureType)) return 'Sistema Kudo: AO (azul) / SHIRO (blanco)';
    return this.fixtureLightCorner
      ? this.event?.associationType?.trim().toUpperCase() === 'JKA' ? 'Sistema JKA: AKA (rojo) / SHIRO (blanco)' : 'Sistema tradicional: AKA / SHIRO'
      : 'Sistema WKF: AKA / AO';
  }
  get savedFixtureType(): string { return this.latestFixture?.fixtureType ?? this.latestFixture?.FixtureType ?? 'ELIMINACION'; }
  get fixtureIsElimination(): boolean { return ['ELIMINACION', 'ELIMINACIONKUDO'].includes(this.savedFixtureType); }
  get fixtureWinner(): any {
    const rounds = this.fixtureRounds;
    const matches = this.roundMatches(rounds[rounds.length - 1] ?? {});
    if (!this.fixtureIsElimination || matches.length !== 1) return undefined;
    const winnerId = Number(matches[0].winnerCompetitorId ?? matches[0].WinnerCompetitorId);
    if (!winnerId) return undefined;
    return rounds.flatMap(round => this.roundMatches(round).flatMap(match => [this.fixtureSide(match, true), this.fixtureSide(match, false)]))
      .find(side => Number(side?.competitorId ?? side?.CompetitorId ?? side?.id ?? side?.Id) === winnerId);
  }
  roundRestingNames(round: any): string {
    if (this.savedFixtureType !== 'ROUNDROBIN') return '';
    const entrants = new Map<number, string>();
    const id = (side: any) => Number(side?.competitorId ?? side?.CompetitorId ?? side?.id ?? side?.Id);
    for (const sourceRound of this.fixtureRounds) for (const match of this.roundMatches(sourceRound)) for (const top of [true, false]) {
      const side = this.fixtureSide(match, top);
      if (id(side)) entrants.set(id(side), this.fixtureCompetitorName(side));
    }
    for (const match of this.roundMatches(round)) for (const top of [true, false]) entrants.delete(id(this.fixtureSide(match, top)));
    return [...entrants.values()].join(', ');
  }
  get fixtureRounds(): any[] {
    const rounds = this.latestFixture?.rounds ?? this.latestFixture?.Rounds ?? [];
    if (Array.isArray(rounds) && rounds.length) return rounds;
    const matches = this.latestFixture?.matches ?? this.latestFixture?.Matches ?? this.latestFixture?.llaves ?? this.latestFixture?.Llaves ?? [];
    if (!Array.isArray(matches)) return [];
    const grouped = new Map<number, any[]>();
    matches.forEach((match: any) => { const round = Number(match.round ?? match.Round ?? 1); grouped.set(round, [...(grouped.get(round) ?? []), match]); });
    return [...grouped.entries()].sort(([a], [b]) => a - b).map(([number, roundMatches]) => ({ number, name: `Ronda ${number}`, matches: roundMatches }));
  }
  roundName(round: any, index: number): string { return round.name ?? round.Name ?? `Ronda ${index + 1}`; }
  roundMatches(round: any): any[] { return round.matches ?? round.Matches ?? []; }
  fixtureSide(match: any, top: boolean): any { return top ? match.top ?? match.Top ?? match.competitor1 ?? match.Competitor1 ?? match.aka ?? match.Aka : match.bottom ?? match.Bottom ?? match.competitor2 ?? match.Competitor2 ?? match.ao ?? match.Ao; }
  fixtureCompetitorName(item: any): string {
    if (!item) return ''; if (typeof item === 'string') return item;
    const student = item.student ?? item.Student ?? item.competitor?.student ?? item.Competitor?.Student ?? item;
    return student.fullName ?? student.FullName ?? student.name ?? student.Name ?? student.nombreCompleto ?? student.NombreCompleto ?? '';
  }
  fixtureAcademy(item: any): string { return item?.academyName ?? item?.AcademyName ?? item?.academy?.name ?? item?.Academy?.Name ?? item?.competitor?.academy?.name ?? ''; }
  fixtureSideIsEmpty(match: any, top: boolean): boolean { return !this.fixtureCompetitorName(this.fixtureSide(match, top)); }
  fixtureSideIsPast(match: any, top: boolean, roundIndex: number): boolean {
    const explicitlyPast = Boolean(
      (top ? match.top ?? match.Top : match.bottom ?? match.Bottom)?.past ??
      (top ? match.top ?? match.Top : match.bottom ?? match.Bottom)?.Past
    );
    const vacantPastSide = this.fixtureSideIsEmpty(match, top) &&
      (roundIndex === 0 || Boolean(match.winnerCompetitorId ?? match.WinnerCompetitorId));
    return explicitlyPast || vacantPastSide;
  }
}
