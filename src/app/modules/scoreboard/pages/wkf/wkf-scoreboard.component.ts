import { CommonModule } from '@angular/common';
import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { environment } from '../../../../../environments/environment';
import { ScoreboardApiService } from '../../services/scoreboard-api.service';
import { ScoreboardMatchState } from '../../models/scoreboard.models';
import { WkfAuditEntry, WkfAuditService } from '../../services/wkf-audit.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { WkfCategoriesService, WkfCategoryOption } from '../../services/wkf-categories.service';

interface Fighter {
  yuko: number; wazaAri: number; ippon: number; penalty: number; senshu: boolean; kiken: boolean;
  kata: string; judges: (number | null)[]; remainingMs: number; total: number; kataTotal: number;
}
interface WkfState {
  modality: 'KATA' | 'KUMITE'; aka: Fighter; ao: Fighter; remainingMs: number;
  startedAt: string | null; activeSide: 'AKA' | 'AO' | null; displaySide: 'AKA' | 'AO' | null; bunkai: boolean; showLogo: boolean;
  medicalMs: number; medicalStartedAt: string | null; winner: string | null; decision: string | null;
  akaFlags: number; aoFlags: number; status: string;
}
interface Snapshot { revision: number; state: WkfState; serverTime: string }
type Side = 'AKA' | 'AO';

