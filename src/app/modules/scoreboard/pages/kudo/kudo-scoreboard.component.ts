import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { environment } from '../../../../../environments/environment';
import { ScoreboardFixtureResultsService } from '../../services/scoreboard-fixture-results.service';
import { confirmKudoDemo, kudoDemoCategory, kudoDemoProgress } from './kudo-demo-category';

interface Fighter { koka: number; doubleKoka: number; yuko: number; wazaAri: number; ippon: number; hansoku: number; shikkaku: boolean; groundCount: number; groundStartedAt: string | null }
interface Bout { restEndsAt?: string | null; groundCount?: number; groundStartedAt?: string | null; aka: Fighter; shiro: Fighter; round: number; isFinal: boolean; secondRoundEnabled: boolean; elapsedMs: number; startedAt: string | null; status: string; winner: string | null; decision: string | null; lastAction: string }
interface CategoryProgress { complete: boolean; readyMatchIds: number[]; awards: { competitorId: number; medal: string; name: string; academy: string }[] }
interface Snapshot { fixtureMatchId: number; revision: number; state: Bout; serverTime: string; remainingMs: number; officialWinnerCompetitorId?: number | null; demoMatches?: any[]; categoryProgress?: CategoryProgress; demoStates?: Record<number, Bout> }

@Component({ standalone: true, imports: [MatButtonModule, MatDialogModule],
  styles: [`.ao-choice { --mdc-filled-button-container-color: #1565c0; --mdc-filled-button-label-text-color: #fff; } .shiro-choice { --mdc-filled-button-container-color: #fff; --mdc-filled-button-label-text-color: #111827; border: 1px solid #b0bec5; }`],
  template: `<h2 mat-dialog-title>Decisión por Hantei</h2><mat-dialog-content>Seleccione al ganador de la votación del árbitro.</mat-dialog-content><mat-dialog-actions><button mat-button (click)="ref.close()">Cancelar</button><button mat-flat-button class="ao-choice" (click)="ref.close('AKA')">AO · {{data.aka}}</button><button mat-flat-button class="shiro-choice" (click)="ref.close('SHIRO')">SHIRO · {{data.shiro}}</button></mat-dialog-actions>` })
export class KudoHanteiDialog {
  constructor(public ref: MatDialogRef<KudoHanteiDialog>, @Inject(MAT_DIALOG_DATA) public data: { aka: string; shiro: string }) {}
}
@Component({ standalone: true, imports: [MatDialogModule, MatButtonModule], template: `<h2 mat-dialog-title>Revisar podio</h2><mat-dialog-content>{{data}}</mat-dialog-content><mat-dialog-actions><button mat-button mat-dialog-close>Cerrar</button></mat-dialog-actions>` })
export class KudoNoticeDialog { constructor(@Inject(MAT_DIALOG_DATA) public data: string) {} }

@Component({ standalone: true, imports: [MatDialogModule, MatButtonModule],
  template: `<h2 mat-dialog-title>Round {{data.round}} terminado</h2><mat-dialog-content>¿Se necesita otro round para desempatar? Puede disputar un máximo de 3 rounds en total. Si continúa, habrá 1 minuto de descanso antes del round {{data.round + 1}}.</mat-dialog-content><mat-dialog-actions><button mat-button (click)="ref.close(false)">Registrar Hantei</button><button mat-flat-button color="primary" (click)="ref.close(true)">Sí, preparar round {{data.round + 1}}</button></mat-dialog-actions>` })
export class KudoNextRoundDialog {
  constructor(public ref: MatDialogRef<KudoNextRoundDialog>, @Inject(MAT_DIALOG_DATA) public data: { round: number }) {}
}

@Component({ standalone: true, imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatDialogModule],
  templateUrl: './kudo-scoreboard.component.html', styleUrls: ['./kudo-scoreboard.component.scss'] })
