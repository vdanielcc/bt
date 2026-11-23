import { RegistrationCountsComponent } from '../invitations/registration-counts.component';
import { KudoRepechageFixtureComponent } from '../my-events/kudo-repechage-fixture.component';
import { ScoreOnlyFixtureComponent } from './score-only-fixture.component';
import { PricingSummaryCardComponent } from '../pricing/pricing-summary-card.component';
import { KataJkaFixtureComponent } from './kata-jka-fixture.component';
import { EventPaymentReviewComponent } from './event-payment-review.component';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocomplete, MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { catchError, finalize, forkJoin, from, map, mergeMap, of, Subscription, switchMap } from 'rxjs';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { AuthService } from '../../../core/auth/auth.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { EventInvitation } from '../invitations/event-invitation.model';
import { EventInvitationsService } from '../invitations/event-invitations.service';
import { SaveFixtureMatch, SaveFixtureVersion } from '../invitations/fixture.model';
import { TournamentFixturePdfService } from './tournament-fixture-pdf.service';
import { NProExportService } from './n-pro-export.service';
import { fixtureRosterChanged } from './fixture-roster';
import { CompetitorCategoryDialogComponent } from './competitor-category-dialog.component';
import { AddCategoryCompetitorsDialogComponent } from './add-category-competitors-dialog.component';
import { CompetitorProfileDialogComponent } from './competitor-profile-dialog.component';

type DetailSection = 'academies' | 'categories' | 'competitors' | 'tickets';
interface FixtureSlot { competitorId: number | null; name: string; academy: string; color: string; label: string; past: boolean; }
interface FixtureMatch { stage?: string; topSourceNumber?: number; topSourceResult?: string; bottomSourceNumber?: number; bottomSourceResult?: string; isConditional?: boolean; isActive?: boolean; id?: number; matchNumber: number; position: number; winnerCompetitorId: number | null; nextMatchId: number | null; nextMatchPosition: 'top' | 'bottom' | null; isBye: boolean; top: FixtureSlot; bottom: FixtureSlot; }
interface FixtureRound { number: number; name: string; matches: FixtureMatch[]; }
interface SlotLocation { roundIndex: number; matchIndex: number; position: 'top' | 'bottom'; }

@Component({ selector: 'bte-event-summary', standalone: true,
  templateUrl: './event-summary.component.html', styleUrls: ['./event-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RegistrationCountsComponent, KudoRepechageFixtureComponent, ScoreOnlyFixtureComponent, KataJkaFixtureComponent, EventPaymentReviewComponent, PricingSummaryCardComponent, CommonModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule,
    MatIconModule, MatProgressSpinnerModule, MatSelectModule, MatAutocompleteModule, MatInputModule, MatTooltipModule, VexBreadcrumbsComponent,
    MatSnackBarModule, MatDialogModule, MatMenuModule, DragDropModule, VexPageLayoutComponent, VexPageLayoutContentDirective,
    VexPageLayoutHeaderDirective, TranslatePipe] })
export class EventSummaryComponent implements OnInit, OnDestroy {
  eventId = 0; academyId = 0; event?: EventInvitation; summary: any; categories: any[] = [];
  activeSection: DetailSection = 'academies'; selectedAcademyId = 0;
  selectedCategoryId = 0; selectedCategory: any; categoryCompetitors: any[] = [];
  fixture: any; fixtureRounds: FixtureRound[] = []; loadingCategory = false; generatingFixture = false; savingFixture = false; categoryError = false;
  loading = true; loadError = false;
  changingFixtureType = false;
  get categoryFixtureType(): string { return this.selectedCategory?.fixtureType ?? 'ELIMINACION'; }
  get savedFixtureType(): string { return this.fixture?.fixtureType ?? 'ELIMINACION'; }
  get isElimination(): boolean { return ['ELIMINACION', 'ELIMINACIONKUDO'].includes(this.savedFixtureType); }
  get isKudoRepechage(): boolean { return this.savedFixtureType === 'KUDOREPECHAGE'; }
  get isKataJka(): boolean { return this.savedFixtureType === 'KATAJKA'; }
  get isScoreOnly(): boolean { return this.savedFixtureType === 'SOLOPUNTAJE'; }
  get fixtureWinner(): { name: string; academy: string } | undefined {
    const final = this.fixtureRounds[this.fixtureRounds.length - 1];
    if (!this.isElimination || final?.matches.length !== 1) return undefined;
    const winnerId = final.matches[0].winnerCompetitorId;
    if (!winnerId) return undefined;
    return this.fixtureRounds.flatMap(round => round.matches.flatMap(match => [match.top, match.bottom]))
      .find(slot => slot.competitorId === winnerId);
  }
  get fixtureTypeChanged(): boolean { return !!this.fixture && this.savedFixtureType !== this.categoryFixtureType; }
  changeFixtureType(value: string, select: { value: any }): void {
    const previous = this.categoryFixtureType;
    select.value = previous;
    if (!this.canManageCompetitors || value === previous || this.changingFixtureType) return;
    if (!window.confirm('El formato cambiará para esta categoría en todos los campeonatos que la utilizan. Las versiones guardadas se conservarán; pulsa Refrescar para generar las nuevas llaves. ¿Continuar?')) return;
    const categoryId = this.selectedCategoryId;
    this.changingFixtureType = true;
    this.service.changeFixtureType(this.eventId, categoryId, value, previous)
      .pipe(finalize(() => { this.changingFixtureType = false; this.cdr.markForCheck(); }))
      .subscribe({ next: result => {
        const fixtureType = result.fixtureType;
        this.categories = this.categories.map(c => this.categoryIdOf(c) === categoryId ? { ...c, fixtureType } : c);
        if (categoryId === this.selectedCategoryId) this.selectedCategory = { ...this.selectedCategory, fixtureType };
        this.checkFixtureRosters();
        this.snackBar.open('Formato actualizado. Refresca las llaves para generar una versión con este formato.', undefined, { duration: 6000 });
      }, error: error => this.snackBar.open(this.apiErrorMessage(error, 'No fue posible cambiar el formato.'), undefined, { duration: 6000 }) });
  }
  roundRestingNames(round: FixtureRound): string {
    if (this.savedFixtureType !== 'ROUNDROBIN') return '';
    const all = new Map<number, string>();
    for (const r of this.fixtureRounds) for (const m of r.matches) for (const slot of [m.top, m.bottom])
      if (slot.competitorId) all.set(slot.competitorId, slot.name);
    for (const m of round.matches) for (const slot of [m.top, m.bottom]) if (slot.competitorId) all.delete(slot.competitorId);
    return [...all.values()].join(', ');
  }
  refreshingFixture = false;
  downloadingFixtures = false;
  exportingNPro = false;
  downloadProgress = '';
  private categoryLoadSequence = 0;
  categorySearch: string | null = null;
  readonly displayCategory = (category: any): string => category ? `${this.categoryName(category)} - (${this.categoryCompetitorCount(category)})` : '';
  get categoryInputValue(): string { return this.categorySearch ?? (this.selectedCategoryId ? this.displayCategory(this.findCategory(this.selectedCategoryId)) : ''); }
  get filteredCategories(): any[] {
    const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const terms = normalize(this.categorySearch ?? '').trim().split(/\s+/).filter(Boolean);
    return this.categories.filter(category => terms.every(term => normalize(this.categoryName(category)).includes(term)));
  }
  selectCategory(category: any): void {
    this.categorySearch = null;
    this.selectedCategoryId = this.categoryIdOf(category);
    this.loadCategory();
  }
  restoreSelectedCategoryOption(autocomplete: MatAutocomplete): void {
    // Wait for Material to finish activating its default option on opening.
    setTimeout(() => {
      if (!autocomplete.isOpen || this.categorySearch !== null || !this.selectedCategoryId) return;
      const options = autocomplete.options.toArray();
      const index = options.findIndex(option => option.value && this.categoryIdOf(option.value) === this.selectedCategoryId);
      if (index < 0) return;
      autocomplete._keyManager.setActiveItem(index);
      const panel = autocomplete.panel.nativeElement as HTMLElement;
      const element = panel.querySelector<HTMLElement>(`[id="${options[index].id}"]`);
      if (element) panel.scrollTop = element.offsetTop;
    });
  }
  private fixtureHistory: FixtureRound[][] = [];
  private readonly fixtureChecks = new Subscription();
  private readonly fixtureCheckSequence = new Map<number, number>();
  readonly outdatedFixtures = new Set<number>();
  constructor(private route: ActivatedRoute, private auth: AuthService,
    private service: EventInvitationsService, private cdr: ChangeDetectorRef,
    private snackBar: MatSnackBar, private tournamentPdf: TournamentFixturePdfService,
    private nProExport: NProExportService, private dialog: MatDialog) {}

