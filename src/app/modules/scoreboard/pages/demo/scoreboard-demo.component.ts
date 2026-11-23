import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { ScoreboardMatchState, ScoreboardModality, ScoreboardSide } from '../../models/scoreboard.models';
import { KataDisplayComponent, KumiteDisplayComponent } from '../../components/displays/scoreboard-displays.component';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, KataDisplayComponent, KumiteDisplayComponent],
  template: `
    <main [class.display]="display">
      <p *ngIf="!display" role="status">DEMO ? No modifica datos del evento. Controles de prueba sin aplicar un reglamento oficial.</p>
      <header *ngIf="!display">
        <h1>Mesa de control ? {{match.associationCode || 'Demo'}} ? Tatami {{match.areaId}}</h1>
        <label>Modalidad
          <select [ngModel]="match.modality" (ngModelChange)="reset($event)">
            <option value="KUMITE">Kumite</option><option value="KATA">Kata</option>
          </select>
        </label>
        <button mat-stroked-button (click)="openDisplay()">Abrir display</button>
        <button mat-stroked-button (click)="reset(match.modality)">Reiniciar demo</button>
      </header>
      <section *ngIf="!display" class="controls">
        <ng-container *ngIf="match.modality === 'KUMITE'">
          <button mat-flat-button (click)="toggle()">{{match.timer.running ? 'Pausar' : 'Iniciar'}}</button>
          <div *ngFor="let side of sides">
            <strong>{{side}}</strong>
            <button mat-stroked-button (click)="score(side, 1)">+1 demo</button>
            <button mat-stroked-button (click)="score(side, -1)">-1 demo</button>
          </div>
        </ng-container>
        <label *ngIf="match.modality === 'KATA'">Puntaje de prueba
          <input type="number" step="0.1" [ngModel]="kataTotal" (ngModelChange)="setKata($event)">
        </label>
      </section>
      <bte-kumite-display *ngIf="match.modality === 'KUMITE'" [match]="match" [timerMs]="remaining" />
      <bte-kata-display *ngIf="match.modality === 'KATA'" [match]="match" />
    </main>`,
  styles: [`
    main { padding: 20px; } header, .controls { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
    main.display { padding: 0; min-height: 100vh; background: #070b14; }
    h1 { font-size: 22px; } select, input { padding: 8px; } .controls div { display: flex; gap: 10px; align-items: center; }
  `]
})
export class ScoreboardDemoComponent implements OnInit, OnDestroy {
  match!: ScoreboardMatchState;
  readonly sides: ScoreboardSide[] = ['AKA', 'SHIRO'];
  display = false;
  remaining = 180000;
  kataTotal = 0;
  private key = '';
  private tick?: ReturnType<typeof setInterval>;
  private receive = (event: StorageEvent) => {
    if (this.display && event.key === this.key && event.newValue) {
      try { this.match = JSON.parse(event.newValue); this.updateClock(); } catch {}
    }
  };
  constructor(private route: ActivatedRoute) {}
  ngOnInit(): void {
    this.display = this.route.snapshot.queryParamMap.get('display') === '1';
    this.key = 'bte-scoreboard-demo-' + this.route.snapshot.paramMap.get('eventId') + '-' + this.route.snapshot.paramMap.get('areaId');
    this.reset('KUMITE');
    if (this.display) {
      try { const saved = localStorage.getItem(this.key); if (saved) this.match = JSON.parse(saved); } catch {}
    }
    this.updateClock();
    window.addEventListener('storage', this.receive);
    this.tick = setInterval(() => this.updateClock(), 100);
  }
  reset(modality: ScoreboardModality): void {
    this.kataTotal = 0;
    this.match = {
      matchId: 'demo', eventId: Number(this.route.snapshot.paramMap.get('eventId')),
      areaId: Number(this.route.snapshot.paramMap.get('areaId')), categoryId: 0,
      associationCode: this.route.snapshot.queryParamMap.get('association') || '',
      modality, ruleSetId: 0, categoryName: 'DEMO', status: 'READY', sequence: 0, syncStatus: 'SYNCED',
      aka: { id: 0, name: 'Competidor demo AKA' }, shiro: { id: 0, name: 'Competidor demo SHIRO' },
      scores: { AKA: 0, SHIRO: 0 },
      timer: { durationMs: 180000, remainingMs: 180000, running: false, accumulatedElapsedMs: 0, finished: false }
    };
    this.remaining = 180000;
    this.save();
  }
  private save(): void { if (!this.display) localStorage.setItem(this.key, JSON.stringify(this.match)); }
  private updateClock(): void {
    const timer = this.match.timer;
    this.remaining = Math.max(0, timer.remainingMs - (timer.running ? Date.now() - (timer.startedAt || Date.now()) : 0));
    if (!this.display && timer.running && this.remaining === 0) this.toggle();
  }
  toggle(): void {
    if (this.display) return;
    this.updateRemaining();
    this.match.timer.running = !this.match.timer.running && this.remaining > 0;
    this.match.timer.startedAt = Date.now();
    this.match.status = this.match.timer.running ? 'RUNNING' : 'PAUSED';
    this.save();
  }
  private updateRemaining(): void {
    const timer = this.match.timer;
    this.remaining = Math.max(0, timer.remainingMs - (timer.running ? Date.now() - (timer.startedAt || Date.now()) : 0));
    timer.remainingMs = this.remaining;
  }
  score(side: ScoreboardSide, delta: number): void {
    if (this.display) return;
    this.match.scores = { ...this.match.scores, [side]: Math.max(0, (this.match.scores?.[side] || 0) + delta) };
    this.save();
  }
  setKata(value: number): void {
    if (this.display || !Number.isFinite(Number(value))) return;
    this.kataTotal = Number(value);
    this.match.kataScores = [this.kataTotal];
    this.match.result = { total: this.kataTotal };
    this.save();
  }
  openDisplay(): void {
    const url = new URL(location.href); url.searchParams.set('display', '1');
    window.open(url.toString(), '_blank', 'noopener');
  }
  ngOnDestroy(): void { clearInterval(this.tick); window.removeEventListener('storage', this.receive); }
}
