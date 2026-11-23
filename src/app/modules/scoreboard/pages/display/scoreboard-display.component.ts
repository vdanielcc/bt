import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, Subscription } from 'rxjs';
import {
  KataDisplayComponent,
  KumiteDisplayComponent
} from '../../components/displays/scoreboard-displays.component';
import { ScoreboardMatchState } from '../../models/scoreboard.models';
import { ScoreboardApiService } from '../../services/scoreboard-api.service';
import { ScoreboardChannelService } from '../../services/scoreboard-channel.service';
import { ScoreboardTimerService } from '../../services/scoreboard-timer.service';
import { ScoreboardDbService } from '../../services/scoreboard-db.service';
import { ScoreboardRealtimeService } from '../../services/scoreboard-realtime.service';
@Component({
  selector: 'bte-scoreboard-display-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ScoreboardChannelService],
  imports: [
    CommonModule,
    KumiteDisplayComponent,
    KataDisplayComponent
  ],
  template: `<bte-kumite-display
      *ngIf="match?.modality === 'KUMITE'"
      [match]="match!"
      [timerMs]="timer.displayMs()" /><bte-kata-display
      *ngIf="match?.modality === 'KATA'"
      [match]="match!" />
    <main *ngIf="!match" class="empty">Esperando combate...</main>`,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: #070b14;
      }
      .empty {
        min-height: 100vh;
        display: grid;
        place-items: center;
        color: #fff;
        font-size: 3rem;
      }
    `
  ]
})
export class ScoreboardDisplayPageComponent implements OnInit, OnDestroy {
  match: ScoreboardMatchState | null = null;
  private sub = new Subscription();
  constructor(
    private route: ActivatedRoute,
    private api: ScoreboardApiService,
    private channel: ScoreboardChannelService,
    public timer: ScoreboardTimerService,
    private db: ScoreboardDbService,
    private realtime: ScoreboardRealtimeService,
    private cdr: ChangeDetectorRef
  ) {}
  ngOnInit() {
    const eventId = Number(this.route.snapshot.paramMap.get('eventId')),
      areaId = Number(this.route.snapshot.paramMap.get('areaId'));
    const categoryId = Number(this.route.snapshot.queryParamMap.get('categoryId'));
    this.channel.connect(eventId, areaId);
    this.sub.add(this.channel.messages$.subscribe((m) => this.apply(m)));
    this.sub.add(
      this.realtime.events$.subscribe((event) => {
        const payload = event.payload as any;
        const state = (payload?.state ?? payload?.match ?? payload) as ScoreboardMatchState;
        if (state?.matchId) this.apply(state);
      })
    );
    void this.realtime.connect(eventId, areaId);
    this.api
      .getCurrentMatch(eventId, areaId, categoryId || undefined)
      .pipe(
        catchError(() =>
          this.api.getFixtureCurrentMatch(eventId, areaId, categoryId)
        )
      )
      .subscribe({
        next: (m) => this.apply(m),
        error: () => void this.db.findMatch(eventId, areaId).then((m) => m && this.apply(m))
      });
  }
  apply(m: ScoreboardMatchState) {
    this.match = m;
    this.timer.hydrate(m.timer);
    this.cdr.markForCheck();
  }
  toggleFullscreen() {
    document.fullscreenElement
      ? void document.exitFullscreen()
      : void document.documentElement.requestFullscreen();
  }
  @HostListener('document:keydown.f') onF() {
    this.toggleFullscreen();
  }
  ngOnDestroy() {
    this.sub.unsubscribe();
    void this.realtime.disconnect();
  }
}
