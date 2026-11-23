import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { catchError, Subscription } from 'rxjs';
import { KumiteControlComponent } from '../../components/kumite-control/kumite-control.component';
import { KataControlComponent } from '../../components/kata-control/kata-control.component';
import {
  ConnectionStatusComponent,
  SyncStatusComponent
} from '../../components/scoreboard-components';
import { ScoreboardApiService } from '../../services/scoreboard-api.service';
import { ScoreboardChannelService } from '../../services/scoreboard-channel.service';
import { ScoreboardStateService } from '../../services/scoreboard-state.service';
import { ScoreboardSyncService } from '../../services/scoreboard-sync.service';
import { ScoreboardTimerService } from '../../services/scoreboard-timer.service';
import { ScoreboardRealtimeService } from '../../services/scoreboard-realtime.service';
import { ScoreboardDbService } from '../../services/scoreboard-db.service';
import {
  ScoreboardMatchState,
  ScoreboardRuleSet,
  ScoreboardSide
} from '../../models/scoreboard.models';

@Component({
  selector: 'bte-scoreboard-control',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ScoreboardChannelService],
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatSnackBarModule,
    KumiteControlComponent,
    KataControlComponent,
    ConnectionStatusComponent,
    SyncStatusComponent
  ],
  template: `<main class="page">
    <header>
      <a mat-stroked-button *ngIf="categoryId || match?.categoryId" [routerLink]="['/scoreboard/events', eventId, 'categories', categoryId || match?.categoryId, 'results']">Resultados de categoría</a>
      <div>
        <h1>Mesa de control</h1>
        <p *ngIf="match">
          Tatami {{ areaId }} · {{ match.associationCode }} ·
          {{ match.modality }}
        </p>
      </div>
      <div class="statuses">
        <bte-connection-status
          [status]="store.state().connectionStatus"
          [pending]="store.state().pendingOperations" /><bte-sync-status
          [status]="store.state().syncStatus"
          [pending]="store.state().pendingOperations" />
      </div>
    </header>
    <mat-card class="panel" *ngIf="match && ruleSet; else loading"
      ><bte-kumite-control
        *ngIf="match.modality === 'KUMITE'"
        [match]="match"
        [ruleSet]="ruleSet"
        [timerMs]="timer.displayMs()"
        (scored)="act('SCORE', $event.side, $event.option.value, $event.option)"
        (penalized)="act('PENALTY', $event.side, undefined, $event.control)"
        (specialized)="act('SPECIAL', $event.side, undefined, $event.control)"
        (timerAction)="timerAction($event)"
        (timerAdjust)="timer.adjust($event)" /><bte-kata-control
        *ngIf="match.modality === 'KATA'"
        [match]="match"
        [ruleSet]="ruleSet"
        (penalty)="act('PENALTY', undefined, undefined, $event)"
        (confirmed)="confirmKata($event)" /></mat-card
    ><ng-template #loading
      ><mat-card class="panel">{{
        error || 'Cargando combate y reglamento...'
      }}</mat-card></ng-template
    >
    <footer>
      <button mat-stroked-button (click)="undo()">DESHACER</button
      ><button
        mat-flat-button
        color="primary"
        [disabled]="!match || match.status === 'CONFIRMED'"
        (click)="finish()">
        FINALIZAR COMBATE</button
      ><button
        mat-flat-button
        color="accent"
        [disabled]="match?.status !== 'FINISHED'"
        (click)="confirm()">
        CONFIRMAR RESULTADO
      </button>
    </footer>
  </main>`,
  styles: [
    `
      .page {
        padding: 1.25rem;
        display: grid;
        gap: 1rem;
      }
      .page > header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
      }
      .page h1,
      .page p {
        margin: 0;
      }
      .statuses {
        display: flex;
        align-items: flex-end;
        flex-direction: column;
        gap: 0.3rem;
      }
      .panel {
        padding: 1.25rem;
        min-height: 300px;
      }
      footer {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        position: sticky;
        bottom: 0;
        padding: 1rem;
        background: var(--vex-background-app-bar);
      }
      footer button {
        min-height: 56px;
      }
      @media (max-width: 700px) {
        .page > header {
          flex-direction: column;
        }
        .statuses {
          align-items: flex-start;
        }
        footer {
          flex-direction: column;
        }
      }
    `
  ]
})
export class ScoreboardControlComponent implements OnInit, OnDestroy {
  eventId = 0;
  areaId = 0;
  categoryId = 0;
  match: ScoreboardMatchState | null = null;
  ruleSet: ScoreboardRuleSet | null = null;
  error = '';
  private sub = new Subscription();
  private lastTap = 0;
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ScoreboardApiService,
    public store: ScoreboardStateService,
    private sync: ScoreboardSyncService,
    public timer: ScoreboardTimerService,
    private channel: ScoreboardChannelService,
    private realtime: ScoreboardRealtimeService,
    private db: ScoreboardDbService,
    private snack: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}
  ngOnInit() {
    this.eventId = Number(this.route.snapshot.paramMap.get('eventId'));
    this.areaId = Number(this.route.snapshot.paramMap.get('areaId'));
    this.categoryId = Number(this.route.snapshot.queryParamMap.get('categoryId'));
    this.channel.connect(this.eventId, this.areaId);
    this.sub.add(this.channel.messages$.subscribe((m) => this.applyRemote(m)));
    this.sub.add(
      this.realtime.events$.subscribe((event) => {
        const payload = event.payload as any;
        const state = (payload?.state ?? payload?.match ?? payload) as ScoreboardMatchState;
        if (state?.matchId) this.applyRemote(state);
      })
    );
    void this.realtime.connect(this.eventId, this.areaId);
    this.load();
  }
  load() {
    if (!this.categoryId) {
      this.error = 'Selecciona una categoría para este tatami antes de abrir la mesa.';
      this.cdr.markForCheck();
      return;
    }
    this.api.getCurrentMatch(this.eventId, this.areaId, this.categoryId)
      .pipe(
        catchError(() =>
          this.api.getFixtureCurrentMatch(this.eventId, this.areaId, this.categoryId)
        )
      )
      .subscribe({
      next: (m) => {
        if (m.associationCode === 'WKF') {
          void this.router.navigate(['/scoreboard/events', this.eventId, 'categories', m.categoryId || this.categoryId, 'wkf'], { queryParams: { matchId: m.fixtureMatchId, areaId: this.areaId } });
          return;
        }
        if (m.associationCode === 'KUDO') {
          void this.router.navigate(['/scoreboard/events', this.eventId, 'categories', m.categoryId || this.categoryId, 'kudo'], { queryParams: { matchId: m.fixtureMatchId } });
          return;
        }
        this.match = m;
        const ruleSet = this.componentRuleSet(m);
        this.ruleSet = ruleSet;
        this.store.setMatch(m, ruleSet);
        this.timer.hydrate(m.timer);
        void this.store.restoreActions(m.matchId);
        void this.db.saveRuleSet(ruleSet);
        this.error = '';
        this.cdr.markForCheck();
      },
      error: () => void this.loadOffline()
    });
  }
  private async loadCachedRuleSet(match: ScoreboardMatchState) {
    const ruleSet = await this.db.findRuleSet(match.associationCode, match.modality);
    if (ruleSet) {
      this.ruleSet = ruleSet;
      this.store.setMatch(match, ruleSet);
      this.error = '';
    } else {
      this.error = `El backend no tiene un RuleSet ${match.modality} configurado para ${match.associationCode || 'la asociación del evento'}.`;
    }
    this.cdr.markForCheck();
  }
  async act(
    action: string,
    side?: ScoreboardSide,
    value?: number,
    payload?: unknown
  ) {
    if (Date.now() - this.lastTap < 250) return;
    this.lastTap = Date.now();
    this.store.updateTimer(this.timer.snapshot());
    const op = await this.store.perform(action, side, value, payload);
    if (op) {
      this.match = this.store.match();
      if (this.match) this.channel.publish(this.match);
      await this.sync.enqueueChanged();
      this.cdr.markForCheck();
    }
  }
  private async loadOffline() {
    const match = await this.db.findMatch(this.eventId, this.areaId);
    const cachedRuleSet = match
      ? await this.db.findRuleSet(match.associationCode, match.modality)
      : undefined;
    if (match) {
      const ruleSet = cachedRuleSet ?? this.componentRuleSet(match);
      this.match = match;
      this.ruleSet = ruleSet;
      this.store.setMatch(match, ruleSet);
      await this.store.restoreActions(match.matchId);
      this.timer.hydrate(match.timer);
      this.error = '';
    } else {
      this.error = 'No hay un combate disponible para esta mesa.';
    }
    this.cdr.markForCheck();
  }
  private componentRuleSet(match: ScoreboardMatchState): ScoreboardRuleSet {
    return {
      id: 0,
      associationCode: match.associationCode,
      modality: match.modality,
      name: `${match.associationCode} ${match.modality}`.trim(),
      version: 'COMPONENT',
      configuration: {}
    };
  }
  timerAction(a: string) {
    if (a === 'START') {
      this.timer.start();
      void this.act(
        this.match?.status === 'PAUSED' ? 'TIMER_RESUME' : 'MATCH_START'
      );
    } else {
      this.timer.pause();
      void this.act('TIMER_PAUSE');
    }
  }
  async undo() {
    const op = await this.store.undo();
    if (op) {
      this.match = this.store.match();
      if (this.match) this.channel.publish(this.match);
      await this.sync.enqueueChanged();
      this.cdr.markForCheck();
    }
    this.snack.open('Se registró la reversión de la última acción', '', {
      duration: 2500
    });
  }
  async finish() {
    if (
      !confirm(
        '¿Finalizar este combate? Podrás revisar el resultado antes de confirmarlo.'
      )
    )
      return;
    this.timer.finish();
    await this.act('MATCH_FINISH');
  }
  async confirm() {
    if (this.match?.fixtureMatchId && /^\d+$/.test(this.match.matchId)) {
      await this.router.navigate(['/scoreboard/events', this.eventId, 'categories', this.match.categoryId || this.categoryId, 'results'],
        { state: { fixtureResult: { matchId: this.match.fixtureMatchId, result: this.match.result } } });
      return;
    }
    if (
      !confirm('¿Confirmar el resultado? Esta operación actualizará la llave.')
    )
      return;
    await this.act('RESULT_CONFIRMED');
    this.api
      .confirmResult(
        this.eventId,
        this.areaId,
        this.match!.matchId,
        this.match!.result ?? this.match
      )
      .subscribe({
        next: () => this.load(),
        error: () =>
          this.snack.open(
            'Resultado guardado localmente; se sincronizará al recuperar conexión',
            '',
            { duration: 4000 }
          )
      });
  }
  confirmKata(result: unknown) {
    if (this.match) this.match = { ...this.match, result };
    void this.finish();
  }
  applyRemote(m: ScoreboardMatchState) {
    if (!this.match || m.sequence >= this.match.sequence) {
      this.match = m;
      this.store.setMatch(m);
      this.timer.hydrate(m.timer);
      this.cdr.markForCheck();
    }
  }
  ngOnDestroy() {
    this.sub.unsubscribe();
    void this.realtime.disconnect();
  }
}
