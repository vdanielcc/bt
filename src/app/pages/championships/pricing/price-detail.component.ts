import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EnrollmentPriceResult } from './event-pricing.models';
export function clp(value: number): string { return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value); }
@Component({ selector: 'bte-price-detail', standalone: true, imports: [CommonModule], template: `
  <section *ngIf="result as price" class="card p-4 my-4" aria-live="polite">
    <h3 class="text-lg font-medium">Detalle de inscripción</h3>
    <p *ngIf="price.warning" role="alert" class="text-amber-700">{{ price.warning }}</p>
    <ng-container *ngIf="!showCombinationTotalOnly">
    <p>Categorías seleccionadas: {{ price.categories.length }} · Gratuitas: {{ freeCount }} · Unidades cobrables: {{ price.billableUnits }}</p>
    <div class="overflow-auto"><table class="w-full text-left"><thead><tr><th>Categoría</th><th>Detalle</th><th>Monto</th></tr></thead>
      <tbody><tr *ngFor="let category of price.categories"><td class="py-2">{{ category.categoryName }} <strong *ngIf="category.isFree" class="text-green-700">GRATIS</strong></td><td>{{ category.reason }}</td><td>{{ money(category.amount) }}</td></tr></tbody></table></div>
    <ng-container *ngIf="price.calculationType !== 'BY_COMBINATION'"><p>Primera unidad: {{ money(price.baseAmount) }}</p><p>Adicionales: {{ money(price.additionalAmount) }}</p></ng-container>
    <p *ngFor="let part of price.parts">{{ part.period === 'PRESALE' ? 'Preventa' : 'Normal' }} · {{ part.categoryIds.length }} categorías · {{ money(part.amount) }}</p>
    <p *ngIf="price.discountAmount">Descuentos: {{ money(price.discountAmount) }}</p>
    </ng-container>
    <p class="font-bold text-xl mt-2">Total inscripción: {{ price.status === 'PENDING_RATE' ? 'Pendiente de tarifa' : money(price.totalAmount) }}</p>
  </section>` })
export class PriceDetailComponent {
  @Input() result: EnrollmentPriceResult | null = null;
  @Input() combinationTotalOnly = false;
  get showCombinationTotalOnly() { return this.combinationTotalOnly && this.result?.calculationType === 'BY_COMBINATION'; }
  readonly money = clp;
  get freeCount() { return this.result?.categories.filter(c => c.isFree).length ?? 0; }
}
