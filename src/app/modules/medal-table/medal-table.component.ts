import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Inject } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HttpTransportType } from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { MedalTableService, MedalState, MedalAward, MedalIssue, MedalBackup } from './medal-table.service';
import { MedalTableExportService } from './medal-table-export.service';

@Component({ standalone: true, imports: [MatDialogModule, MatButtonModule],
  template: `<h2 mat-dialog-title>Revisar podio</h2><mat-dialog-content>{{ message }}</mat-dialog-content>
    <mat-dialog-actions align="end"><button mat-button mat-dialog-close>Revisar configuración o resultados</button></mat-dialog-actions>` })
export class MedalIssueDialog {
  constructor(@Inject(MAT_DIALOG_DATA) public message: string) {}
}

@Component({ selector: 'bte-medal-table', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatCardModule, MatCheckboxModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule, MatDialogModule],
  templateUrl: './medal-table.component.html', styleUrls: ['./medal-table.component.scss'] })
export class MedalTableComponent implements OnInit, OnDestroy {
  events: { id: number; name: string }[] = [];
  state?: MedalState; eventId = 0; categoryId = 0; awards: MedalAward[] = [];
  display = false; offline = false; busy = false; error = ''; bronzeCount = 1; isPublic = false;
  communes: { id: number; name: string }[] = [];
  clubId = 0; clubName = ''; communeId = 0; logoBase64 = '';
  private hub?: HubConnection; private destroyed = false; private generation = 0;
  private subscriptions?: Subscription;
  constructor(private route: ActivatedRoute, public api: MedalTableService,
    private snack: MatSnackBar, private dialog: MatDialog, private exports: MedalTableExportService) {
    this.display = this.route.snapshot.data['display'] === true;
  }
  async ngOnInit(): Promise<void> {
    this.subscriptions = this.route.paramMap.subscribe(params => {
      const next = Number(params.get('eventId')) || 0;
      if (next !== this.eventId) { this.eventId = next; if (next) void this.load(); }
    });
    if (!this.display) {
      try { this.events = await this.api.get('events'); }
      catch (e) { this.report(e); }
      try { this.communes = await this.api.communes(); } catch (e) { this.report(e); }
    }
  }
  async load(): Promise<void> {
    const id = this.eventId; const generation = ++this.generation;
    this.state = undefined; this.offline = false; this.error = ''; this.awards = []; this.categoryId = 0;
    try {
      const state = await this.api.get<MedalState>(`${id}${this.display ? '/display' : ''}`);
      if (generation !== this.generation || this.destroyed) return;
      this.accept(state);
      if (!this.display) await this.api.cache(id, state).catch(e => this.report(e));
      await this.connect(id);
    } catch (e: any) {
      if (generation !== this.generation || this.destroyed) return;
      if (e.status === 0 && !this.display) {
        const local = this.api.local(id);
        if (local) { this.accept(local.state); this.offline = true; }
      } else if (e.status === 401 || e.status === 403) this.api.purge(id);
      this.report(e);
    }
  }
  selectCategory(): void {
    const existing = this.state?.podiums.find(x => x.categoryId === this.categoryId);
    const medals = ['gold', 'silver', ...Array.from({ length: this.state?.bronzeCount || 1 }, () => 'bronze')];
    let bronzeIndex = 0;
    this.awards = medals.map(medal => ({ medal, competitorId:
      existing?.awards.filter(x => x.medal === medal)[medal === 'bronze' ? bronzeIndex++ : 0]?.competitorId || 0 }));
  }
  get entrants() { return this.state?.entrants?.filter(x => x.categoryId === this.categoryId) || []; }
  get totals() {
    return (this.state?.ranking || []).reduce((s, r) => ({ gold: s.gold + r.gold, silver: s.silver + r.silver, bronze: s.bronze + r.bronze, total: s.total + r.total }), { gold: 0, silver: 0, bronze: 0, total: 0 });
  }
  get clubs() { return [...new Map(this.state?.entrants?.map(x => [x.academyId, x])).values()]; }
  selectClub(): void {
    const club = this.clubs.find(x => x.academyId === this.clubId);
    this.clubName = club?.academyName || ''; this.communeId = club?.communeId || 0; this.logoBase64 = '';
  }
  async selectLogo(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
    try {
      if (file.size > 1024 * 1024 || !['image/png', 'image/jpeg'].includes(file.type)) throw new Error('Seleccione un logo PNG o JPG de hasta 1 MB.');
      this.logoBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file);
      });
    } catch (e) { this.report(e); } finally { input.value = ''; }
  }
  async saveClub(): Promise<void> {
    if (confirm('Se actualizarán los datos maestros de esta academia, visibles también en otros campeonatos. ¿Guardar?'))
      await this.write(`clubs/${this.clubId}`, { name: this.clubName, communeId: this.communeId, logoBase64: this.logoBase64 || null }, 'PUT');
  }
  medalName(medal: string): string { return ({ gold: 'Oro', silver: 'Plata', bronze: 'Bronce' } as Record<string, string>)[medal]; }
  categoryName(id: number): string { return this.state?.categories?.find(x => x.categoryId === id)?.name || String(id); }
  async saveConfig(): Promise<void> {
    await this.write('configuration', { isPublic: this.isPublic, bronzeCount: this.bronzeCount }, 'PUT');
  }
  async savePodium(): Promise<void> {
    await this.write(`categories/${this.categoryId}/manual`, { awards: this.awards.map(x => ({ competitorId: x.competitorId, medal: x.medal })) }, 'PUT');
  }
  async removeManual(categoryId: number): Promise<void> {
    if (confirm('Se eliminará la corrección manual y volverá a mostrarse el resultado automático disponible.'))
      await this.write(`categories/${categoryId}/restore-automatic`);
  }
  async clear(): Promise<void> {
    if (confirm('¿Eliminar todas las correcciones manuales de este campeonato? Volverán a mostrarse los resultados automáticos disponibles.')) await this.write('clear-manual');
  }
  async synchronize(): Promise<void> {
    if (this.busy || this.offline) return;
    this.busy = true;
    try {
      const status = await this.api.write<MedalIssue[]>(this.eventId, 'synchronize', this.state?.revision || 0);
      const pending = status.filter(x => x.status !== 'ready');
      if (pending.length) this.dialog.open(MedalIssueDialog, { data: pending.map(x => `${this.categoryName(x.categoryId)}: ${x.message}`).join('\n'), width: '600px' });
      await this.load();
    } catch (e) { this.report(e); } finally { this.busy = false; }
  }
  async backup(): Promise<void> {
    try {
      let backup: MedalBackup;
      if (this.offline) {
        const local = this.api.local(this.eventId);
        const state = this.state;
        if (!local && !state) throw new Error('No existe información local para respaldar este campeonato.');
        backup = local?.backup ?? { formatVersion: 1, eventId: state!.event.id, exportedAt: new Date().toISOString(),
          revision: state!.revision, isPublic: state!.isPublic, bronzeCount: state!.bronzeCount,
          podiums: state!.podiums.filter(p => p.source === 'manual').map(p => ({ categoryId: p.categoryId,
            awards: p.awards.map(a => ({ competitorId: a.competitorId, medal: a.medal })) })) };
      } else backup = await this.api.get<MedalBackup>(`${this.eventId}/backup`);
      const exported = { ...backup, exportedAt: new Date().toISOString(),
        localCopy: this.offline, lastServerConfirmedAt: this.state?.serverConfirmedAt };
      this.api.download(new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' }), `medallero-${this.eventId}.json`);
    } catch (e: any) {
      if (e.status === 0 && (this.api.local(this.eventId) || this.state)) { this.offline = true; await this.backup(); }
      else this.report(e);
    }
  }
  async restore(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
    try {
      if (file.size > 4 * 1024 * 1024) throw new Error('El respaldo supera los 4 MB.');
      const backup = JSON.parse(await file.text()) as MedalBackup;
      if (backup.eventId !== this.eventId || backup.formatVersion !== 1) throw new Error('El respaldo no corresponde a este campeonato o versión.');
      if (confirm('¿Restaurar configuración y correcciones de este campeonato? Se reemplazarán las correcciones actuales.')) await this.write('restore', { backup });
    } catch (e) { this.report(e); } finally { input.value = ''; }
  }
  async exportReport(type: 'pdf' | 'excel'): Promise<void> {
    if (!this.state) return;
    try { await this.exports.export(this.state, type); } catch (e) { this.report(e); }
  }
  async fullscreen(): Promise<void> {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch { this.snack.open('El navegador no permitió pantalla completa. Puede utilizar F11.', 'Cerrar'); }
  }
  ngOnDestroy(): void { this.destroyed = true; this.generation++; this.subscriptions?.unsubscribe(); void this.hub?.stop(); }
  private accept(state: MedalState): void {
    this.state = state; this.bronzeCount = state.bronzeCount; this.isPublic = state.isPublic;
    this.categoryId = 0; this.awards = [];
    if (state.issues?.length) this.dialog.open(MedalIssueDialog, { data: state.issues.map(x => x.message).join('\n') });
  }
  private async write(path: string, payload = {}, method = 'POST'): Promise<void> {
    if (!this.state || this.busy || this.offline) return;
    this.busy = true;
    try {
      this.accept(await this.api.write<MedalState>(this.eventId, path, this.state.revision, payload, method));
      await this.api.cache(this.eventId, this.state!);
      this.snack.open('Medallero guardado.', 'Cerrar', { duration: 3000 });
    } catch (e: any) { if (e.status === 0) this.offline = true; this.report(e); }
    finally { this.busy = false; }
  }
  private async connect(id: number): Promise<void> {
    await this.hub?.stop(); if (this.destroyed || this.eventId !== id) return;
    const url = environment.apiBaseUrl.replace(/\/api\/?$/, '/hubs/medal-table');
    this.hub = new HubConnectionBuilder().withUrl(url, {
      accessTokenFactory: () => this.api.token(), transport: HttpTransportType.LongPolling
    }).withAutomaticReconnect().build();
    this.hub.on('MedalTableChanged', () => {
      // Refresh checks visibility on every invalidation and removes private data
      // immediately on a denied response. No private state arrives over SignalR.
      if (!this.busy) void this.refresh();
    });
    this.hub.onreconnected(async () => { await this.hub?.invoke('Subscribe', id); await this.refresh(); });
    try { await this.hub.start(); await this.hub.invoke('Subscribe', id); }
    catch { this.snack.open('No se pudo conectar la actualización en vivo. Utilice Actualizar.', 'Cerrar'); }
    await this.refresh();
  }
  private async refresh(): Promise<void> {
    const id = this.eventId;
    try {
      const state = await this.api.get<MedalState>(`${id}${this.display ? '/display' : ''}`);
      if (id !== this.eventId || this.destroyed) return;
      this.accept(state); this.offline = false;
      if (!this.display) await this.api.cache(id, state);
    } catch (e: any) {
      if (e.status === 401 || e.status === 403 || e.status === 404) { this.state = undefined; this.api.purge(id); }
      else this.offline = true;
      this.report(e);
    }
  }
  private report(error: any): void {
    this.error = error?.error?.message || error?.message || 'No se pudo completar la operación.';
    this.snack.open(this.error, 'Cerrar', { duration: 6500 });
  }
}
