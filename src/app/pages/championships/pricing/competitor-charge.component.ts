import { Component, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { Subscription, finalize, forkJoin } from 'rxjs';
import { EventPricingService } from './event-pricing.service';
import { CompetitorCharge, TariffHistory } from './event-pricing.models';
import { PriceDetailComponent } from './price-detail.component';

@Component({ selector: 'bte-competitor-charge', standalone: true, imports: [CommonModule, FormsModule, MatButtonModule, PriceDetailComponent], template: `
  <button mat-button type="button" (click)="open()" [disabled]="loading">{{ expanded ? 'Ocultar detalle' : 'Detalle del cobro' }}</button>
  <div *ngIf="expanded"><p *ngIf="error" role="status">{{ error }}</p><ng-container *ngIf="charge"><p>Calculado: {{ charge.calculatedAt | date:'dd/MM/yyyy HH:mm' }}</p><bte-price-detail [result]="charge.calculation"></bte-price-detail></ng-container>
    <details><summary>Historial de cálculos</summary><article *ngFor="let version of history"><p>Versión {{ version.version }} · {{ version.calculatedAt | date:'dd/MM/yyyy HH:mm' }} · {{ version.reason }} {{ version.isCurrent ? '(Último guardado)' : '' }}</p><bte-price-detail [result]="version.calculation"></bte-price-detail></article></details>
    <div *ngIf="canRecalculate && charge?.calculation?.calculationType === 'BY_COMBINATION'"><label>Motivo del recálculo <input [(ngModel)]="reason" maxlength="500" [disabled]="loading"></label><button mat-button type="button" [disabled]="loading || !reason.trim()" (click)="recalculate()">Recalcular y guardar versión</button></div>
  </div>` })
export class CompetitorChargeComponent implements OnDestroy {
  @Input() eventId = 0;
  @Input() competitorId = 0;
  @Input() canRecalculate = false;
  reason = '';
  charge: CompetitorCharge | null = null;
  history: TariffHistory[] = [];
  loading = false; expanded = false; error = '';
  private request?: Subscription;
  constructor(private readonly api: EventPricingService) {}
  open() {
    this.expanded = !this.expanded; if (!this.expanded) return;
    this.loading = true; this.error = ''; this.request?.unsubscribe();
    this.request = forkJoin({ history: this.api.history(this.eventId, this.competitorId), charge: this.api.getCompetitorCharge(this.eventId, this.competitorId) })
      .pipe(finalize(() => this.loading = false)).subscribe({
        next: ({ history, charge }) => { this.history = history; this.charge = charge; },
        error: () => this.error = 'No se pudo cargar el detalle del cobro.'
      });
  }
  ngOnDestroy() { this.request?.unsubscribe(); }
  recalculate() {
    if (!this.reason.trim() || this.loading) return;
    this.loading = true; this.error = '';
    this.request = this.api.recalculateCompetitor(this.eventId, this.competitorId, this.reason.trim(), crypto.randomUUID()).pipe(finalize(() => this.loading = false)).subscribe({
      next: () => { this.reason = ''; this.expanded = false; this.loading = false; this.open(); },
      error: e => this.error = e?.error?.message ?? 'No fue posible recalcular.'
    });
  }
}