  get canManageCompetitors(): boolean {
    const user = this.auth.getCurrentUser();
    return user?.rol === 'admin' || (user?.rol === 'academy_admin' && (Number(user.academieId) === Number(this.event?.academyId) || (this.event?.coOrganizerAcademyIds ?? []).includes(Number(user.academieId))));
  }

  addCategoryCompetitors(): void {
    if (!this.canManageCompetitors || !this.selectedCategory || this.loadingCategory || this.generatingFixture || this.savingFixture || this.refreshingFixture) return;
    const categoryId = this.selectedCategoryId;
    const dialog = this.dialog.open(AddCategoryCompetitorsDialogComponent, {
      width: '640px', maxWidth: '95vw',
      data: { eventId: this.eventId, category: { ...this.selectedCategory, id: categoryId } }
    });
    dialog.afterClosed().subscribe(() => {
      if (!dialog.componentInstance.addedCount) return;
      if (this.categoryHasFixtureVersion(this.findCategory(categoryId))) this.outdatedFixtures.add(categoryId);
      this.snackBar.open(`${dialog.componentInstance.addedCount} inscripciones agregadas.`, undefined, { duration: 4000 });
      this.load();
      if (this.selectedCategoryId === categoryId) this.loadCategory();
    });
  }

  viewCompetitorProfile(slot: { competitorId?: number | null }): void {
    if (!this.canManageCompetitors || !slot.competitorId || !this.eventId) return;
    this.dialog.open(CompetitorProfileDialogComponent, {
      width: '640px', maxWidth: '95vw', data: { eventId: this.eventId, competitorId: slot.competitorId }
    });
  }

  editCompetitorCategory(slot: FixtureSlot, action: 'remove' | 'move'): void {
    if (!this.canManageCompetitors || !slot.competitorId || !this.selectedCategory || !Number(this.fixture?.version ?? this.fixture?.Version) || this.loadingCategory || this.savingFixture || this.refreshingFixture) return;
    const categoryId = this.selectedCategoryId;
    const competitorId = slot.competitorId;
    this.dialog.open(CompetitorCategoryDialogComponent, {
      width: '560px', maxWidth: '95vw',
      data: { eventId: this.eventId, competitorId: slot.competitorId, name: slot.name,
        category: { ...this.selectedCategory, id: categoryId }, categories: [...this.categories], action }
    }).afterClosed().subscribe(result => {
      if (!result) return;
      for (const id of [result.sourceId, result.targetId].filter(Boolean)) {
        if (this.categoryHasFixtureVersion(this.findCategory(id))) this.outdatedFixtures.add(id);
      }
      this.snackBar.open(action === 'move' ? 'Competidor movido correctamente.' : 'Inscripción eliminada de esta categoría.', undefined, { duration: 4000 });
      if (this.selectedCategoryId === categoryId) {
        this.categoryCompetitors = this.categoryCompetitors.filter(item => this.competitorIdOf(item) !== competitorId);
        this.pruneFixtureCompetitors(new Set([competitorId]));
        this.selectedCategory = { ...this.selectedCategory, competitorCount: this.categoryCompetitors.length };
      }
      this.load();
      this.cdr.markForCheck();
    });
  }