export class KudoScoreboardComponent implements OnInit, OnDestroy {
  demo = false;
  private demoKey = '';
  private demoListener = (event: StorageEvent) => {
    if (this.display && !this.demo && event.key === this.selectionKey && event.newValue) {
      const id = Number(event.newValue);
      if (id > 0 && id !== this.selected) { this.selected = id; void this.load(); }
      return;
    }
    if (this.display && event.key === this.demoKey && event.newValue) {
      try { this.receiveDemo(JSON.parse(event.newValue)); } catch {}
    }
  };
  private saveDemo(): void {
    if (this.snapshot) {
      this.demoStates[this.snapshot.fixtureMatchId] = this.snapshot.state;
      this.snapshot.demoStates = this.demoStates; this.snapshot.demoMatches = this.matches; this.snapshot.categoryProgress = this.progress;
      localStorage.setItem(this.demoKey, JSON.stringify(this.snapshot));
    }
  }
  private demoStates: Record<number, Bout> = {};
  private get selectionKey(): string { return `bte-kudo-selected-${this.eventId}-${this.categoryId}`; }
  private publishSelection(): void { if (!this.display && !this.demo && this.selected) localStorage.setItem(this.selectionKey, String(this.selected)); }
  private receiveDemo(saved: Snapshot): void {
    this.snapshot = saved; this.selected = saved.fixtureMatchId;
    if (saved.demoMatches) this.matches = saved.demoMatches;
    this.progress = saved.categoryProgress; this.demoStates = saved.demoStates || {};
  }
  startDemo(): void {
    this.promptedRounds.clear(); this.alerted.clear();
    const fighter = (): Fighter => ({ koka: 0, doubleKoka: 0, yuko: 0, wazaAri: 0, ippon: 0, hansoku: 0, shikkaku: false, groundCount: 0, groundStartedAt: null });
    this.name = 'DEMO ? Tatami ' + (this.route.snapshot.queryParamMap.get('areaId') || '1');
    this.selected = 1;
    this.matches = kudoDemoCategory(); this.progress = kudoDemoProgress(this.matches); this.demoStates = {};
    this.demoKey = 'bte-kudo-demo-' + this.eventId + '-' + (this.route.snapshot.queryParamMap.get('areaId') || '1');
    this.snapshot = { fixtureMatchId: 1, revision: 0, serverTime: new Date().toISOString(), remainingMs: 180000,
      state: { groundCount: 0, groundStartedAt: null, aka: fighter(), shiro: fighter(), round: 1, isFinal: false, secondRoundEnabled: false, elapsedMs: 0, startedAt: null, status: 'DEMO', winner: null, decision: null, lastAction: '' } };
    if (this.display) {
      try { const saved = localStorage.getItem(this.demoKey); if (saved) this.receiveDemo(JSON.parse(saved)); } catch {}
    } else this.saveDemo();
    window.addEventListener('storage', this.demoListener);
  }
  private demoAction(action: string, side?: string, award?: string, seconds?: number): void {
    this.refreshDemoClock();
    const state = this.snapshot!.state;
    if (this.restRemaining() > 0) { this.error = 'Espere el minuto de descanso antes de continuar el encuentro.'; return; }
    if (action === 'START' && this.remaining() === 0) { this.error = 'El round terminó. Registre Hantei o prepare un desempate.'; return; }
    this.error = '';
    this.error = '';
    state.groundCount = this.groundCount(); state.groundStartedAt = this.groundStartedAt();
    state.aka.groundCount = state.shiro.groundCount = 0;
    state.aka.groundStartedAt = state.shiro.groundStartedAt = null;
    const f = side ? this.fighter(side) : undefined;
    const fields: Record<string, keyof Fighter> = { KOKA: 'koka', DOUBLE_KOKA: 'doubleKoka', YUKO: 'yuko', WAZA_ARI: 'wazaAri', IPPON: 'ippon' };
    const pause = () => {
      if (state.startedAt) state.elapsedMs += Math.max(0, this.now - Date.parse(state.startedAt));
      state.startedAt = null;
    };
    if (action === 'START' && !state.startedAt) { state.startedAt = new Date(this.now).toISOString(); state.status = 'En curso'; }
    if (action === 'PAUSE') { pause(); state.status = 'Pausado'; }
    if (action === 'SET_TIME') {
      state.elapsedMs = 180000 - seconds! * 1000;
      state.startedAt = null;
      state.status = seconds === 0 ? 'PENDING_DECISION' : 'Pausado';
    }
    if (f && award && fields[award]) {
      const key = fields[award];
      (f as any)[key] = Math.max(0, Number(f[key]) + (action === 'REMOVE_AWARD' ? -1 : 1));
    }
    if (f && action === 'ADD_HANSOKU') f.hansoku = Math.min(4, f.hansoku + 1);
    if (f && action === 'REMOVE_HANSOKU') f.hansoku = Math.max(0, f.hansoku - 1);
    if (f && action === 'SHIKKAKU') f.shikkaku = true;
    if (f && action === 'REMOVE_SHIKKAKU') f.shikkaku = false;
    if (action === 'GROUND_START') {
      if (!state.startedAt || state.winner || this.remaining() === 0) { this.error = 'Inicie el combate antes de Ne-waza.'; return; }
      if (state.groundStartedAt) { this.error = 'Ne-waza ya está activo en este encuentro.'; return; }
      if (state.groundCount >= 2) { this.error = 'Límite de Ne-waza alcanzado para este encuentro (máximo 2)'; return; }
      state.groundCount++; state.groundStartedAt = new Date(this.now).toISOString(); this.notice = ''; this.error = '';
    }
    if (action === 'GROUND_END') { state.groundStartedAt = null; this.notice = ''; }
    if (f && action === 'KNOCKDOWN') {
      if ((seconds || 0) >= 10) f.ippon++; else if ((seconds || 0) >= 6) f.wazaAri++; else if ((seconds || 0) >= 4) f.yuko++; else f.koka++;
    }
    if (action === 'NEXT_ROUND' || action === 'SECOND_ROUND') {
      if (state.round >= 3 || this.remaining() > 0 || state.winner) { this.error = 'Solo puede preparar un desempate al terminar sin ganador; máximo 3 rounds.'; return; }
      state.groundStartedAt = null;
      pause(); state.round++; state.elapsedMs = 0; state.status = 'REST'; state.restEndsAt = new Date(this.now + 60000).toISOString();
      if (!this.config.preserveScores) for (const fighter of [state.aka, state.shiro]) {
        fighter.koka = 0; fighter.doubleKoka = 0; fighter.yuko = 0; fighter.wazaAri = 0; fighter.ippon = 0;
      }
      if (!this.config.preserveFouls) for (const fighter of [state.aka, state.shiro]) { fighter.hansoku = 0; fighter.shikkaku = false; }
    }
    state.winner = state.aka.ippon || state.shiro.hansoku >= 4 || state.shiro.shikkaku ? 'AKA'
      : state.shiro.ippon || state.aka.hansoku >= 4 || state.aka.shikkaku ? 'SHIRO' : null;
    state.decision = state.winner ? 'Demo' : null;
    if (action === 'HANTEI') { state.winner = side!; state.decision = 'HANTEI'; }
    if (action === 'CLEAR_HANTEI') { state.winner = null; state.decision = null; }
    if (state.winner) { pause(); state.groundStartedAt = null; }
    state.lastAction = 'DEMO ? ' + action;
    this.snapshot!.revision++;
    this.saveDemo();
  }
  eventId = 0; categoryId = 0; base = ''; display = false; busy = false; error = ''; notice = ''; name = '';
  matches: any[] = []; selected = 0; snapshot?: Snapshot;
  hasTwoSides(match: any): boolean { return !!match.choices?.[0] && !!match.choices?.[1]; }
  progress?: CategoryProgress;
  get canAdvance(): boolean {
    const row = this.matches.find(m => m.id === this.selected);
    const winner = this.snapshot?.state.winner;
    const winnerId = winner ? row?.choices[winner === 'AKA' ? 0 : 1]?.id : undefined;
    return !this.busy && !!winnerId && this.snapshot?.officialWinnerCompetitorId === winnerId && !!this.progress?.readyMatchIds.some(id => id !== this.selected);
  }
  async nextEncounter(): Promise<void> {
    if (!this.canAdvance || this.display) return;
    if (this.demo) {
      this.selected = this.progress!.readyMatchIds.find(id => id !== this.selected)!; this.select();
    } else await this.load(true);
  }
  medalLabel(medal: string): string { return ({gold: 'Oro', silver: 'Plata', bronze: 'Bronce'} as Record<string,string>)[medal] || medal; }
  config = { revision: 0, secondRoundEnabled: false, preserveScores: true, preserveFouls: true };
  readonly sides = ['AKA', 'SHIRO'] as const;
  readonly awards = [{ code: 'KOKA', name: 'Koka' }, { code: 'DOUBLE_KOKA', name: 'Double Koka' }, { code: 'YUKO', name: 'Yuko' }, { code: 'WAZA_ARI', name: 'Waza-ari' }, { code: 'IPPON', name: 'Ippon' }];
  readonly reasons = [{ code: 'HEAD_TO_FLOOR', name: 'Cabeza contra el suelo' }, { code: 'SLAM', name: 'Azotar en derribo' }, { code: 'SPINE_FROM_GROUND', name: 'Golpear columna desde el suelo' }, { code: 'GROUND_HEADBUTT', name: 'Cabezazo en el suelo' }, { code: 'ILLEGAL_SUBMISSION', name: 'Luxación / asfixia prohibida' }, { code: 'DISRESPECT', name: 'Falta de respeto grave' }, { code: 'ENTRY_DELAY_50', name: 'Retraso de ingreso ≥ 50 segundos' }];
  reason: Record<string, string> = { AKA: '', SHIRO: '' };
  incapacity: Record<string, number> = { AKA: 2, SHIRO: 2 };
  editedTime = '';
  now = Date.now(); private offset = 0; private poll?: ReturnType<typeof setInterval>; private tick?: ReturnType<typeof setInterval>;
  private alerted = new Set<string>(); private audio?: AudioContext; private destroyed = false;
  private promptedRounds = new Set<string>(); private roundDialogOpen = false;
  constructor(private route: ActivatedRoute, private http: HttpClient, private fixtures: ScoreboardFixtureResultsService, private dialogs: MatDialog) {}
  ngOnInit(): void {
    this.eventId = Number(this.route.snapshot.paramMap.get('eventId')); this.categoryId = Number(this.route.snapshot.paramMap.get('categoryId'));
    this.display = this.route.snapshot.queryParamMap.get('display') === '1'; this.selected = Number(this.route.snapshot.queryParamMap.get('matchId'));
    this.base = `${environment.apiBaseUrl}/scoreboard/kudo/events/${this.eventId}/categories/${this.categoryId}`;
    this.demo = this.route.snapshot.queryParamMap.get('demo') === '1';
    if (this.demo) this.startDemo(); else { window.addEventListener('storage', this.demoListener); void this.load(); }
    this.tick = setInterval(() => { this.now = Date.now() + this.offset; this.refreshDemoClock(); this.checkGround(); void this.promptNextRound(); }, 100);
    this.poll = setInterval(() => { if (!this.demo && this.selected && !this.busy) void this.refresh(); }, 1000);
  }
  private data(x: any): any { return x?.data ?? x?.Data ?? x; }
  private async get(path: string): Promise<any> { return this.data(await firstValueFrom(this.http.get(this.base + path))); }
  async load(advance = false): Promise<void> {
    if (this.demo) return;
    this.busy = true;
    try {
      const [data, config, progress] = await Promise.all([this.fixtures.load(this.eventId, this.categoryId), this.get('/configuration'), this.get('/progress')]);
      this.name = data.name; this.matches = data.rows.filter(x => x.choices.length === 2); this.config = config;
      this.progress = progress;
      if (advance || !this.matches.some(x => x.id === this.selected)) this.selected = progress.readyMatchIds.find((id: number) => this.matches.some(x => x.id === id)) || this.matches[0]?.id || 0;
      if (this.selected) await this.refresh(); else this.error = 'No hay encuentros con ambos competidores definidos en la llave oficial.';
      this.publishSelection();
    } catch (e: any) { this.failure(e); } finally { this.busy = false; }
  }
  async refresh(): Promise<void> {
    if (this.demo) return;
    const id = this.selected;
    try {
      const [value, progress]: [Snapshot, CategoryProgress] = await Promise.all([this.get(`/matches/${id}`), this.get('/progress')]);
      if (!this.destroyed && id === this.selected && (!this.snapshot || this.snapshot.fixtureMatchId !== id || value.revision >= this.snapshot.revision)) {
        this.snapshot = value; this.progress = progress; this.offset = Date.parse(value.serverTime) - Date.now(); this.error = '';
      }
    } catch (e: any) { this.failure(e); }
  }
  select(): void {
    if (this.demo) {
      if (this.snapshot) this.demoStates[this.snapshot.fixtureMatchId] = this.snapshot.state;
      const fighter = (): Fighter => ({ koka: 0, doubleKoka: 0, yuko: 0, wazaAri: 0, ippon: 0, hansoku: 0, shikkaku: false, groundCount: 0, groundStartedAt: null });
      this.snapshot = { fixtureMatchId: this.selected, revision: 0, serverTime: new Date().toISOString(), remainingMs: 180000,
        officialWinnerCompetitorId: this.matches.find(m => m.id === this.selected)?.competitorId,
        state: this.demoStates[this.selected] || { aka: fighter(), shiro: fighter(), groundCount: 0, groundStartedAt: null, round: 1,
          isFinal: this.selected === 3, secondRoundEnabled: this.config.secondRoundEnabled, elapsedMs: 0, startedAt: null,
          status: 'DEMO', winner: null, decision: null, lastAction: '' } };
      this.notice = ''; this.error = ''; this.saveDemo();
    } else { this.snapshot = undefined; void this.refresh().then(() => this.publishSelection()); }
  }
  // The API keeps its existing side identifiers; Kudo presents the blue side as AO.
  sideLabel(side: string): string { return side === 'AKA' ? 'AO' : side; }
  fighter(side: string): Fighter { return side === 'AKA' ? this.snapshot!.state.aka : this.snapshot!.state.shiro; }
  competitor(side: string): string {
    const name = this.matches.find(x => x.id === this.selected)?.choices[side === 'AKA' ? 0 : 1]?.name;
    return name || this.sideLabel(side);
  }
  total(side: string): number {
    const f = this.fighter(side), rival = this.fighter(side === 'AKA' ? 'SHIRO' : 'AKA');
    return f.koka + 2 * f.doubleKoka + 2 * f.yuko + 4 * f.wazaAri + (rival.hansoku >= 2 ? 2 : 0) + (rival.hansoku >= 3 ? 4 : 0);
  }
  remaining(): number {
    const s = this.snapshot?.state; return s ? Math.max(0, 180000 - s.elapsedMs - (s.startedAt ? Math.max(0, this.now - Date.parse(s.startedAt)) : 0)) : 180000;
  }
  clock(ms: number): string { const sec = Math.ceil(ms / 1000); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; }
  restRemaining(): number {
    const end = this.snapshot?.state.restEndsAt;
    return end ? Math.max(0, Date.parse(end) - this.now) : 0;
  }
  private refreshDemoClock(): void {
    if (!this.demo || this.display || !this.snapshot) return;
    const s = this.snapshot.state;
    let changed = false;
    if (s.restEndsAt && this.restRemaining() === 0) { s.restEndsAt = null; s.status = 'READY'; changed = true; }
    if (s.startedAt && this.remaining() === 0) {
      s.elapsedMs = 180000; s.startedAt = null; s.groundStartedAt = null; s.status = 'PENDING_DECISION'; changed = true;
    }
    if (changed) this.saveDemo();
  }
  async promptNextRound(manual = false): Promise<void> {
    const s = this.snapshot?.state;
    if (!s || this.display || this.busy || this.roundDialogOpen || s.winner || this.restRemaining() > 0) return;
    const key = `${this.selected}:${s.round}`;
    if (this.remaining() > 0) { this.promptedRounds.delete(key); return; }
    if (s.round >= 3 || (!manual && this.promptedRounds.has(key))) return;
    this.promptedRounds.add(key); this.roundDialogOpen = true;
    const id = this.selected, round = s.round;
    try {
      const answer = await firstValueFrom(this.dialogs.open(KudoNextRoundDialog, { data: { round }, width: '560px' }).afterClosed());
      if (this.destroyed || id !== this.selected || round !== this.snapshot?.state.round || this.remaining() > 0 || this.snapshot?.state.winner) return;
      if (answer === true) await this.act('NEXT_ROUND');
      else if (answer === false) await this.hantei();
    } finally { this.roundDialogOpen = false; }
  }
  async setTime(): Promise<void> {
    if (this.display || this.busy || !this.snapshot || this.snapshot.state.startedAt || this.snapshot.state.winner) return;
    const value = /^(\d{1,2}):([0-5]\d)$/.exec(this.editedTime.trim());
    if (!value) { this.error = 'Ingrese el tiempo restante en formato mm:ss (00:00 a 99:59).'; return; }
    this.error = '';
    await this.act('SET_TIME', undefined, undefined, undefined, Number(value[1]) * 60 + Number(value[2]));
    if (!this.error) this.editedTime = '';
  }
  async adjustTime(delta: -1 | 1): Promise<void> {
    if (this.display || this.busy || !this.snapshot || this.snapshot.state.startedAt || this.snapshot.state.winner) return;
    const seconds = Math.ceil(this.remaining() / 1000) + delta;
    if (seconds < 0 || seconds > 5999) return;
    this.error = '';
    await this.act('SET_TIME', undefined, undefined, undefined, seconds);
  }
  groundCount(): number {
    const s = this.snapshot?.state;
    return s ? Math.max(s.groundCount ?? 0, (s.aka.groundCount || 0) + (s.shiro.groundCount || 0)) : 0;
  }
  groundStartedAt(): string | null {
    const s = this.snapshot?.state;
    if (!s) return null;
    return s.groundStartedAt || [s.aka.groundStartedAt, s.shiro.groundStartedAt].filter((t): t is string => !!t).sort()[0] || null;
  }
  ground(): number { const start = this.groundStartedAt(); return start ? Math.max(0, 30000 - Math.max(0, this.now - Date.parse(start))) : 30000; }
  private checkGround(): void {
    if (!this.snapshot) return;
    const start = this.groundStartedAt();
    const key = `${this.selected}:${start}`;
    if (start && this.ground() === 0 && !this.alerted.has(key)) {
      this.alerted.add(key); this.notice = 'Ne-waza: 30 segundos. El cronómetro principal continúa. Pausa manual del combate.';
      if (this.audio && !this.display) { const o = this.audio.createOscillator(); o.connect(this.audio.destination); o.frequency.value = 880; o.start(); o.stop(this.audio.currentTime + 0.6); }
    }
  }
  async act(action: string, side?: string, award?: string, reason?: string, seconds?: number): Promise<void> {
    if (this.display || this.busy || !this.snapshot) return;
    if (this.demo) { this.demoAction(action, side, award, seconds); return; }
    if (!this.audio) this.audio = new AudioContext(); void this.audio.resume(); this.busy = true; this.error = '';
    try {
      this.snapshot = this.data(await firstValueFrom(this.http.post(this.base + `/matches/${this.selected}/actions`, {
        operationId: crypto.randomUUID(), expectedRevision: this.snapshot.revision, action, side, award, reason, seconds
      })));
      this.offset = Date.parse(this.snapshot!.serverTime) - Date.now();
    } catch (e: any) { this.failure(e); } finally { this.busy = false; }
  }
  async hantei(): Promise<void> {
    const side = await firstValueFrom(this.dialogs.open(KudoHanteiDialog, { data: { aka: this.competitor('AKA'), shiro: this.competitor('SHIRO') }, width: '560px' }).afterClosed());
    if (side) await this.act('HANTEI', side);
  }
  async configure(): Promise<void> {
    if (this.demo) {
      if (this.display || !this.snapshot) return;
      this.snapshot.state.secondRoundEnabled = this.config.secondRoundEnabled;
      this.saveDemo(); this.notice = 'Configuracion aplicada a la demo.'; return;
    }
    if (this.busy || this.display) return; this.busy = true;
    try { this.config = this.data(await firstValueFrom(this.http.put(this.base + '/configuration', this.config))); this.notice = 'Configuración guardada. Se aplica a combates sin acciones registradas.'; if (this.snapshot?.revision === 0) await this.refresh(); }
    catch (e: any) { this.failure(e); } finally { this.busy = false; }
  }
  async publish(): Promise<void> {
    if (this.demo) {
      if (this.display || this.busy || !this.snapshot?.state.winner) return;
      try {
        const row = this.matches.find(m => m.id === this.selected);
        const winner = row.choices[this.snapshot.state.winner === 'AKA' ? 0 : 1].id;
        this.matches = confirmKudoDemo(this.matches, this.selected, winner); this.progress = kudoDemoProgress(this.matches);
        this.snapshot.officialWinnerCompetitorId = winner;
        this.notice = this.progress.complete ? 'Categoría demo finalizada.' : 'Resultado demo confirmado. Puede avanzar al siguiente encuentro.';
        this.saveDemo();
      } catch (e) { this.failure(e); }
      return;
    }
    if (this.busy || !this.snapshot || this.display) return; this.busy = true;
    try {
      const value = this.data(await firstValueFrom(this.http.post(this.base + `/matches/${this.selected}/confirm`, {
        operationId: crypto.randomUUID(), expectedRevision: this.snapshot.revision, action: 'CONFIRM'
      })));
      this.snapshot = value.match;
      await this.load();
      this.notice = this.progress?.complete ? 'Categoría finalizada. Podio oficial disponible.' : 'Resultado confirmado. Puede avanzar al siguiente encuentro.';
      const issues = (value.medalTable || []).filter((x: any) => x.categoryId === this.categoryId && x.status !== 'ready');
      if (issues.length) this.dialogs.open(KudoNoticeDialog, { data: issues.map((x: any) => x.message).join('\n') });
    } catch (e: any) { this.failure(e); } finally { this.busy = false; }
  }
  openDisplay(): void { const url = new URL(location.href); url.searchParams.set('matchId', String(this.selected)); url.searchParams.set('display', '1'); window.open(url.toString(), '_blank', 'noopener'); }
  private failure(e: any): void { this.error = e.error?.message || e.error?.detail || e.message || 'No se pudo guardar la acción. Actualice antes de continuar.'; }
  ngOnDestroy(): void { this.destroyed = true; window.removeEventListener('storage', this.demoListener); clearInterval(this.poll); clearInterval(this.tick); void this.audio?.close(); }
}
