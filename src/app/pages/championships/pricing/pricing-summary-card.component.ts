import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { EventPricingService } from './event-pricing.service';
import { PricingSummary } from './event-pricing.models';
import { clp } from './price-detail.component';

@Component({ selector: 'bte-pricing-summary-card', standalone: true, imports: [CommonModule], template: `
  <section class="card p-4 my-4" *ngIf="summary as value">
    <h2 class="text-lg font-medium">Ingresos estimados por inscripciones</h2>
    <p>Deportistas con inscripción individual: {{ value.totalCompetitors }} · Registros gratuitos (incluye coaches): {{ value.freeRegistrations }} · Unidades cobrables del motor: {{ value.billableUnits }}</p>
    <p>Total calculado: <strong>{{ money(value.totalCalculated) }}</strong></p>
    <p *ngIf="!value.pricingComplete" role="alert">Hay inscripciones sin tarifa. El total está incompleto.</p>
    <p>Los pagos recibidos se consultan en el resumen de pagos.</p>
  </section><p *ngIf="error" role="alert">No se pudieron cargar los indicadores tarifarios.</p>` })
export class PricingSummaryCardComponent implements OnChanges, OnDestroy {
  @Input() eventId = 0;
  summary: PricingSummary | null = null;
  error = false;
  readonly money = clp;
  private request?: Subscription;
  constructor(private readonly api: EventPricingService) {}
  ngOnChanges() { this.request?.unsubscribe(); this.summary = null; this.error = false; if (this.eventId > 0) this.request = this.api.summary(this.eventId).subscribe({ next: value => this.summary = value, error: () => this.error = true }); }
  ngOnDestroy() { this.request?.unsubscribe(); }
}