@Component({
  standalone: true, imports: [CommonModule, FormsModule, RouterLink, MatButtonModule],
  templateUrl: './wkf-scoreboard.component.html', styleUrls: ['./wkf-scoreboard.component.scss']
})
export class WkfScoreboardComponent implements OnInit, OnDestroy {
  eventId = 0; categoryId = 0; areaId = 1; selected = ''; display = false;
  matches: ScoreboardMatchState[] = []; snapshot?: Snapshot; error = ''; busy = false;
  katas: string[] = []; seconds = 120; flags = 3; now = Date.now(); private offset = 0;
  drafts: Record<Side, { kata: string; judges: (number | null)[]; seconds: number }> = {
    AKA: { kata: '', judges: [null, null, null, null, null], seconds: 300 },
    AO: { kata: '', judges: [null, null, null, null, null], seconds: 300 }
  };
  readonly sides: Side[] = ['AKA', 'AO'];
  readonly awards = [{ action: 'YUKO', field: 'yuko', label: 'Yuko · 1' }, { action: 'WAZA_ARI', field: 'wazaAri', label: 'Waza-ari · 2' }, { action: 'IPPON', field: 'ippon', label: 'Ippon · 3' }];
  readonly penalties = ['Sin sanción', 'CH1', 'CH2', 'CH3', 'Hansoku Chui', 'Hansoku'];
  readonly penaltyLabels = ['CH1', 'CH2', 'CH3', 'HC', 'H'];
  trackJudge(index: number): number { return index; }
  private tick?: ReturnType<typeof setInterval>; private poll?: ReturnType<typeof setInterval>;
  auditEntries: WkfAuditEntry[] = [];
  storageError = '';
  apiOnline = false;
  private pending?: WkfAuditEntry;
  private autoRetry = true;
  private readonly reconnect = () => { if (!this.display) void this.send(); };
  private storageKey = '';
  private displayChannel?: BroadcastChannel;
  private displayLoading = false;
  categories: WkfCategoryOption[] = [];
  loadingCategories = false;
  categoryError = '';
  constructor(private route: ActivatedRoute, private http: HttpClient, private api: ScoreboardApiService, private audit: WkfAuditService, private auth: AuthService, private zone: NgZone, private categoryOptions: WkfCategoriesService) {}
  get categoryCompleted(): boolean { return this.matches.length > 0 && this.matches.every(match => match.status === 'CONFIRMED'); }
  get nextCategory(): WkfCategoryOption | undefined {
    const index = this.categories.findIndex(category => category.id === this.categoryId);
    return index < 0 ? undefined : this.categories.slice(index + 1).find(category => category.hasFixture && !category.completed);
  }
  private updateCategoryCompletion(): void {
    this.categories = this.categories.map(category => category.id === this.categoryId
      ? { ...category, completed: this.categoryCompleted, hasFixture: this.matches.length > 0, verified: true } : category);
  }
  async loadCategories(): Promise<void> {
    this.loadingCategories = true;
    try {
      const day = Number(this.route.snapshot.queryParamMap.get('day')) || 1;
      this.categories = await this.categoryOptions.load(this.eventId, this.areaId, day);
      if (!this.categories.some(category => category.id === this.categoryId)) {
        this.categories.unshift({ id: this.categoryId, label: this.match?.categoryName || `Categoría ${this.categoryId}`,
          completed: this.categoryCompleted, hasFixture: this.matches.length > 0, verified: true });
      }
      this.updateCategoryCompletion(); this.categoryError = '';
    } catch { this.categoryError = 'No se pudieron consultar las categorías del cronograma. Puede reintentar la consulta.'; }
    finally { this.loadingCategories = false; }
  }
  async changeCategory(categoryId: number): Promise<void> {
    if (this.display || this.busy || this.pending || this.storageError || categoryId === this.categoryId) return;
    if (!this.categories.some(category => category.id === categoryId && category.hasFixture)) return;
    this.busy = true;
    await this.logInterface('SELECT_CATEGORY', categoryId);
    if (this.storageError) { this.busy = false; return; }
    this.navigateCategory(categoryId);
  }
  async retryCategories(): Promise<void> { await this.logInterface('RELOAD_CATEGORIES'); await this.loadCategories(); }
  private navigateCategory(categoryId: number, matchId?: string): void {
    // Reloading the category also restores its own durable outbox and audit scope.
    const url = new URL(location.href);
    url.pathname = url.pathname.replace(/\/categories\/\d+\/wkf\/?$/, `/categories/${categoryId}/wkf`);
    url.searchParams.delete('matchId');
    if (matchId) url.searchParams.set('matchId', matchId);
    url.searchParams.set('areaId', String(this.areaId));
    location.assign(url.toString());
  }
  private connectDisplay(): void {
    if (typeof BroadcastChannel === 'undefined') return;
    this.displayChannel = new BroadcastChannel(`bte-wkf-display-${this.eventId}-${this.areaId}`);
    this.displayChannel.onmessage = event => this.zone.run(() => {
      if (!this.display && event.data?.type === 'REQUEST_MATCH') this.announceDisplay();
      if (this.display && event.data?.type === 'MATCH_UPDATED' && typeof event.data.matchId === 'string') {
        const categoryId = event.data.categoryId ?? this.categoryId;
        if (!Number.isSafeInteger(categoryId) || categoryId <= 0) return;
        if (categoryId !== this.categoryId) this.navigateCategory(categoryId, event.data.matchId);
        else void this.refreshDisplay(event.data.matchId);
      }
    });
    if (this.display) this.displayChannel.postMessage({ type: 'REQUEST_MATCH' });
  }
  private announceDisplay(): void {
    if (!this.display && this.snapshot && this.selected) this.displayChannel?.postMessage({ type: 'MATCH_UPDATED', categoryId: this.categoryId, matchId: this.selected });
  }
  private async refreshDisplay(matchId: string): Promise<void> {
    if (!this.display) return;
    const changed = matchId !== this.selected;
    this.selected = matchId;
    if (changed) this.snapshot = undefined;
    try {
      // Refresh official competitors too: a confirmation can fill the next fixture.
      const ctx = await firstValueFrom(this.api.getFixtureContext(this.eventId, this.areaId, this.categoryId).pipe(timeout(10000)));
      if (this.selected !== matchId) return;
      const matches = ctx.matches.filter(m => m.associationCode === 'WKF' && ['KATA', 'KUMITE'].includes(m.modality));
      if (!matches.some(m => m.matchId === matchId)) throw new Error('El encuentro no está en la llave WKF vigente.');
      this.matches = matches;
      await this.load(false);
    } catch (e) { this.fail(e); }
  }
  get base(): string { return `${environment.apiBaseUrl}/v1/scoreboard/events/${this.eventId}/categories/${this.categoryId}/wkf`; }
  get state(): WkfState | undefined { return this.snapshot?.state; }
  get match(): ScoreboardMatchState | undefined { return this.matches.find(m => m.matchId === this.selected); }
  get locked(): boolean { return this.busy || !!this.storageError || this.state?.status === 'CONFIRMED'; }
  get matchAudit(): WkfAuditEntry[] { return this.auditEntries.filter(x => x.matchId === this.selected).slice().reverse(); }
  get pendingCount(): number { return this.auditEntries.filter(x => x.status === 'PENDING').length; }
  auditStatus(entry: WkfAuditEntry): string {
    return { PENDING: 'Pendiente de API', SYNCED: 'Confirmada por API', REJECTED: 'Rechazada por API', CONFLICT: 'Conflicto: revisar', LOCAL: 'Acción de interfaz (local)' }[entry.status];
  }
  private get contextKey(): string { return `context-${this.eventId}-${this.categoryId}-${this.areaId}`; }
  private snapshotKey(matchId: string): string { return `snapshot-${this.eventId}-${this.categoryId}-${matchId}`; }
  private async refreshAudit(): Promise<void> { this.auditEntries = await this.audit.entries(this.eventId, this.categoryId); }
  fighter(side: Side): Fighter { return side === 'AKA' ? this.state!.aka : this.state!.ao; }
  competitor(side: Side) { return side === 'AKA' ? this.match?.aka : this.match?.shiro; }
  name(side: Side): string { return this.competitor(side)?.name || side; }
  async ngOnInit(): Promise<void> {
    this.eventId = Number(this.route.snapshot.paramMap.get('eventId'));
    this.categoryId = Number(this.route.snapshot.paramMap.get('categoryId'));
    this.areaId = Number(this.route.snapshot.queryParamMap.get('areaId')) || 1;
    this.display = this.route.snapshot.queryParamMap.get('display') === '1';
    this.selected = this.route.snapshot.queryParamMap.get('matchId') || '';
    this.storageKey = `bte-wkf-pending-${this.eventId}-${this.categoryId}`;
    if (!this.display) {
      try {
        await this.refreshAudit();
        const saved = JSON.parse(sessionStorage.getItem(this.storageKey) || 'null');
        if (saved?.matchId && saved?.operation && !this.auditEntries.some(x => x.operationId === saved.operation.operationId)) {
          await this.audit.enqueue({ operationId: saved.operation.operationId, eventId: this.eventId, categoryId: this.categoryId,
            matchId: saved.matchId, operation: saved.operation, occurredAt: new Date().toISOString(), status: 'PENDING', attempts: 0 });
        }
        sessionStorage.removeItem(this.storageKey);
        await this.refreshAudit();
        this.pending = this.auditEntries.find(x => x.status === 'PENDING');
        if (this.pending) this.selected = this.pending.matchId;
      } catch (e) { this.storageError = 'No se pudo abrir el historial local. No se enviarán acciones sin registro.'; this.fail(e); }
    }
    try {
      try {
        const [ctx, catalog] = await Promise.all([
          firstValueFrom(this.api.getFixtureContext(this.eventId, this.areaId, this.categoryId).pipe(timeout(10000))),
          firstValueFrom(this.http.get<{ data: { katas: string[] } }>(`${this.base}/catalog`).pipe(timeout(10000)))
        ]);
        this.matches = ctx.matches.filter(m => m.associationCode === 'WKF' && ['KATA', 'KUMITE'].includes(m.modality));
        this.katas = catalog.data.katas;
        if (!this.display) await this.audit.cache(this.contextKey, { matches: this.matches, katas: this.katas });
      } catch (e) {
        const cached = await this.audit.cached<{ matches: ScoreboardMatchState[]; katas: string[] }>(this.contextKey);
        if (!cached) throw e;
        this.matches = cached.matches; this.katas = cached.katas; this.fail(e);
      }
      if (!this.pending && !this.matches.some(m => m.matchId === this.selected)) this.selected = this.matches.find(m => m.status !== 'CONFIRMED' && m.aka && m.shiro)?.matchId || this.matches[0]?.matchId || '';
      if (!this.selected) throw new Error('La categoría no tiene una llave WKF guardada.');
      await this.load(true);
      if (!this.display) void this.loadCategories();
      this.connectDisplay();
      this.announceDisplay();
      if (this.pending) this.error = 'Hay una acción guardada en el navegador pendiente de confirmación por la API.';
      this.tick = setInterval(() => {
        this.now = Date.now() + this.offset;
        if (!this.display && !this.busy && !this.pending && this.state?.startedAt && this.clockMs() === 0) void this.act(this.state.modality === 'KATA' ? 'PAUSE' : 'FINISH');
      }, 10);
      this.poll = setInterval(() => {
        if (this.busy) return;
        if (this.pending) { if (this.autoRetry && navigator.onLine) void this.send(); }
        else if (!this.displayLoading) {
          this.displayLoading = true;
          void this.load(false).finally(() => { this.displayLoading = false; });
        }
      }, this.display ? 1000 : 5000);
      window.addEventListener('online', this.reconnect);
      if (this.pending && !this.storageError && navigator.onLine) void this.send();
    } catch (e) { this.fail(e); }
  }
  async load(drafts: boolean): Promise<void> {
    if (!this.selected) return;
    const matchId = this.selected;
    try {
      const response = await firstValueFrom(this.http.get<{ data: Snapshot }>(`${this.base}/matches/${matchId}`).pipe(timeout(10000)));
      if (this.selected !== matchId || (!drafts && (this.busy || this.pending)) || (this.snapshot && response.data.revision < this.snapshot.revision)) return;
      this.hydrate(response.data, drafts); this.error = ''; this.apiOnline = true;
      if (!this.display) await this.audit.cache(this.snapshotKey(matchId), { snapshot: response.data, serverOffsetMs: this.offset });
    } catch (e) {
      this.apiOnline = false; this.fail(e);
      if (!this.snapshot) {
        const cached = await this.audit.cached<{ snapshot: Snapshot; serverOffsetMs: number }>(this.snapshotKey(matchId));
        const restored = cached?.snapshot ?? (this.pending?.before as Snapshot | undefined);
        const savedOffset = cached?.serverOffsetMs ?? this.pending?.serverOffsetMs ?? 0;
        if (restored && this.selected === matchId) this.hydrate({ ...restored, serverTime: new Date(Date.now() + savedOffset).toISOString() }, drafts);
      }
    }
  }
  private hydrate(s: Snapshot, drafts: boolean): void {
    this.snapshot = s; this.offset = Date.parse(s.serverTime) - Date.now(); this.now = Date.now() + this.offset;
    if (drafts) {
      for (const side of this.sides) { const f = this.fighter(side); this.drafts[side] = { kata: f.kata, judges: [...f.judges], seconds: f.remainingMs / 1000 }; }
      this.seconds = s.state.remainingMs / 1000;
    }
  }
  async select(): Promise<void> { if (this.pending) return; this.snapshot = undefined; await this.logInterface('SELECT_MATCH'); await this.load(true); this.announceDisplay(); }
  async act(action: string, side?: Side, value?: number): Promise<void> {
    if (this.locked || this.display || !this.snapshot || this.pending) return;
    const d = side ? this.drafts[side] : undefined;
    this.busy = true;
    try {
      const occurredAt = new Date().toISOString();
      const actor = this.auth.getCurrentUser();
      const operation = { operationId: crypto.randomUUID(), revision: this.snapshot.revision, action, side, value,
        kata: d?.kata, judges: d ? [...d.judges] : undefined, clientOccurredAt: occurredAt };
      const entry: WkfAuditEntry = { operationId: operation.operationId, eventId: this.eventId, categoryId: this.categoryId,
        matchId: this.selected, occurredAt, operation, status: 'PENDING', attempts: 0, before: structuredClone(this.snapshot),
        actorId: actor?.id, actorName: actor?.nombreCompleto, serverOffsetMs: this.offset };
      await this.audit.enqueue(entry);
      this.pending = entry; this.autoRetry = true;
      await this.refreshAudit();
    } catch (e) { this.storageError = 'No se pudo registrar la acción localmente. Se bloqueó el envío a la API.'; this.fail(e); }
    finally { this.busy = false; }
    await this.send();
  }
  async send(): Promise<void> {
    if (!this.pending || this.busy || this.display || this.storageError) return;
    this.busy = true;
    const entry = this.pending;
    if (entry.actorId && entry.actorId !== this.auth.getCurrentUser()?.id) {
      this.error = 'La acción pendiente pertenece a otro operador. Inicie sesión con ese usuario para sincronizarla.';
      this.autoRetry = false; this.busy = false; return;
    }
    try {
      entry.attempts++; entry.lastAttemptAt = new Date().toISOString();
      await this.audit.save(entry);
      const r = await firstValueFrom(this.http.post<{ data: Snapshot }>(`${this.base}/matches/${entry.matchId}/actions`, entry.operation).pipe(timeout(10000)));
      if (!r.data?.state || typeof r.data.revision !== 'number') throw new Error('Respuesta de API sin confirmación válida.');
      const acknowledged: WkfAuditEntry = { ...entry, status: 'SYNCED', acknowledgedAt: new Date().toISOString(), serverRevision: r.data.revision, after: r.data, error: undefined };
      await this.audit.save(acknowledged);
      this.pending = undefined; this.apiOnline = true;
      this.hydrate(r.data, ['RESET', 'UNDO'].includes(entry.operation.action)); this.error = '';
      this.announceDisplay();
      await this.audit.cache(this.snapshotKey(entry.matchId), { snapshot: r.data, serverOffsetMs: this.offset });
      if (r.data.state.status === 'CONFIRMED') {
        const ctx = await firstValueFrom(this.api.getFixtureContext(this.eventId, this.areaId, this.categoryId));
        this.matches = ctx.matches.filter(m => m.associationCode === 'WKF' && ['KATA', 'KUMITE'].includes(m.modality));
        this.updateCategoryCompletion();
      }
    } catch (e: unknown) {
      this.fail(e);
      const status = (e as { status?: number }).status;
      // A response lost after commit is retried with the SAME operation ID.
      if (this.pending) {
        this.apiOnline = false;
        const permanent = status && status >= 400 && status < 500 && ![401, 403, 408, 429].includes(status);
        const updated: WkfAuditEntry = { ...entry, status: permanent ? (status === 409 ? 'CONFLICT' : 'REJECTED') : 'PENDING', error: this.error };
        try {
          await this.audit.save(updated);
          if (permanent) this.pending = undefined;
          else { this.pending = updated; this.autoRetry = status !== 401 && status !== 403; }
          if (status === 409) { const message = this.error; await this.load(true); this.error = message; }
        } catch { this.storageError = 'No se pudo actualizar el historial local. La operación se conserva para recuperar su estado.'; }
      }
    } finally {
      try { await this.refreshAudit(); } catch { this.storageError = 'No se pudo leer el historial local.'; }
      this.busy = false;
    }
  }
  get retry(): boolean { return !!this.pending && !this.busy; }
  reset(): void {
    if (window.confirm('¿Reiniciar los puntajes, sanciones y tiempos de este combate? Puede deshacer esta acción.')) void this.act('RESET');
    else void this.logInterface('RESET_CANCELLED');
  }
  async retryPending(): Promise<void> { await this.logInterface('RETRY_PENDING'); await this.send(); }
  clockMs(side?: Side): number {
    if (!this.state) return 0;
    const s = this.state; const target = side ?? s.activeSide;
    const value = s.modality === 'KATA' && target ? this.fighter(target).remainingMs : s.remainingMs;
    const runs = !!s.startedAt && (s.modality === 'KUMITE' || target === s.activeSide);
    return Math.max(0, value - (runs ? Math.max(0, this.now - Date.parse(s.startedAt!)) : 0));
  }
  get medical(): number { const s = this.state; return s ? Math.max(0, s.medicalMs - (s.medicalStartedAt ? Math.max(0, this.now - Date.parse(s.medicalStartedAt)) : 0)) : 0; }
  time(ms: number): string {
    const centiseconds = Math.ceil(Math.max(0, ms) / 10);
    const minutes = Math.floor(centiseconds / 6000);
    const seconds = Math.floor(centiseconds / 100) % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds % 100).padStart(2, '0')}`;
  }
  judgeWinner(index: number): string { const a = this.state!.aka.judges[index], b = this.state!.ao.judges[index]; return a == null || b == null || a === b ? '—' : a > b ? 'AKA' : 'AO'; }
  openDisplay(): void { void this.logInterface('OPEN_DISPLAY'); const url = new URL(location.href); url.searchParams.set('display', '1'); url.searchParams.set('matchId', this.selected); url.searchParams.set('areaId', String(this.areaId)); window.open(url.toString(), '_blank', 'noopener'); }
  private fail(e: unknown): void { const err = e as { error?: { message?: string }; message?: string }; this.error = err.error?.message || err.message || 'No fue posible actualizar la mesa WKF.'; }
  async logInterface(action: string, value?: number): Promise<void> {
    if (this.display || !this.selected) return;
    try {
      const operationId = crypto.randomUUID(), occurredAt = new Date().toISOString();
      const actor = this.auth.getCurrentUser();
      await this.audit.save({ operationId, eventId: this.eventId, categoryId: this.categoryId, matchId: this.selected,
        occurredAt, operation: { operationId, revision: this.snapshot?.revision ?? 0, action, value }, status: 'LOCAL', attempts: 0,
        actorId: actor?.id, actorName: actor?.nombreCompleto });
      await this.refreshAudit();
    } catch { this.storageError = 'No se pudo guardar el historial de interfaz.'; }
  }
  exportAudit(): void {
    void this.logInterface('EXPORT_AUDIT');
    const url = URL.createObjectURL(new Blob([JSON.stringify(this.auditEntries.filter(x => x.matchId === this.selected), null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `wkf-${this.eventId}-${this.categoryId}-${this.selected}-historial.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async exportApiAudit(): Promise<void> {
    await this.logInterface('EXPORT_API_AUDIT');
    try {
      const response = await firstValueFrom(this.http.get(`${this.base}/matches/${this.selected}/history`).pipe(timeout(10000)));
      const url = URL.createObjectURL(new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = `wkf-${this.eventId}-${this.categoryId}-${this.selected}-api.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { this.fail(e); }
  }
  ngOnDestroy(): void { clearInterval(this.tick); clearInterval(this.poll); window.removeEventListener('online', this.reconnect); this.displayChannel?.close(); }
}
