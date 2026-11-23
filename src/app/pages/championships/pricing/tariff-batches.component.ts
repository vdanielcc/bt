import { Component, Input, Output, EventEmitter, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { Subscription, finalize, throwError, tap } from 'rxjs';
import { EventPricingService } from './event-pricing.service';
import { TariffBatch } from './event-pricing.models';
import { RegistrationEntry } from '../invitations/registration-summary.service';
import { enrollmentErrorMessage } from '../invitations/enrollment-error-message';

@Component({ selector: 'bte-tariff-batches', standalone: true, imports: [CommonModule, FormsModule, MatButtonModule], template: `
  <section *ngIf="enabled" class="border rounded p-4 my-4">
    <h3>Lotes de pago</h3>
    <p>Puedes realizar varios abonos al mismo lote. La preventa se conserva solo si los comprobantes cargados antes del vencimiento cubren su total.</p>
    <p>Selecciona el grupo de deportistas que cubre este pago. Preventa y período normal se pagan en lotes separados.</p>
    <p *ngIf="error" role="alert">{{ error }}</p>
    <label *ngFor="let entry of entries" class="block my-2"><input type="checkbox" [checked]="selected.has(entry.competitorId)" [disabled]="loading || disabled || entry.amount == null || (entry.balance != null && entry.balance <= 0) || !entry.categories.length" (change)="toggle(entry.competitorId, $any($event.target).checked)"> {{ entry.name }} · {{ entry.amount == null ? 'Pendiente de tarifa' : ((entry.balance ?? entry.amount) | currency:'CLP':'symbol-narrow':'1.0-0') }}</label>
    <button mat-stroked-button type="button" (click)="create()" [disabled]="loading || disabled || !selected.size">Crear lote del grupo seleccionado</button>
    <div *ngFor="let batch of batches" class="border-t pt-3 mt-3">
      <label><input type="radio" name="tariff-batch" [value]="batch.id" [checked]="selectedBatch === batch.id" [disabled]="disabled || loading || !payable(batch)" (change)="choose(batch)">
        Lote {{ batch.id }} · {{ batch.period === 'PRESALE' ? 'Preventa' : 'Normal' }} · {{ batch.total | currency:'CLP':'symbol-narrow':'1.0-0' }} · {{ status(batch.status) }}</label>
      <p>Aprobado: {{ batch.approvedAmount ?? 0 | currency:'CLP':'symbol-narrow':'1.0-0' }} · Pendiente de revisión: {{ batch.pendingAmount ?? 0 | currency:'CLP':'symbol-narrow':'1.0-0' }} · Disponible para abonar: {{ available(batch) | currency:'CLP':'symbol-narrow':'1.0-0' }}</p>
      <p *ngIf="batch.creditAmount">Sobrepago: {{ batch.creditAmount | currency:'CLP':'symbol-narrow':'1.0-0' }}</p>
      <ul><li *ngFor="let item of batch.items">{{ name(item.competitorId) }} · {{ item.amount | currency:'CLP':'symbol-narrow':'1.0-0' }}</li></ul>
      <button *ngIf="batch.status === 'UNPAID' || batch.status === 'EXPIRED'" mat-button type="button" (click)="cancel(batch)" [disabled]="loading || disabled">Cancelar lote sin pago</button>
    </div>
  </section>` })
export class TariffBatchesComponent implements OnChanges, OnDestroy {
  @Input() eventId = 0; @Input() academyId = 0; @Input() entries: RegistrationEntry[] = []; @Input() disabled = false;
  @Output() selection = new EventEmitter<{ enabled: boolean; batch: TariffBatch | null }>();
  enabled = false; loading = false; error = ''; batches: TariffBatch[] = []; selected = new Set<number>(); selectedBatch: number | null = null;
  private request?: Subscription; private creation?: Subscription; private requestId = ''; private loadedKey = '';
  constructor(private api: EventPricingService) {}
  ngOnChanges(changes: SimpleChanges) { const key = `${this.eventId}:${this.academyId}`; if ((key !== this.loadedKey || changes['entries']) && this.eventId && this.academyId && !this.loading) { this.loadedKey = key; this.load(); } }
  ngOnDestroy() { this.request?.unsubscribe(); this.creation?.unsubscribe(); }
  name(id: number) { return this.entries.find(e => e.competitorId === id)?.name ?? `Deportista ${id}`; }
  status(value: string) { return ({ PAID: 'Pagado', PENDING_REVIEW: 'Pendiente de aprobación', EXPIRED: 'Preventa vencida', UNPAID: 'Sin pago', PARTIAL: 'Pago parcial', CANCELLED: 'Cancelado' } as Record<string,string>)[value] ?? value; }
  available(batch: TariffBatch): number { return batch.availableAmount ?? batch.balance ?? batch.total; }
  payable(batch: TariffBatch): boolean { return !['CANCELLED', 'EXPIRED', 'PAID'].includes(batch.status) && this.available(batch) > 0; }
  toggle(id: number, checked: boolean) { checked ? this.selected.add(id) : this.selected.delete(id); this.requestId = ''; }
  choose(batch: TariffBatch) { this.selectedBatch = batch.id; this.selection.emit({ enabled: this.enabled, batch }); }
  preparePayment(amount: number) {
    if (this.loading || !this.selected.size) {
      return throwError(() => new Error('Marca los deportistas que cubre este pago o selecciona un lote sin pago.'));
    }
    const entries = this.entries.filter(entry => this.selected.has(entry.competitorId));
    if (entries.length !== this.selected.size || entries.some(entry => entry.amount == null || (entry.balance != null && entry.balance <= 0) || !entry.categories.length) ||
        amount <= 0 || entries.reduce((total, entry) => total + (entry.balance ?? entry.amount ?? 0), 0) < amount) {
      return throwError(() => new Error('El abono no puede superar el saldo del grupo seleccionado.'));
    }
    this.requestId ||= crypto.randomUUID();
    this.loading = true;
    return this.api.createBatch(this.eventId, this.academyId, [...this.selected], this.requestId).pipe(
      tap(batch => {
        this.choose({ ...batch, status: 'UNPAID', createdAt: '', presaleEndAt: null, items: [] });
        this.selected.clear(); this.requestId = '';
      }),
      finalize(() => { this.loading = false; this.load(); })
    );
  }
  load() {
    this.loading = true; this.request?.unsubscribe();
    this.request = this.api.batches(this.eventId, this.academyId).pipe(finalize(() => this.loading = false)).subscribe({
      next: batches => { this.enabled = true; this.batches = batches;
        this.selection.emit({ enabled: this.enabled, batch: batches.find(b => b.id === this.selectedBatch && this.payable(b)) ?? null }); },
      error: error => { this.enabled = true; this.error = enrollmentErrorMessage(error); this.selection.emit({ enabled: true, batch: null }); }
    });
  }
  create() {
    if (this.loading || this.disabled) return;
    this.loading = true; this.error = ''; this.requestId ||= crypto.randomUUID();
    this.creation = this.api.createBatch(this.eventId, this.academyId, [...this.selected], this.requestId).pipe(finalize(() => this.loading = false)).subscribe({
      next: batch => {
        this.choose({ ...batch, status: 'UNPAID', createdAt: '', presaleEndAt: null, items: [] });
        this.selected.clear(); this.requestId = ''; this.load();
      }, error: error => this.error = enrollmentErrorMessage(error)
    });
  }
  cancel(batch: TariffBatch) {
    if (this.loading || this.disabled || !window.confirm('¿Cancelar este lote sin pago? Las inscripciones se conservan y podrás crear un lote actualizado.')) return;
    this.loading = true; this.error = '';
    this.creation = this.api.cancelBatch(this.eventId, batch.id).pipe(finalize(() => this.loading = false)).subscribe({
      next: () => { if (this.selectedBatch === batch.id) this.selectedBatch = null; this.load(); }, error: error => this.error = enrollmentErrorMessage(error)
    });
  }
}
