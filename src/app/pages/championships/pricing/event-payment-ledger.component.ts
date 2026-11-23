import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { finalize, map, Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { unwrapApiResponse } from '../../academy-management/services/api-response.util';
import { RegistrationEntry } from '../invitations/registration-summary.service';
import { enrollmentErrorMessage } from '../invitations/enrollment-error-message';
import { TariffBatch } from './event-pricing.models';

interface LedgerTransfer { paymentId: number; reference: string; amount: number; status: string; batchId: number | null; allocatedAmount: number; unallocatedAmount: number; receivedAt: string; reviewedBy: number | null; reviewedAt: string | null; reviewReason: string | null; }
interface Allocation { id: number; paymentId: number; batchId: number; amount: number; actorUserId: number; reason: string; createdAt: string; isReversed: boolean; reversalReason: string | null; }
interface Audit { id: number; createdAt: string; actorUserId: number | null; batchId: number | null; action: string; reason: string; transferReference: string; detailsJson: string; }
interface Ledger { transfers: LedgerTransfer[]; allocations: Allocation[]; audit: Audit[]; unallocatedApproved: number; }

@Component({ selector: 'bte-event-payment-ledger', standalone: true, imports: [CommonModule, FormsModule, MatButtonModule], template: `
  <section class="border rounded p-4 my-4">
    <h3>Conciliación e historial de pagos</h3>
    <button mat-button type="button" (click)="load()" [disabled]="loading || saving">Actualizar movimientos</button>
    <p *ngIf="error" role="alert">{{ error }}</p><p *ngIf="success" role="status">{{ success }}</p>
    <ng-container *ngIf="ledger as data">
      <p>Importe aprobado sin asignar: <strong>{{ data.unallocatedApproved | currency:'CLP':'symbol-narrow':'1.0-0' }}</strong></p>
      <div class="overflow-auto"><table class="w-full"><thead><tr><th>Referencia / lote</th><th>Fecha</th><th>Estado</th><th>Importe</th><th>Sin asignar</th><th>Revisión</th></tr></thead>
        <tbody><tr *ngFor="let t of data.transfers"><td>{{ t.reference }}<br>{{ t.batchId ? 'Lote ' + t.batchId : 'Pago anterior sin lote' }}</td><td>{{ t.receivedAt | date:'dd/MM/yyyy HH:mm' }}</td><td>{{ transferStatus(t.status) }}</td><td>{{ t.amount | currency:'CLP':'symbol-narrow':'1.0-0' }}</td><td>{{ t.unallocatedAmount | currency:'CLP':'symbol-narrow':'1.0-0' }}</td><td>{{ t.reviewedAt | date:'dd/MM/yyyy HH:mm' }}<br><span *ngIf="t.reviewedBy">Usuario {{ t.reviewedBy }}</span><br>{{ t.reviewReason }}</td></tr></tbody></table></div>
      <fieldset *ngIf="canReconcile" [disabled]="saving || loading" class="my-4">
        <legend>Asignar un pago antiguo aprobado</legend>
        <label>Transferencia <select [(ngModel)]="reference"><option value="">Selecciona un pago</option><option *ngFor="let t of unallocated" [value]="t.reference">{{ t.reference }} · {{ t.unallocatedAmount | currency:'CLP':'symbol-narrow':'1.0-0' }}</option></select></label>
        <label>Lote <select [(ngModel)]="batchId"><option [ngValue]="0">Selecciona un lote</option><option *ngFor="let b of availableBatches" [ngValue]="b.id">Lote {{ b.id }} · Disponible {{ b.availableAmount ?? b.total | currency:'CLP':'symbol-narrow':'1.0-0' }}</option></select></label>
        <label>Importe a asignar <input type="number" min="1" step="1" [(ngModel)]="amount"></label>
        <label>Motivo de conciliación <textarea [(ngModel)]="reason" maxlength="1000"></textarea></label>
        <button mat-stroked-button type="button" (click)="allocate()">Confirmar asignación</button>
        <details class="my-3"><summary>Confirmar precios históricos que faltan</summary>
          <p>Selecciona las inscripciones y registra el precio original comprobado. Quedarán el responsable, el motivo y los importes en el historial. Después asigna el pago al lote creado.</p>
          <div *ngFor="let e of entries"><label><input type="checkbox" [checked]="historical.has(e.competitorId)" (change)="selectHistorical(e.competitorId, $any($event.target).checked)"> {{ e.name }}</label>
            <ng-container *ngIf="historical.get(e.competitorId) as price"><label>Precio histórico <input type="number" min="0" step="1" [(ngModel)]="price.amount"></label><select [(ngModel)]="price.period"><option value="NORMAL">Normal</option><option value="PRESALE">Preventa</option></select></ng-container></div>
          <button mat-stroked-button type="button" (click)="createHistorical()">Confirmar precios y crear lote histórico</button>
        </details>
      </fieldset>
      <h4>Asignaciones</h4>
      <p *ngIf="!data.allocations.length">No hay asignaciones administrativas.</p>
      <article *ngFor="let a of data.allocations" class="border-t py-2"><p>Pago {{ allocationSource(a) }} · Lote {{ a.batchId }} · {{ a.amount | currency:'CLP':'symbol-narrow':'1.0-0' }} · Usuario {{ a.actorUserId }} · {{ a.createdAt | date:'dd/MM/yyyy HH:mm' }}<br>{{ a.reason }}</p>
        <p *ngIf="a.isReversed">Revertida: {{ a.reversalReason }}</p><button *ngIf="canReconcile && !a.isReversed" mat-button type="button" (click)="reverse(a)" [disabled]="saving">Revertir con motivo</button></article>
      <details><summary>Historial de movimientos ({{ data.audit.length }})</summary>
        <article *ngFor="let a of data.audit" class="border-t py-2"><p>{{ a.createdAt | date:'dd/MM/yyyy HH:mm' }} · {{ action(a.action) }} · {{ a.actorUserId ? 'Usuario ' + a.actorUserId : 'Sistema' }}<span *ngIf="a.batchId"> · Lote {{ a.batchId }}</span><br>{{ a.reason }}<br>{{ a.transferReference }}<br>{{ movement(a) }}</p></article>
      </details>
    </ng-container>
  </section>` })
export class EventPaymentLedgerComponent implements OnChanges, OnDestroy {
  @Input() eventId = 0; @Input() academyId = 0; @Input() canReconcile = false; @Input() entries: RegistrationEntry[] = [];
  @Output() changed = new EventEmitter<void>();
  ledger?: Ledger; batches: TariffBatch[] = []; loading = false; saving = false; error = ''; success = '';
  reference = ''; batchId = 0; amount: number | null = null; reason = '';
  historical = new Map<number, { amount: number | null; period: string }>();
  private request?: Subscription; private batchRequest?: Subscription; private mutation?: Subscription;
  private operationId = ''; private signature = ''; private loadedKey = '';
  constructor(private http: HttpClient) {}
  ngOnChanges(changes: SimpleChanges): void {
    const key = `${this.eventId}:${this.academyId}`;
    if (this.eventId <= 0 || this.academyId <= 0) return;
    if (key !== this.loadedKey) {
      this.request?.unsubscribe(); this.batchRequest?.unsubscribe(); this.mutation?.unsubscribe();
      this.loadedKey = key; this.loading = false; this.saving = false; this.batches = []; this.ledger = undefined;
      this.reference = ''; this.batchId = 0; this.amount = null; this.reason = ''; this.operationId = ''; this.signature = ''; this.historical.clear(); this.load();
    } else if (changes['entries'] && !this.saving) this.load();
  }
  ngOnDestroy(): void { this.request?.unsubscribe(); this.batchRequest?.unsubscribe(); this.mutation?.unsubscribe(); }
  private url() { return `${environment.apiBaseUrl}/events/${this.eventId}/payments`; }
  get unallocated() { return this.ledger?.transfers.filter(t => t.status === 'APPROVED' && !t.batchId && t.unallocatedAmount > 0) ?? []; }
  get availableBatches() { return this.batches.filter(b => !['CANCELLED', 'PAID'].includes(b.status) && (b.availableAmount ?? b.total) > 0); }
  load(): void {
    if (this.loading || this.saving || !this.eventId || !this.academyId) return;
    this.loading = true; this.error = '';
    // Ledger loading is independent of missing old tariffs: historical confirmation must remain accessible.
    this.request = this.http.get<unknown>(`${this.url()}/ledger`, { params: { academyId: this.academyId } }).pipe(map(unwrapApiResponse<Ledger>), finalize(() => this.loading = false)).subscribe({
      next: data => { this.ledger = data; this.loadBatches(); }, error: e => this.error = enrollmentErrorMessage(e)
    });
  }
  private loadBatches(): void {
    this.batchRequest?.unsubscribe();
    this.batchRequest = this.http.get<unknown>(`${environment.apiBaseUrl}/events/${this.eventId}/pricing/batches`, { params: { academyId: this.academyId } }).pipe(map(unwrapApiResponse<TariffBatch[]>)).subscribe({ next: batches => this.batches = batches, error: e => this.error = enrollmentErrorMessage(e) });
  }
  selectHistorical(id: number, selected: boolean): void { selected ? this.historical.set(id, { amount: null, period: 'NORMAL' }) : this.historical.delete(id); }
  private send(path: string, body: object): void {
    if (!this.canReconcile || this.saving || !this.reason.trim()) { this.error = 'Indica el motivo de conciliación.'; return; }
    const signature = JSON.stringify([path, body, this.reason.trim()]);
    if (signature !== this.signature) { this.signature = signature; this.operationId = crypto.randomUUID(); }
    this.saving = true; this.error = ''; this.success = '';
    this.mutation = this.http.post(`${this.url()}/${path}`, { ...body, reason: this.reason.trim(), operationId: this.operationId }, { params: { academyId: this.academyId } }).pipe(finalize(() => this.saving = false)).subscribe({
      next: () => { this.saving = false; this.success = 'Conciliación registrada.'; this.operationId = ''; this.signature = ''; this.reason = ''; this.load(); this.changed.emit(); },
      error: e => this.error = enrollmentErrorMessage(e)
    });
  }
  allocate(): void {
    if (!this.reference || !this.batchId || !this.amount || !Number.isSafeInteger(this.amount) || this.amount <= 0) { this.error = 'Selecciona la transferencia, el lote y un importe positivo en pesos enteros.'; return; }
    this.send('allocations', { reference: this.reference, batchId: this.batchId, amount: this.amount });
  }
  reverse(allocation: Allocation): void {
    const reason = window.prompt('Motivo para revertir la asignación (quedará registrado):'); if (!reason?.trim()) return;
    this.reason = reason; this.send(`allocations/${allocation.id}/reverse`, {});
  }
  createHistorical(): void {
    if (!this.reference || !this.historical.size || [...this.historical.values()].some(p => p.amount == null || !Number.isSafeInteger(p.amount) || p.amount < 0)) { this.error = 'Selecciona el pago y las inscripciones con sus precios históricos comprobados.'; return; }
    this.send('historical-batches', { reference: this.reference, entries: [...this.historical].map(([competitorId, price]) => ({ competitorId, ...price })) });
  }
  allocationSource(allocation: Allocation): string { return this.ledger?.transfers.find(t => t.paymentId === allocation.paymentId)?.reference ?? String(allocation.paymentId); }
  movement(audit: Audit): string {
    try {
      const details = JSON.parse(audit.detailsJson);
      const money = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
      if (details.before && details.after) return `Total anterior: ${money(details.before.total)}; total actualizado: ${money(details.after.total)}`;
      const amount = details.amount ?? details.total;
      return typeof amount === 'number' ? `Importe: ${money(amount)}` : '';
    } catch { return ''; }
  }
  transferStatus(value: string) { return ({ APPROVED: 'Aprobado', PENDING: 'Pendiente', REJECTED: 'Rechazado' } as Record<string, string>)[value] ?? value; }
  action(value: string) { return ({ UPLOAD: 'Comprobante recibido', APPROVED: 'Pago aprobado', REJECTED: 'Pago rechazado', ALLOCATE: 'Asignación', REVERSE_ALLOCATION: 'Reversa de asignación', HISTORICAL_PRICE: 'Precio histórico confirmado', REPRICE: 'Actualización de tarifa', CREATE_BATCH: 'Lote creado', CANCEL_BATCH: 'Lote cancelado' } as Record<string, string>)[value] ?? value; }
}