  private pruneFixtureCompetitors(ids: Set<number>): void {
    if (!ids.size || !this.fixture) return;
    if (this.isElimination || this.isKataJka) {
      for (const round of this.fixtureRounds) for (const match of round.matches) {
        for (const position of ['top', 'bottom'] as const) {
          if (ids.has(match[position].competitorId!)) match[position] = this.slot(undefined, position === 'top', true);
        }
        if (ids.has(match.winnerCompetitorId!)) match.winnerCompetitorId = null;
        match.isBye = !(this.isKataJka && round === this.fixtureRounds[this.fixtureRounds.length - 1]) && (!match.top.competitorId || !match.bottom.competitorId);
      }
    } else {
      // Keep the existing encounters between remaining entrants, without generating fixtures.
      this.fixtureRounds = this.fixtureRounds.map(round => ({ ...round,
        matches: round.matches.filter(match => !ids.has(match.top.competitorId!) && !ids.has(match.bottom.competitorId!))
      })).filter(round => round.matches.length);
      if (this.savedFixtureType === 'ROUNDROBIN') this.rearrangeRemainingRoundRobin();
    }
    this.fixtureHistory = []; // A roster mutation cannot be undone by restoring deleted enrollments.
    this.fixture = { ...this.fixture, generatedLocally: true };
  }

  private rearrangeRemainingRoundRobin(): void {
    const matches = this.fixtureRounds.flatMap(round => round.matches);
    const pair = (a: number, b: number) => `${Math.min(a, b)}:${Math.max(a, b)}`;
    const existing = new Map(matches.map(match => [pair(match.top.competitorId!, match.bottom.competitorId!), match]));
    const entrants: (number | null)[] = [...new Set(matches.flatMap(match => [match.top.competitorId!, match.bottom.competitorId!]))];
    if (entrants.length % 2) entrants.push(null);
    const rounds: FixtureRound[] = [];
    for (let index = 0; index < entrants.length - 1; index++) {
      const encounters: FixtureMatch[] = [];
      for (let i = 0; i < entrants.length / 2; i++) {
        const a = entrants[i], b = entrants[entrants.length - 1 - i];
        const match = a && b ? existing.get(pair(a, b)) : undefined;
        if (match) encounters.push({ ...match, position: encounters.length + 1 });
      }
      if (encounters.length) rounds.push({ number: index + 1, name: `Ronda ${index + 1}`, matches: encounters });
      entrants.splice(1, 0, entrants.pop()!);
    }
    this.fixtureRounds = rounds;
  }
  async exportNPro(all = false): Promise<void> {
    if (this.exportingNPro || this.loadingCategory || this.generatingFixture || this.savingFixture || this.refreshingFixture) return;
    const selected = all ? [...this.categories] : this.selectedCategory ? [{ ...this.selectedCategory, id: this.selectedCategoryId }] : [];
    if (!selected.length) return;
    this.exportingNPro = true;
    try {
      const skipped = await this.nProExport.download(this.eventId, selected, all);
      if (skipped) this.snackBar.open(`Exportación completada. ${skipped} categorías omitidas porque no tienen versiones guardadas.`, undefined, { duration: 6500 });
    } catch (error) {
      this.snackBar.open(error instanceof Error ? error.message : 'No fue posible exportar a N-Pro.', undefined, { duration: 6500 });
    } finally {
      this.exportingNPro = false;
      this.cdr.markForCheck();
    }
  }
  async downloadAllFixtures(): Promise<void> {
    if (!this.event || this.downloadingFixtures || this.savingFixture || this.refreshingFixture || this.generatingFixture) return;
    this.downloadingFixtures = true;
    this.downloadProgress = 'Preparando PDF...';
    try {
      await this.tournamentPdf.download(this.event, (done, total) => {
        this.downloadProgress = `Preparando ${done}/${total}...`;
        this.cdr.markForCheck();
      });
    } catch (error) {
      this.snackBar.open(error instanceof Error ? error.message : 'No fue posible descargar las llaves. Reintenta.', 'Cerrar', { duration: 8000 });
    } finally {
      this.downloadingFixtures = false;
      this.downloadProgress = '';
      this.cdr.markForCheck();
    }
  }
  ngOnInit(): void {
    this.eventId = Number(this.route.snapshot.paramMap.get('id'));
    this.academyId = this.auth.getCurrentUser()?.academieId ?? 0;
    this.load();
  }
  load(): void {
    this.loading = true; this.loadError = false;
    this.service.getEvent(this.eventId).pipe(switchMap(event => {
      const academyId = this.auth.getCurrentUser()?.rol === 'admin'
        ? event.academyId ?? 0 : this.academyId;
      return forkJoin({ event: of(event), summary: this.service.getEventSummary(this.eventId, academyId), categories: this.service.getEventCategories(this.eventId) });
    }))
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({ next: (data) => {
        this.event = data.event; this.summary = data.summary; this.categories = data.categories;
        this.checkFixtureRosters();
      }, error: () => this.loadError = true });
  }
  ngOnDestroy(): void { this.fixtureChecks.unsubscribe(); }

