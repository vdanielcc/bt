import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, Subscription, catchError, of, switchMap, timer } from 'rxjs';
import { EventPricingService } from './event-pricing.service';
import { EnrollmentPriceResult } from './event-pricing.models';
import { PriceDetailComponent } from './price-detail.component';

@Component({ selector: 'bte-enrollment-price-preview', standalone: true, imports: [CommonModule, PriceDetailComponent], template: `
  <p *ngIf="loading" role="status">Calculando inscripción…</p>
  <p *ngIf="error" role="alert">{{ error }} <button type="button" (click)="refresh()">Reintentar cálculo</button></p>
  <bte-price-detail [result]="result" [combinationTotalOnly]="true"></bte-price-detail>` })
export class EnrollmentPricePreviewComponent implements OnChanges, OnDestroy {
  @Input() eventId = 0;
  @Input() categoryIds = '';
  @Input() competitorId?: number;
  @Input() studentId?: number;
  @Input() registrationType?: 'INDIVIDUAL' | 'EQUIPO' | 'SEMINARIO';
  @Output() ready = new EventEmitter<boolean>();
  result: EnrollmentPriceResult | null = null;
  loading = false; error = '';
  private readonly requests = new Subject<void>();
  private readonly subscription: Subscription;
  constructor(private readonly api: EventPricingService) {
    this.subscription = this.requests.pipe(switchMap(() => timer(250).pipe(
      switchMap(() => this.api.calculate(this.eventId, this.categoryIds.split(',').filter(Boolean).map(Number), { competitorId: this.competitorId, studentId: this.studentId, registrationType: this.registrationType })),
      catchError((e: unknown) => { this.error = e instanceof HttpErrorResponse && typeof e.error?.message === 'string' ? e.error.message : 'No se pudo calcular la inscripción. Reintenta antes de confirmar.'; return of(null); })
    ))).subscribe(result => { this.result = result; this.loading = false; this.ready.emit(result !== null); });
  }
  ngOnChanges() { this.refresh(); }
  refresh() { this.result = null; this.error = ''; this.loading = true; this.ready.emit(false); this.requests.next(); }
  ngOnDestroy() { this.subscription.unsubscribe(); }
}
