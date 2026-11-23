import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { EventInvitationsService } from '../../../../pages/championships/invitations/event-invitations.service';
import { KataControlComponent } from '../../components/kata-control/kata-control.component';
import { KumiteControlComponent } from '../../components/kumite-control/kumite-control.component';
import {
  ConnectionStatusComponent,
  SyncStatusComponent
} from '../../components/scoreboard-components';
import {
  ScoreboardArea,
  ScoreboardEvent,
  ScoreboardMatchState,
  ScoreboardRuleSet,
  ScoreboardSide
} from '../../models/scoreboard.models';
import { ScoreboardApiService } from '../../services/scoreboard-api.service';
import { ScoreboardChannelService } from '../../services/scoreboard-channel.service';
import { ScoreboardStateService } from '../../services/scoreboard-state.service';
import { ScoreboardSyncService } from '../../services/scoreboard-sync.service';
import { ScoreboardTimerService } from '../../services/scoreboard-timer.service';

@Component({
  selector: 'bte-scoreboard-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ScoreboardChannelService],
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    KataControlComponent,
    KumiteControlComponent,
    ConnectionStatusComponent,
    SyncStatusComponent
  ],
  template: `<main class="page">
    <header class="title">
      <div>
        <h1>Mesa de control</h1>
        <p>Selecciona evento, área y categoría para cargar la llave oficial.</p>
      </div>
      <div class="statuses">
        <bte-connection-status
          [status]="store.state().connectionStatus"
          [pending]="store.state().pendingOperations" />
        <bte-sync-status
          [status]="store.state().syncStatus"
          [pending]="store.state().pendingOperations" />
      </div>
    </header>

    <mat-card class="selector-card"
      ><div class="steps">
        <mat-form-field appearance="outline"
          ><mat-label>1. Evento disponible</mat-label>
          <mat-select
            [(ngModel)]="selectedEventId"
            (selectionChange)="selectEvent()">
            <mat-option *ngFor="let event of events" [value]="event.id"
              >{{ event.name }} ·
              {{ event.eventDateStart | date: 'dd/MM/yyyy' }}</mat-option
            >
          </mat-select></mat-form-field
        >
        <mat-form-field appearance="outline"
          ><mat-label>2. Área / tatami</mat-label>
          <mat-select
            [(ngModel)]="selectedAreaId"
            [disabled]="!selectedEventId || loadingAreas"
            (selectionChange)="selectArea()">
            <mat-option *ngFor="let area of areas" [value]="area.id">{{
              area.name || 'Tatami ' + area.id
            }}</mat-option>
          </mat-select></mat-form-field
        >
        <mat-form-field appearance="outline"
          ><mat-label>Categorias</mat-label>
          <mat-select
            [(ngModel)]="selectedCategoryId"
            [disabled]="!selectedAreaId || loadingCategories"
            (selectionChange)="selectCategory()">
            <mat-option
              *ngFor="let category of categories"
              [value]="categoryId(category)"
              >{{ categoryLabel(category) }}</mat-option
            >
          </mat-select></mat-form-field
        >
      </div>
      <div *ngIf="selectedEvent?.associationCode !== 'WKF'">
        <label><input type="checkbox" [(ngModel)]="demo"> Ver demo</label>
        <button *ngIf="demo" mat-stroked-button (click)="openDemo()" [disabled]="!selectedEventId">Abrir mesa demo</button>
        <p *ngIf="demo">Prueba el scoreboard sin inscritos ni llaves. Si no eliges un tatami, se utiliza Tatami 1. Los resultados de demo no se guardan en el evento.</p>
      </div>
      <div
        class="loading"
        *ngIf="
          loadingEvents || loadingAreas || loadingCategories || loadingFixture
        ">
        <mat-spinner diameter="32" /> Cargando información oficial...
      </div>
      <p class="message" *ngIf="message">{{ message }}</p>
      <p class="error" *ngIf="error">{{ error }}</p>
    </mat-card>

    <ng-container *ngIf="matches.length"
      ><section class="fixture-grid">
        <mat-card class="bracket-card"
          ><header>
            <h2>Llave oficial</h2>
            <p>{{ selectedCategoryLabel }} · {{ matches.length }} combates</p>
          </header>
          <div class="bracket-scroll">
            <div class="bracket" [style.--round-count]="fixtureRounds.length">
              <section
                class="bracket-round"
                *ngFor="let round of fixtureRounds">
                <h3>{{ round.name }}</h3>
                <div
                  class="round-matches"
                  [style.--match-count]="round.matches.length">
                  <div
                    class="match-position"
                    *ngFor="let entry of round.matches">
                    <button
                      type="button"
                      class="match-card"
                      [class.current]="entry.index === selectedMatchIndex"
                      [class.finished]="entry.match.status === 'CONFIRMED'"
                      (click)="selectMatch(entry.index)">
                      <small
                        >Combate
                        {{
                          entry.match.matchNumber || entry.match.matchId
                        }}</small
                      >
                      <span class="side" [class.aka]="!['ELIMINACIONKUDO', 'KUDOREPECHAGE'].includes(entry.match.fixtureType || '')" [class.ao]="['ELIMINACIONKUDO', 'KUDOREPECHAGE'].includes(entry.match.fixtureType || '')"
                        ><b>{{ ['ELIMINACIONKUDO', 'KUDOREPECHAGE'].includes(entry.match.fixtureType || '') ? 'AO' : 'AKA' }}</b
                        ><span
                          ><strong>{{
                            entry.match.aka?.name || 'Por definir'
                          }}</strong
                          ><small>{{ entry.match.aka?.academy }}</small></span
                        ></span
                      >
                      <span class="side" [class.ao]="!['ELIMINACIONKUDO', 'KUDOREPECHAGE'].includes(entry.match.fixtureType || '')" [class.shiro]="['ELIMINACIONKUDO', 'KUDOREPECHAGE'].includes(entry.match.fixtureType || '')"
                        ><b>{{ ['ELIMINACIONKUDO', 'KUDOREPECHAGE'].includes(entry.match.fixtureType || '') ? 'SHIRO' : 'AO' }}</b
                        ><span
                          ><strong>{{
                            entry.match.shiro?.name || 'Por definir'
                          }}</strong
                          ><small>{{ entry.match.shiro?.academy }}</small></span
                        ></span
                      >
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </mat-card>
        <mat-card class="next-card"
          ><h2>Siguiente combate</h2>
          <ng-container *ngIf="nextMatch; else noNext">
            <strong
              >Combate {{ nextMatch.matchNumber || nextMatch.matchId }}</strong
            ><span>{{ nextMatch.aka?.name || 'Por definir' }}</span>
            <span>{{
              nextMatch.shiro?.name || 'Por definir'
            }}</span></ng-container
          ><ng-template #noNext
            ><p>No hay otro combate pendiente.</p></ng-template
          ></mat-card
        >
      </section>

      <mat-card class="control-card" *ngIf="match && ruleSet"
        ><header class="control-header">
          <a mat-stroked-button [routerLink]="['/scoreboard/events', selectedEventId, 'categories', selectedCategoryId, 'results']"
            [state]="{ fixtureResult: { matchId: match.fixtureMatchId, result: match.result } }">Confirmar resultados de categoría</a>
          <div>
            <h2>Mesa de control</h2>
            <p>
              {{ match.associationCode }} · {{ match.modality }} · Combate
              {{ match.matchNumber || match.matchId }}
            </p>
          </div>
          <a
            mat-flat-button
            color="accent"
            target="_blank"
            [routerLink]="[
              '/scoreboard/events',
              selectedEventId,
              'areas',
              selectedAreaId,
              'display'
            ]"
            [queryParams]="{ categoryId: selectedCategoryId }"
            >Abrir Display</a
          >
        </header>
        <bte-kumite-control
          *ngIf="match.modality === 'KUMITE'"
          [match]="match"
          [ruleSet]="ruleSet"
          [timerMs]="timer.displayMs()"
          (scored)="
            act('SCORE', $event.side, $event.option.value, $event.option)
          "
          (penalized)="act('PENALTY', $event.side, undefined, $event.control)"
          (specialized)="act('SPECIAL', $event.side, undefined, $event.control)"
          (timerAction)="timerAction($event)"
          (timerAdjust)="timer.adjust($event)" />
        <bte-kata-control
          *ngIf="match.modality === 'KATA'"
          [match]="match"
          [ruleSet]="ruleSet" />
        <footer class="navigation">
          <button
            mat-stroked-button
            [disabled]="selectedMatchIndex === 0"
            (click)="selectMatch(selectedMatchIndex - 1)">
            Anterior
          </button>
          <button
            mat-stroked-button
            [disabled]="selectedMatchIndex >= matches.length - 1"
            (click)="selectMatch(selectedMatchIndex + 1)">
            Siguiente
          </button>
        </footer>
      </mat-card></ng-container
    >
  </main>`,
  styles: [
    `
      .page {
        padding: 1.5rem;
        display: grid;
        gap: 1rem;
      }
      .title,
      .control-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
      }
      h1,
      h2,
      p {
        margin: 0;
      }
      .statuses {
        display: grid;
        justify-items: end;
        gap: 0.25rem;
      }
      .selector-card,
      .control-card,
      .bracket-card,
      .next-card {
        padding: 1.25rem;
      }
      .steps {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1rem;
      }
      .steps mat-form-field {
        width: 100%;
      }
      .loading {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .message {
        color: var(--vex-text-color-secondary);
      }
      .error {
        color: #b91c1c;
        padding: 0.75rem;
        background: #fef2f2;
        border-radius: 0.5rem;
      }
      .fixture-grid {
        display: grid;
        grid-template-columns: minmax(0, 3fr) minmax(240px, 1fr);
        gap: 1rem;
      }
      .bracket-card {
        min-width: 0;
      }
      .bracket-card header {
        margin-bottom: 1rem;
      }
      .bracket-scroll {
        overflow: auto;
        padding: 0.25rem;
        min-height: 24rem;
      }
      .bracket {
        --connector: 1.4rem;
        --match-gap: 0.9rem;
        display: grid;
        grid-template-columns: repeat(var(--round-count), minmax(15rem, 1fr));
        gap: 2.8rem;
        min-width: max-content;
        min-height: 22rem;
      }
      .bracket-round {
        display: flex;
        flex-direction: column;
        min-width: 15rem;
      }
      .bracket-round h3 {
        text-align: center;
        text-transform: uppercase;
        font-size: 0.8rem;
        margin: 0 0 0.75rem;
        padding: 0.4rem;
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
      }
      .round-matches {
        display: grid;
        grid-template-rows: repeat(var(--match-count), minmax(6.8rem, 1fr));
        row-gap: var(--match-gap);
        flex: 1;
      }
      .match-position {
        position: relative;
        display: flex;
        align-items: center;
      }
      .match-position::after {
        content: '';
        position: absolute;
        left: 100%;
        top: 50%;
        width: var(--connector);
        border-top: 2px solid #475569;
      }
      .match-position:nth-child(odd):not(:last-child)::before {
        content: '';
        position: absolute;
        left: calc(100% + var(--connector));
        top: 50%;
        height: calc(100% + var(--match-gap));
        border-left: 2px solid #475569;
      }
      .bracket-round:last-child .match-position::after,
      .bracket-round:last-child .match-position::before {
        display: none;
      }
      .match-card {
        position: relative;
        width: 100%;
        padding: 0;
        border: 1px solid #cbd5e1;
        border-radius: 0.4rem;
        background: #fff;
        text-align: left;
        overflow: hidden;
        cursor: pointer;
        box-shadow: 0 1px 4px rgb(0 0 0 / 12%);
      }
      .bracket-round:not(:first-child) .match-card::before {
        content: '';
        position: absolute;
        right: 100%;
        top: 50%;
        width: var(--connector);
        border-top: 2px solid #475569;
      }
      .match-card > small {
        display: block;
        padding: 0.25rem 0.5rem;
        color: #475569;
        background: #f8fafc;
      }
      .match-card.current {
        outline: 3px solid rgb(var(--vex-color-primary-500));
        outline-offset: 2px;
      }
      .match-card.finished {
        opacity: 0.68;
      }
      .side {
        display: grid;
        grid-template-columns: 2.15rem 1fr;
        min-height: 3rem;
        border-top: 2px solid #dc2626;
      }
      .side.ao {
        border-color: #2563eb;
      }
      .side > b {
        display: grid;
        place-items: center;
        color: #fff;
        background: #dc2626;
        font-size: 0.62rem;
        writing-mode: vertical-rl;
      }
      .side.ao > b {
        background: #2563eb;
      }
      .side.shiro { border-color: #94a3b8; }
      .side.shiro > b { background: #fff; color: #111827; border-right: 1px solid #94a3b8; }
      .side > span {
        display: flex;
        justify-content: center;
        flex-direction: column;
        padding: 0.3rem 0.5rem;
      }
      .side strong {
        font-size: 0.76rem;
        text-transform: uppercase;
      }
      .side small {
        font-size: 0.62rem;
        color: #64748b;
        text-transform: uppercase;
      }
      .next-card {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }
      .next-card p {
        color: var(--vex-text-color-secondary);
      }
      .control-header {
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--vex-divider-color);
        margin-bottom: 1rem;
      }
      .navigation {
        display: flex;
        justify-content: space-between;
        margin-top: 1rem;
      }
      @media (max-height: 800px) {
        .control-card { padding: 0.75rem; }
        .control-header { padding-bottom: 0.45rem; margin-bottom: 0.45rem; }
        .control-header h2 { font-size: 1rem; }
        .control-header p { font-size: 0.78rem; }
        .navigation { margin-top: 0.4rem; }
      }
      @media (max-width: 900px) {
        .steps,
        .fixture-grid {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 600px) {
        .title,
        .control-header {
          flex-direction: column;
        }
        .statuses {
          justify-items: start;
        }
      }
    `
  ]
})
export class ScoreboardDashboardComponent implements OnInit {
  events: ScoreboardEvent[] = [];
  areas: ScoreboardArea[] = [];
  categories: any[] = [];
  matches: ScoreboardMatchState[] = [];
  selectedEventId: number | null = null;
  selectedAreaId: number | null = null;
  selectedCategoryId: number | null = null;
  selectedMatchIndex = -1;
  selectedCategoryLabel = '';
  match: ScoreboardMatchState | null = null;
  ruleSet: ScoreboardRuleSet | null = null;
  loadingEvents = true;
  loadingAreas = false;
  loadingCategories = false;
  loadingFixture = false;
  message = 'Selecciona un evento para comenzar.';
  error = '';
  demo = false;
  openDemo(): void {
    if (!this.selectedEventId) return;
    const areaId = this.selectedAreaId || 1;
    const association = this.selectedEvent?.associationCode || '';
    const route = association === 'KUDO'
      ? ['/scoreboard/events', this.selectedEventId, 'categories', 0, 'kudo']
      : ['/scoreboard/events', this.selectedEventId, 'areas', areaId, 'demo'];
    void this.kudoRouter.navigate(route, {
      queryParams: { demo: 1, areaId, association }
    });
  }
  constructor(
    private kudoRouter: Router,
    private api: ScoreboardApiService,
    private legacy: EventInvitationsService,
    private auth: AuthService,
    public store: ScoreboardStateService,
    private sync: ScoreboardSyncService,
    public timer: ScoreboardTimerService,
    private channel: ScoreboardChannelService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const session = this.auth.getCurrentUser();
    const academyId = session?.academieId;
    const isAdmin = session?.rol === 'admin';
    this.legacy
      .getEvents()
      .pipe(
        finalize(() => {
          this.loadingEvents = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (events) => {
          this.events = events
            .filter((e) => isAdmin || !academyId || e.academyId === academyId)
            .map((e) => ({
              ...e,
              associationCode: String(e.associationType ?? '')
                .trim()
                .toUpperCase(),
              areas: []
            }));
          this.message = this.events.length
            ? (isAdmin ? 'Selecciona un evento.' : 'Selecciona un evento disponible para tu academia.')
            : (isAdmin ? 'No hay eventos disponibles.' : 'No hay eventos disponibles para la academia de la sesión.');
          this.cdr.markForCheck();
        },
        error: () => {
          this.error = isAdmin ? 'No fue posible cargar los eventos.' : 'No fue posible cargar los eventos de la academia.';
          this.cdr.markForCheck();
        }
      });
  }
  selectEvent(): void {
    this.resetAfterEvent();
    const event = this.selectedEvent;
    if (!event) return;
    this.loadingAreas = true;
    this.message = 'Selecciona el área donde se desarrollará la competencia.';
    this.legacy
      .getEventSchedule(event.id)
      .pipe(
        map((s) => this.scheduleAreas(s, event)),
        catchError(() => this.api.getAreas(event.id)),
        catchError(() => of(this.fallbackAreas(event))),
        finalize(() => {
          this.loadingAreas = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe((areas) => {
        this.areas = areas.length ? areas : this.fallbackAreas(event);
        if (!this.areas.length)
          this.error = 'El evento no tiene áreas/tatamis configurados.';
      });
  }
  selectArea(): void {
    this.resetAfterArea();
    if (!this.selectedEventId || !this.selectedAreaId) return;
    this.channel.connect(this.selectedEventId, this.selectedAreaId);
    this.loadingCategories = true;
    this.message =
      'Selecciona una categoría asignada a esta área en el cronograma.';
    forkJoin({
      rows: this.legacy.getEventCategories(this.selectedEventId),
      schedule: this.legacy.getEventSchedule(this.selectedEventId)
    })
      .pipe(
        finalize(() => {
          this.loadingCategories = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: ({ rows, schedule }) => {
          this.categories = this.scheduledCategories(schedule, rows);
          if (this.selectedEvent?.associationCode === 'WKF') {
            this.categories = this.categories.filter(c => ['KATA', 'KUMITE'].includes(String(c?.modality?.name ?? c?.Modality?.Name ?? c?.modalityName ?? c?.ModalityName ?? '').trim().toUpperCase()));
          }
          if (!this.categories.length)
            this.error =
              'El área seleccionada no tiene categorías asignadas en el cronograma.';
        },
        error: () =>
          (this.error = 'No fue posible cargar las categorías del cronograma.')
      });
  }
  selectCategory(): void {
    this.matches = [];
    this.match = null;
    this.ruleSet = null;
    this.error = '';
    if (
      !this.selectedEventId ||
      !this.selectedAreaId ||
      !this.selectedCategoryId
    )
      return;
    const category = this.categories.find(
      (c) => this.categoryId(c) === this.selectedCategoryId
    );
    this.selectedCategoryLabel = this.categoryLabel(category);
    this.loadingFixture = true;
    this.message = 'Cargando la versión oficial de la llave...';
    this.api
      .getFixtureContext(
        this.selectedEventId,
        this.selectedAreaId,
        this.selectedCategoryId
      )
      .pipe(
        finalize(() => {
          this.loadingFixture = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (ctx) => {
          this.matches = ctx.matches;
          const pending = this.matches.findIndex(
            (m) => m.status !== 'CONFIRMED' && !!m.aka && !!m.shiro
          );
          if (!this.matches.length) {
            this.error = 'La llave vigente no contiene combates.';
            return;
          }
          this.selectMatch(pending >= 0 ? pending : 0);
          this.message = '';
        },
        error: (e) =>
          (this.error =
            e?.error?.message ??
            e?.message ??
            'No fue posible cargar la llave oficial.')
      });
  }
  selectMatch(index: number): void {
    const match = this.matches[index];
    if (!match) return;
    if (match.associationCode === 'WKF') {
      void this.kudoRouter.navigate(['/scoreboard/events', match.eventId, 'categories', match.categoryId, 'wkf'], { queryParams: { matchId: match.fixtureMatchId, areaId: match.areaId } });
      return;
    }
    if (match.associationCode === 'KUDO') {
      void this.kudoRouter.navigate(['/scoreboard/events', match.eventId, 'categories', match.categoryId, 'kudo'], { queryParams: { matchId: match.fixtureMatchId } });
      return;
    }
    this.selectedMatchIndex = index;
    this.match = match;
    this.ruleSet = {
      id: 0,
      associationCode: match.associationCode,
      modality: match.modality,
      name: `${match.associationCode} ${match.modality}`,
      version: 'COMPONENT',
      configuration: {}
    };
    this.store.setMatch(match, this.ruleSet);
    this.timer.hydrate(match.timer);
    this.channel.publish(match);
  }
  get nextMatch(): ScoreboardMatchState | null {
    return (
      this.matches
        .slice(this.selectedMatchIndex + 1)
        .find((m) => m.status !== 'CONFIRMED') ?? null
    );
  }
  get fixtureRounds(): Array<{
    number: number;
    name: string;
    matches: Array<{ match: ScoreboardMatchState; index: number }>;
  }> {
    const rounds = new Map<
      number,
      {
        number: number;
        name: string;
        matches: Array<{ match: ScoreboardMatchState; index: number }>;
      }
    >();
    this.matches.forEach((match, index) => {
      const number = Number(match.roundNumber ?? 1);
      let round = rounds.get(number);
      if (!round) {
        round = {
          number,
          name: match.roundName || `Ronda ${number}`,
          matches: []
        };
        rounds.set(number, round);
      }
      round.matches.push({ match, index });
    });
    return [...rounds.values()].sort(
      (left, right) => left.number - right.number
    );
  }
  async act(
    action: string,
    side?: ScoreboardSide,
    value?: number,
    payload?: unknown
  ): Promise<void> {
    this.store.updateTimer(this.timer.snapshot());
    const op = await this.store.perform(action, side, value, payload);
    if (!op) return;
    this.match = this.store.match();
    if (this.match) {
      this.matches[this.selectedMatchIndex] = this.match;
      this.channel.publish(this.match);
    }
    await this.sync.enqueueChanged();
    this.cdr.markForCheck();
  }
  timerAction(action: string): void {
    if (action === 'START') {
      this.timer.start();
      void this.act(
        this.match?.status === 'PAUSED' ? 'TIMER_RESUME' : 'MATCH_START'
      );
    } else {
      this.timer.pause();
      void this.act('TIMER_PAUSE');
    }
  }
  categoryId(c: any): number {
    return Number(c?.id ?? c?.Id ?? c?.categoryId ?? c?.CategoryId);
  }
  categoryLabel(c: any): string {
    const code = c?.code ?? c?.Code ?? '',
      name = c?.name ?? c?.Name ?? 'Categoría sin nombre',
      mod =
        c?.modalityName ??
        c?.ModalityName ??
        c?.modality?.name ??
        c?.Modality?.Name ??
        '';
    return [code, name, mod].filter(Boolean).join(' · ');
  }
  get selectedEvent(): ScoreboardEvent | undefined {
    return this.events.find((e) => e.id === this.selectedEventId);
  }
  private scheduledCategories(schedule: any, rows: any[]): any[] {
    const areas =
      schedule?.areas ??
      schedule?.Areas ??
      schedule?.data?.areas ??
      schedule?.Data?.Areas ??
      [];
    if (!Array.isArray(areas)) return [];
    const areaNumber = Number(this.selectedAreaId);
    const area = areas.find(
      (item: any) => Number(item?.areaNumber ?? item?.AreaNumber) === areaNumber
    );
    const items = area?.items ?? area?.Items ?? [];
    if (!Array.isArray(items)) return [];
    const byId = new Map(
      rows.map((category) => [this.categoryId(category), category])
    );
    return [...items]
      .sort(
        (left: any, right: any) =>
          Number(left?.sequence ?? left?.Sequence ?? 0) -
          Number(right?.sequence ?? right?.Sequence ?? 0)
      )
      .filter(
        (item: any) =>
          String(item?.type ?? item?.Type ?? 'category').toLowerCase() ===
          'category'
      )
      .map((item: any) =>
        byId.get(Number(item?.categoryId ?? item?.CategoryId))
      )
      .filter((category: any) => !!category);
  }
  private scheduleAreas(s: any, e: ScoreboardEvent): ScoreboardArea[] {
    const rows = s?.areas ?? s?.Areas ?? s?.data?.areas ?? [];
    if (!Array.isArray(rows) || !rows.length) return this.fallbackAreas(e);
    return rows.map((a: any, i: number) => {
      const number = Number(a.areaNumber ?? a.AreaNumber ?? i + 1);
      return {
        id: number,
        eventId: e.id,
        name:
          a.name ?? a.Name ?? a.areaName ?? a.AreaName ?? `Tatami ${number}`,
        status: 'AVAILABLE' as const,
        online: navigator.onLine,
        pendingOperations: 0
      };
    });
  }
  private fallbackAreas(e: ScoreboardEvent): ScoreboardArea[] {
    return Array.from({ length: e.numberOfAreas ?? 0 }, (_, i) => ({
      id: i + 1,
      eventId: e.id,
      name: `Tatami ${i + 1}`,
      status: 'AVAILABLE' as const,
      online: navigator.onLine,
      pendingOperations: 0
    }));
  }
  private resetAfterEvent(): void {
    this.selectedAreaId = null;
    this.areas = [];
    this.resetAfterArea();
  }
  private resetAfterArea(): void {
    this.selectedCategoryId = null;
    this.categories = [];
    this.matches = [];
    this.selectedMatchIndex = -1;
    this.match = null;
    this.ruleSet = null;
    this.error = '';
  }
}