  private checkFixtureRosters(categories = this.categories, savedFixture?: any): void {
    const checks = categories.filter(category => savedFixture || this.categoryHasFixtureVersion(category)).map(category => {
      const id = this.categoryIdOf(category);
      const sequence = (this.fixtureCheckSequence.get(id) ?? 0) + 1;
      this.fixtureCheckSequence.set(id, sequence);
      const version = Number(category.fixtureVersion ?? category.FixtureVersion ?? category.latestFixtureVersion ?? category.LatestFixtureVersion ?? category.version ?? category.Version);
      return { id, sequence, version };
    });
    this.fixtureChecks.add(from(checks).pipe(mergeMap(check => forkJoin({
      fixture: savedFixture ? of(savedFixture) : this.service.getStoredFixtureVersion(this.eventId, check.id, check.version),
      enrollment: this.service.getCategoryWithCompetitors(this.eventId, check.id)
    }).pipe(
      map(({ fixture, enrollment }) => ({ ...check, changed: fixtureRosterChanged(fixture, this.extractCompetitors(enrollment)) || (fixture.fixtureType ?? 'ELIMINACION') !== (this.findCategory(check.id)?.fixtureType ?? this.selectedCategory?.fixtureType ?? 'ELIMINACION') })),
      catchError(() => of({ ...check, changed: null }))
    ), 4)).subscribe(result => {
      if (this.fixtureCheckSequence.get(result.id) !== result.sequence || result.changed === null) return;
      if (result.changed) this.outdatedFixtures.add(result.id);
      else this.outdatedFixtures.delete(result.id);
      this.cdr.markForCheck();
    }));
  }
  get academies(): any[] { const value = this.summary?.academias ?? this.summary?.Academias ?? []; return Array.isArray(value) ? value : Object.values(value); }
  get filteredAcademies(): any[] { return this.selectedAcademyId ? this.academies.filter((a) => Number(a.academiaId ?? a.AcademiaId) === this.selectedAcademyId) : this.academies; }
  get competitors(): any[] { return this.filteredAcademies.flatMap((a) => a.competidores ?? a.Competidores ?? []); }
  get totalTicketsFiltered(): number { return this.competitors.reduce((sum, item) => sum + Number(item.valorTicket ?? item.ValorTicket ?? 0), 0); }
  academyIdOf(item: any): number { return Number(item.academiaId ?? item.AcademiaId); }
  academyName(item: any): string { return item.academiaNombre ?? item.AcademiaNombre ?? item.name ?? ''; }
  categoryName(item: any): string { return `${item.code ?? item.Code ?? ''} - ${item.name ?? item.Name ?? ''}`; }
  categoryCompetitorCount(item: any): number {
    return Number(item.competitorCount ?? item.CompetitorCount ?? item.totalCompetitors ?? item.TotalCompetitors ?? 0);
  }
  categoryHasFixtureVersion(item: any): boolean {
    return Number(
      item.fixtureVersion ?? item.FixtureVersion ??
      item.latestFixtureVersion ?? item.LatestFixtureVersion ??
      item.version ?? item.Version ?? 0
    ) > 0;
  }
  categoryIdOf(item: any): number { return Number(item.id ?? item.Id ?? item.categoryId ?? item.CategoryId); }
  show(section: DetailSection): void {
    this.activeSection = section;
    if (section === 'categories' && !this.selectedCategoryId && this.categories.length) {
      this.selectedCategoryId = this.categoryIdOf(this.categories[0]);
      this.loadCategory();
    }
  }
  loadCategory(): void {
    if (!this.selectedCategoryId) return;
    const categoryId = this.selectedCategoryId;
    const loadSequence = ++this.categoryLoadSequence;
    this.loadingCategory = true;
    this.categoryError = false;
    this.generatingFixture = false;
    this.selectedCategory = undefined;
    this.categoryCompetitors = [];
    this.fixture = undefined;
    this.fixtureRounds = [];
    this.fixtureHistory = [];
    forkJoin({
      category: this.service.getCategory(categoryId),
      enrollment: this.service.getCategoryWithCompetitors(this.eventId, categoryId)
    }).pipe(finalize(() => {
      if (loadSequence === this.categoryLoadSequence) {
        this.loadingCategory = false;
        this.cdr.markForCheck();
      }
    }))
      .subscribe({
        next: ({ category, enrollment }) => {
          if (loadSequence !== this.categoryLoadSequence || categoryId !== this.selectedCategoryId) return;
          this.selectedCategory = { ...this.findCategory(categoryId), ...category };
          this.categoryCompetitors = this.extractCompetitors(enrollment);
          if (!this.categoryCompetitors.length) {
            this.fixtureCheckSequence.set(categoryId, (this.fixtureCheckSequence.get(categoryId) ?? 0) + 1);
            this.fixture = undefined;
            this.fixtureRounds = [];
            this.outdatedFixtures.delete(categoryId);
            this.selectedCategory = { ...this.selectedCategory, competitorCount: 0, fixtureVersion: 0 };
            this.categories = this.categories.map(item => this.categoryIdOf(item) === categoryId
              ? { ...item, competitorCount: 0, fixtureVersion: 0 } : item);
            return;
          }
          this.generateFixture(true);
        },
        error: () => {
          if (loadSequence !== this.categoryLoadSequence || categoryId !== this.selectedCategoryId) return;
          this.categoryError = true;
          this.selectedCategory = this.findCategory(categoryId);
        }
      });
  }
  generateFixture(automatic = false): void {
    if (!this.selectedCategoryId || !this.selectedCategory) return;
    const categoryId = this.selectedCategoryId;
    this.generatingFixture = true;
    this.service.generateFixture(this.eventId, categoryId)
      .pipe(finalize(() => {
        if (categoryId === this.selectedCategoryId) {
          this.generatingFixture = false;
          this.cdr.markForCheck();
        }
      }))
      .subscribe({
        next: (fixture) => {
          if (categoryId !== this.selectedCategoryId) return;
          this.fixture = fixture ?? { version: 1 };
          this.fixtureRounds = this.buildFixtureRounds(fixture);
          this.fixtureHistory = [];
          if (fixture && !fixture.generatedLocally) this.checkFixtureRosters([{ id: categoryId }], fixture);
          if (!automatic) this.snackBar.open('Llaves generadas correctamente', undefined, { duration: 3000 });
        },
        error: (error) => {
          if (categoryId !== this.selectedCategoryId) return;
          if (this.categoryFixtureType !== 'ELIMINACION') {
            this.fixture = undefined; this.fixtureRounds = []; this.fixtureHistory = [];
            this.snackBar.open(this.apiErrorMessage(error, 'No fue posible generar las llaves.'), undefined, { duration: 6500 });
            return;
          }
          this.fixture = { generatedLocally: true };
          this.fixtureRounds = this.buildFixtureRounds();
          this.fixtureHistory = [];
          this.snackBar.open(
            `${this.apiErrorMessage(error, 'No fue posible consultar las versiones guardadas.')} Se generó una vista previa local.`,
            undefined,
            { duration: 6500 }
          );
        }
      });
  }
  refreshFixture(): void {
    if (!this.selectedCategoryId || !this.selectedCategory || this.loadingCategory ||
        this.generatingFixture || this.savingFixture || this.refreshingFixture) return;
    if (!window.confirm('¿Refrescar las llaves con todos los inscritos actuales de esta categoría? Se guardará una nueva versión y se conservarán las anteriores. Los ajustes sin guardar se descartarán y la nueva versión comenzará sin resultados.')) return;
    const categoryId = this.selectedCategoryId;
    const sequence = this.categoryLoadSequence;
    this.refreshingFixture = true;
    this.service.refreshFixture(this.eventId, categoryId)
      .pipe(finalize(() => { this.refreshingFixture = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: fixture => {
          if (categoryId !== this.selectedCategoryId || sequence !== this.categoryLoadSequence) return;
          this.fixture = fixture;
          this.fixtureRounds = this.buildFixtureRounds(fixture);
          this.fixtureHistory = [];
          // Use the entrants returned by the saved version, not the previously loaded roster.
          const entrants = new Map<number, any>();
          for (const match of this.fixtureRounds.flatMap(round => round.matches)) {
            for (const slot of [match.top, match.bottom]) {
              if (slot.competitorId) entrants.set(slot.competitorId, {
                competitorId: slot.competitorId, fullName: slot.name, academyName: slot.academy
              });
            }
          }
          this.categoryCompetitors = [...entrants.values()];
          const metadata = { competitorCount: entrants.size, fixtureVersion: Number(fixture.version ?? fixture.Version) };
          this.selectedCategory = { ...this.selectedCategory, ...metadata };
          this.categories = this.categories.map(category => this.categoryIdOf(category) === categoryId
            ? { ...category, ...metadata } : category);
          this.checkFixtureRosters([{ id: categoryId }], fixture);
          this.snackBar.open(`Llaves actualizadas: ${entrants.size} inscritos. Versión ${this.fixtureVersion} guardada.`, undefined, { duration: 5000 });
        },
        error: error => {
          if (categoryId !== this.selectedCategoryId || sequence !== this.categoryLoadSequence) return;
          this.snackBar.open(this.apiErrorMessage(error, 'No fue posible refrescar las llaves.'), undefined, { duration: 6000 });
        }
      });
  }
  saveFixtureVersion(): void {
    if (this.isKudoRepechage || !this.fixture || !this.fixtureRounds.length || this.savingFixture || this.refreshingFixture || this.changingFixtureType || this.fixtureTypeChanged) return;
    const matches = this.fixtureMatchesForSave();
    if (!matches.length) {
      this.snackBar.open('No hay encuentros para guardar.', undefined, { duration: 4000 });
      return;
    }
    const payload: SaveFixtureVersion = {
      baseVersion: Number(this.fixture.version ?? this.fixture.Version ?? 0),
      notes: this.fixture.notes ?? this.fixture.Notes ?? null,
      matches
    };
    this.savingFixture = true;
    const saveRequest = payload.baseVersion > 0
      ? this.service.saveFixtureVersion(this.eventId, this.selectedCategoryId, payload)
      : this.service.generateFixture(this.eventId, this.selectedCategoryId).pipe(
          switchMap((latest) => this.service.saveFixtureVersion(
            this.eventId,
            this.selectedCategoryId,
            { ...payload, baseVersion: Number(latest?.version ?? latest?.Version) }
          ))
        );
    saveRequest
      .pipe(finalize(() => { this.savingFixture = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (fixture) => {
          this.fixture = fixture;
          this.fixtureRounds = this.buildFixtureRounds(fixture);
          this.fixtureHistory = [];
          this.checkFixtureRosters([{ id: this.selectedCategoryId }], fixture);
          const metadata = { fixtureVersion: Number(fixture.version ?? fixture.Version), competitorCount: this.categoryCompetitors.length };
          this.selectedCategory = { ...this.selectedCategory, ...metadata };
          this.categories = this.categories.map(category => this.categoryIdOf(category) === this.selectedCategoryId ? { ...category, ...metadata } : category);
          this.snackBar.open(`Versión ${this.fixtureVersion} guardada correctamente`, undefined, { duration: 3500 });
        },
        error: (error) => {
          const message = this.apiErrorMessage(error, 'No fue posible guardar la nueva versión de la llave.');
          this.snackBar.open(message, undefined, { duration: 5500 });
        }
      });
  }
  exportPdf(): void {
    if (this.event && this.fixtureRounds.length) {
      this.tournamentPdf.downloadFixture(this.event, this.selectedCategory, { ...this.fixture, fixtureType: this.savedFixtureType, rounds: this.fixtureRounds })
        .catch(error => this.snackBar.open(error?.message || 'No fue posible exportar el PDF.', undefined, { duration: 6000 }));
      return;
    }
    const fixture = document.querySelector<HTMLElement>('.fixture-result');
    const header = fixture?.querySelector<HTMLElement>('.fixture-header');
    const bracket = fixture?.querySelector<HTMLElement>('.bracket, .kata-bracket');
    const bracketScroll = fixture?.querySelector<HTMLElement>('.bracket-scroll, .kata-scroll');
    if (!fixture || !header || !bracket || !bracketScroll) return;

    // Área útil de una hoja oficio horizontal (330 x 216 mm), con margen de 8 mm.
    const millimetersToPixels = 96 / 25.4;
    const printableWidth = (330 - 16) * millimetersToPixels;
    const printableHeight = (216 - 16) * millimetersToPixels;
    const contentWidth = Math.max(header.scrollWidth, bracket.scrollWidth + 40);
    const contentHeight = header.offsetHeight + bracket.scrollHeight + 40;
    const scale = Math.min(1, printableWidth / contentWidth, printableHeight / contentHeight);

    document.documentElement.style.setProperty('--fixture-print-scale', scale.toFixed(4));
    const clearPrintScale = () => {
      document.documentElement.style.removeProperty('--fixture-print-scale');
      window.removeEventListener('afterprint', clearPrintScale);
    };
    window.addEventListener('afterprint', clearPrintScale);
    requestAnimationFrame(() => window.print());
  }
  addFixtureMatch(): void {
    if (this.refreshingFixture || !this.isElimination || this.fixtureTypeChanged) return;
    const firstRound = this.fixtureRounds[0];
    if (!firstRound) return;
    this.rememberFixtureState();
    firstRound.matches.push(this.emptyMatch(firstRound.matches.length, true));
    this.rebuildFixtureSequence();
    this.fixture = { ...this.fixture, generatedLocally: true };
    this.cdr.markForCheck();
  }
  get canUndoFixtureChange(): boolean { return this.fixtureHistory.length > 0; }
  undoFixtureChange(): void {
    if (this.refreshingFixture) return;
    const previous = this.fixtureHistory.pop();
    if (!previous) return;
    this.fixtureRounds = previous;
    this.fixture = { ...this.fixture, generatedLocally: true };
    this.snackBar.open('Se deshizo el último cambio de las llaves.', undefined, { duration: 3000 });
    this.cdr.markForCheck();
  }
  slotLocation(roundIndex: number, matchIndex: number, position: 'top' | 'bottom'): SlotLocation {
    return { roundIndex, matchIndex, position };
  }
  dropFixtureSlot(event: CdkDragDrop<SlotLocation>): void {
    if (this.refreshingFixture || (!this.isElimination && !this.isKataJka) || this.fixtureTypeChanged) return;
    const source = event.previousContainer.data;
    const target = event.container.data;
    if (!source || !target || (source.roundIndex === target.roundIndex && source.matchIndex === target.matchIndex && source.position === target.position)) return;
    const sourceMatch = this.fixtureRounds[source.roundIndex]?.matches[source.matchIndex];
    const targetMatch = this.fixtureRounds[target.roundIndex]?.matches[target.matchIndex];
    if (!sourceMatch || !targetMatch) return;
    const sourceSlot = sourceMatch[source.position];
    const targetSlot = targetMatch[target.position];
    if (!sourceSlot.competitorId) return;
    this.rememberFixtureState();
    const movingForward = target.roundIndex > source.roundIndex;
    if (movingForward && !targetSlot.competitorId) {
      sourceMatch.winnerCompetitorId = sourceSlot.competitorId;
      sourceMatch[source.position] = { ...this.slot(undefined, source.position === 'top'), past: true };
      targetMatch[target.position] = { ...sourceSlot, color: targetSlot.color, label: targetSlot.label, past: false };
    } else {
      sourceMatch.winnerCompetitorId = null;
      sourceMatch[source.position] = {
        ...targetSlot,
        color: sourceSlot.color,
        label: sourceSlot.label,
        past: !targetSlot.competitorId && movingForward
      };
      targetMatch[target.position] = { ...sourceSlot, color: targetSlot.color, label: targetSlot.label, past: false };
    }
    sourceMatch.isBye = !(this.isKataJka && source.roundIndex === this.fixtureRounds.length - 1) && (!sourceMatch.top.competitorId || !sourceMatch.bottom.competitorId);
    targetMatch.isBye = !(this.isKataJka && target.roundIndex === this.fixtureRounds.length - 1) && (!targetMatch.top.competitorId || !targetMatch.bottom.competitorId);
    this.fixture = { ...this.fixture, generatedLocally: true };
    const sameAcademyMatch = [sourceMatch, targetMatch].find((match) => this.hasSameAcademy(match));
    if (sameAcademyMatch) {
      this.snackBar.open(
        `Advertencia: ${sameAcademyMatch.top.name} y ${sameAcademyMatch.bottom.name} pertenecen a la misma escuela/dojo. El cambio fue aplicado.`,
        undefined,
        { duration: 6000 }
      );
    }
    this.cdr.markForCheck();
  }
  get modalityId(): number { return Number(this.selectedCategory?.modalityId ?? this.selectedCategory?.ModalityId ?? this.selectedCategory?.modality?.id ?? 0); }
  get modalityName(): string {
    return this.selectedCategory?.modalityName ?? this.selectedCategory?.ModalityName ??
      this.selectedCategory?.modality?.name ?? this.selectedCategory?.Modality?.Name ??
      ({ 1: 'Kata', 2: 'Kumite', 3: 'Para-karate', 4: 'Kata equipo femenino', 5: 'Kata equipo masculino',
         6: 'Kumite equipo femenino', 7: 'Kumite equipo masculino', 8: 'Kata individual femenino',
         9: 'Kata individual masculino', 10: 'Kumite individual femenino', 11: 'Kumite individual masculino',
         12: 'Coach', 17: 'Kata equipo mixto' } as Record<number, string>)[this.modalityId] ?? 'No informada';
  }
  registrationKind(item: any): string {
    if (item.isTeam ?? item.IsTeam) return 'Equipo';
    const athlete = item.isAthlete ?? item.IsAthlete;
    const coach = item.isCoach ?? item.IsCoach;
    return athlete && coach ? 'Deportista / Coach' : athlete ? 'Deportista' : coach ? 'Coach' : '\u2014';
  }
  get categoryRule(): string {
    const item = this.selectedCategory;
    if (!item) return 'No informada';
    if (item.isOpen ?? item.IsOpen) return 'Open';
    const start = item.weightStart ?? item.WeightStart;
    const end = item.weightEnd ?? item.WeightEnd;
    if (start != null || end != null) return `Por peso (${start ?? 'sin mínimo'} a ${end ?? 'sin máximo'} kg)`;
    const name = String(item.name ?? item.Name ?? '').toLowerCase();
    if (/novicio|básico|basico|kyu b/.test(name)) return 'Por grado: Básico (Kyu B)';
    if (/avanzado|oficial|kyu a/.test(name)) return 'Por grado: Avanzado (Kyu A)';
    return 'Por grado / clasificación de la categoría';
  }
  get fixtureVersion(): string {
    if (this.selectedCategory && !this.categoryCompetitors.length && !this.fixture) return 'Sin versiones';
    const source = this.fixture ?? this.selectedCategory ?? {};
    return String(source.version ?? source.Version ?? source.fixtureVersion ?? source.FixtureVersion ?? (source.generatedLocally ? 'Local' : 'Generando...'));
  }
  competitorName(item: any): string {
    const student = item.student ?? item.Student ?? item.competitor?.student ?? item.Competitor?.Student ?? item;
    return student.fullName ?? student.FullName ?? student.name ?? student.Name ?? student.nombreCompleto ?? student.NombreCompleto ?? item.estudiante ?? item.Estudiante ?? '';
  }
  competitorAcademy(item: any): string {
    return item.academyName ?? item.AcademyName ?? item.academy?.name ?? item.Academy?.Name ?? item.competitor?.academy?.name ?? '';
  }
  fixtureRows(): any[] {
    const value = this.fixture?.matches ?? this.fixture?.Matches ?? this.fixture?.llaves ?? this.fixture?.Llaves ?? this.fixture;
    return Array.isArray(value) ? value : [];
  }
  get championshipName(): string { return this.event?.name || 'Campeonato'; }
  get eventColorSystem(): 'aka-ao' | 'aka-shiro' | 'aka-ao-white' | 'ao-shiro' {
    if (['ELIMINACIONKUDO', 'KUDOREPECHAGE'].includes(this.savedFixtureType)) return 'ao-shiro';
    if (this.isKataJka) return 'aka-ao-white';
    if (this.event?.associationType?.trim().toUpperCase() === 'JKA' && /kumite/i.test(this.modalityName)) return 'aka-ao-white';
    const type = String(this.event?.eventType ?? '').toLowerCase();
    const traditionalTypes = ['tradicional', 'jka', 'shotokan', 'shobu ippon'];
    return traditionalTypes.some((value) => type.includes(value)) ? 'aka-shiro' : 'aka-ao';
  }
  get fixtureColorCaption(): string {
    if (this.eventColorSystem === 'ao-shiro') return 'Sistema Kudo: AO (azul) / SHIRO (blanco)';
    return this.eventColorSystem === 'aka-ao-white' ? 'Sistema JKA: AKA (rojo) / SHIRO (blanco)' :
      this.eventColorSystem === 'aka-ao' ? 'Sistema WKF: AKA / AO' : 'Sistema tradicional: AKA / SHIRO';
  }
  private buildFixtureRounds(apiFixture?: any): FixtureRound[] {
    const apiRounds = apiFixture?.rounds ?? apiFixture?.Rounds;
    if (Array.isArray(apiRounds) && apiRounds.length) {
      return apiRounds.map((round: any, roundIndex: number) => ({
        number: Number(round.number ?? round.Number ?? roundIndex + 1),
        name: round.name ?? round.Name ?? `Ronda ${roundIndex + 1}`,
        matches: (round.matches ?? round.Matches ?? []).map((match: any, matchIndex: number) => this.apiMatch(match, matchIndex, roundIndex))
      }));
    }
    const apiRows = apiFixture?.matches ?? apiFixture?.Matches ?? apiFixture?.llaves ?? apiFixture?.Llaves;
    const entrants = Array.isArray(apiRows) && apiRows.length
      ? this.extractFixtureEntrants(apiRows)
      : this.categoryCompetitors.map((item) => ({ competitorId: this.competitorIdOf(item), name: this.competitorName(item), academy: this.competitorAcademy(item) }));
    const minimumSize = Math.max(2, entrants.length);
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(minimumSize)));
    const padded = [...entrants, ...Array.from({ length: bracketSize - entrants.length }, () => ({ competitorId: null, name: 'BYE', academy: '' }))];
    const rounds: FixtureRound[] = [];
    let matches = bracketSize / 2;
    let matchNumber = 1;
    for (let roundIndex = 0; matches >= 1; roundIndex++, matches /= 2) {
      const roundMatches: FixtureMatch[] = [];
      for (let matchIndex = 0; matchIndex < matches; matchIndex++) {
        const firstRound = roundIndex === 0;
        roundMatches.push({
          matchNumber: matchNumber++, position: matchIndex + 1, winnerCompetitorId: null,
          nextMatchId: null, nextMatchPosition: null, isBye: false,
          top: this.slot(firstRound ? padded[matchIndex * 2] : undefined, true, firstRound && !padded[matchIndex * 2]?.competitorId),
          bottom: this.slot(firstRound ? padded[matchIndex * 2 + 1] : undefined, false, firstRound && !padded[matchIndex * 2 + 1]?.competitorId)
        });
      }
      rounds.push({ number: roundIndex + 1, name: matches === 1 ? 'Final' : matches === 2 ? 'Semifinal' : roundIndex === 0 ? 'Primera ronda' : `Ronda ${roundIndex + 1}`, matches: roundMatches });
    }
    return rounds;
  }
  private slot(entrant: { competitorId?: number | null; name: string; academy: string } | undefined, top: boolean, past = false): FixtureSlot {
    const blueOrWhite = ['ao-shiro', 'aka-ao-white'].includes(this.eventColorSystem) ? { label: 'SHIRO', color: '#f8fafc' } :
      this.eventColorSystem === 'aka-ao' ? { label: 'AO', color: '#0957d9' } : { label: 'SHIRO', color: '#f8fafc' };
    const corner = top ? (this.eventColorSystem === 'ao-shiro' ? { label: 'AO', color: '#0957d9' } : { label: 'AKA', color: '#dc2626' }) : blueOrWhite;
    return { competitorId: entrant?.competitorId ?? null, name: entrant?.name ?? '', academy: entrant?.academy ?? '', past, ...corner };
  }
  private extractFixtureEntrants(matches: any[]): { competitorId: number | null; name: string; academy: string }[] {
    const firstRound = matches.filter((item) => Number(item.round ?? item.Round ?? 1) === 1);
    const source = firstRound.length ? firstRound : matches;
    return source.flatMap((match) => [
      match.top ?? match.Top ?? match.competitor1 ?? match.Competitor1 ?? match.aka ?? match.Aka,
      match.bottom ?? match.Bottom ?? match.competitor2 ?? match.Competitor2 ?? match.ao ?? match.Ao
    ]).filter(Boolean).map((item: any) => typeof item === 'string' ? { competitorId: null, name: item, academy: '' } : { competitorId: this.competitorIdOf(item), name: this.competitorName(item), academy: this.competitorAcademy(item) });
  }
  private apiMatch(match: any, index: number, roundIndex: number): FixtureMatch {
    const top = match.top ?? match.Top;
    const bottom = match.bottom ?? match.Bottom;
    const topCompetitorId = top ? this.competitorIdOf(top) : null;
    const bottomCompetitorId = bottom ? this.competitorIdOf(bottom) : null;
    const hasWinner = Boolean(match.winnerCompetitorId ?? match.WinnerCompetitorId);
    return {
      stage: match.stage, topSourceNumber: match.topSourceNumber, topSourceResult: match.topSourceResult,
      bottomSourceNumber: match.bottomSourceNumber, bottomSourceResult: match.bottomSourceResult,
      isConditional: match.isConditional, isActive: match.isActive,
      id: Number(match.id ?? match.Id) || undefined,
      matchNumber: Number(match.matchNumber ?? match.MatchNumber ?? index + 1),
      position: Number(match.position ?? match.Position ?? index + 1),
      winnerCompetitorId: this.nullableNumber(match.winnerCompetitorId ?? match.WinnerCompetitorId),
      nextMatchId: this.nullableNumber(match.nextMatchId ?? match.NextMatchId),
      nextMatchPosition: match.nextMatchPosition ?? match.NextMatchPosition ?? null,
      isBye: Boolean(match.isBye ?? match.IsBye),
      top: this.slot(top ? { competitorId: topCompetitorId, name: this.competitorName(top), academy: this.competitorAcademy(top) } : undefined, true, !topCompetitorId && (roundIndex === 0 || hasWinner)),
      bottom: this.slot(bottom ? { competitorId: bottomCompetitorId, name: this.competitorName(bottom), academy: this.competitorAcademy(bottom) } : undefined, false, !bottomCompetitorId && (roundIndex === 0 || hasWinner))
    };
  }
  private fixtureMatchesForSave(): SaveFixtureMatch[] {
    const idToNumber = new Map<number, number>();
    this.fixtureRounds.forEach((round) => round.matches.forEach((match) => {
      if (match.id) idToNumber.set(match.id, match.matchNumber);
    }));
    return this.fixtureRounds.flatMap((round, roundIndex) => round.matches.map((match, matchIndex) => {
      const nextRoundMatch = this.isElimination ? this.fixtureRounds[roundIndex + 1]?.matches[Math.floor(matchIndex / 2)] : undefined;
      return {
        round: round.number,
        matchNumber: match.matchNumber,
        position: match.position,
        topCompetitorId: match.top.competitorId,
        bottomCompetitorId: match.bottom.competitorId,
        winnerCompetitorId: match.winnerCompetitorId,
        nextMatchNumber: match.nextMatchId ? idToNumber.get(match.nextMatchId) ?? nextRoundMatch?.matchNumber ?? null : nextRoundMatch?.matchNumber ?? null,
        nextMatchPosition: match.nextMatchPosition ?? (nextRoundMatch ? (matchIndex % 2 === 0 ? 'top' : 'bottom') : null),
        isBye: this.isScoreOnly ? false : this.isKataJka ? match.isBye : match.isBye || !match.top.competitorId || !match.bottom.competitorId
      };
    }));
  }
  private emptyMatch(index: number, past = false): FixtureMatch {
    return {
      matchNumber: index + 1,
      position: index + 1,
      winnerCompetitorId: null,
      nextMatchId: null,
      nextMatchPosition: null,
      isBye: true,
      top: this.slot(undefined, true, past),
      bottom: this.slot(undefined, false, past)
    };
  }
  private rebuildFixtureSequence(): void {
    const rebuilt: FixtureRound[] = [];
    let matchCount = this.fixtureRounds[0].matches.length;
    let roundIndex = 0;
    while (matchCount >= 1) {
      const previousRound = this.fixtureRounds[roundIndex];
      const matches = Array.from({ length: matchCount }, (_, matchIndex) => {
        const existing = previousRound?.matches[matchIndex];
        return existing
          ? {
              ...existing,
              id: undefined,
              matchNumber: matchIndex + 1,
              position: matchIndex + 1,
              nextMatchId: null,
              nextMatchPosition: null
            }
          : this.emptyMatch(matchIndex, roundIndex === 0);
      });
      rebuilt.push({
        number: roundIndex + 1,
        name: matchCount === 1 ? 'Final' : matchCount === 2 ? 'Semifinal' : roundIndex === 0 ? 'Primera ronda' : `Ronda ${roundIndex + 1}`,
        matches
      });
      if (matchCount === 1) break;
      matchCount = Math.ceil(matchCount / 2);
      roundIndex++;
    }
    this.fixtureRounds = rebuilt;
  }
  private rememberFixtureState(): void {
    this.fixtureHistory.push(JSON.parse(JSON.stringify(this.fixtureRounds)) as FixtureRound[]);
    if (this.fixtureHistory.length > 20) this.fixtureHistory.shift();
  }
  private hasSameAcademy(match: FixtureMatch): boolean {
    if (!match.top.competitorId || !match.bottom.competitorId) return false;
    const topAcademy = this.normalizeAcademyName(match.top.academy);
    const bottomAcademy = this.normalizeAcademyName(match.bottom.academy);
    return Boolean(topAcademy && bottomAcademy && topAcademy === bottomAcademy);
  }
  private normalizeAcademyName(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLocaleLowerCase();
  }
  private competitorIdOf(item: any): number | null {
    return this.nullableNumber(item.competitorId ?? item.CompetitorId ?? item.id ?? item.Id ?? item.competitor?.id ?? item.Competitor?.Id);
  }
  private nullableNumber(value: unknown): number | null {
    const number = Number(value);
    return value == null || !Number.isFinite(number) || number <= 0 ? null : number;
  }
  private apiErrorMessage(error: any, fallback: string): string {
    const body = error?.error;
    if (typeof body === 'string' && body.trim()) return body;
    return body?.message ?? body?.Message ?? error?.message ?? fallback;
  }
  private findCategory(id: number): any { return this.categories.find((item) => this.categoryIdOf(item) === id) ?? {}; }
  private extractCompetitors(response: any): any[] {
    const payload = Array.isArray(response) ? response : response?.items ?? response?.Items ?? response?.categories ?? response?.Categories ?? [response];
    return payload.filter(Boolean).flatMap((item: any) => {
      const competitors = item.competitors ?? item.Competitors ?? item.deportistas ?? item.Deportistas ?? item.categoryCompetitors ?? item.CategoryCompetitors ?? [];
      return Array.isArray(competitors) ? competitors : [];
    });
  }
}
