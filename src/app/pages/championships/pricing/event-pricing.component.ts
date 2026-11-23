import { Component, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Subscription, finalize } from 'rxjs';
import { EventPricingService } from './event-pricing.service';
import { EnrollmentPriceResult, EventPriceRule, EventPricingConfiguration, PricingCategoryOption, PricingStrategy, PricingSummary, isCoachCategory, simulationRegistrationType } from './event-pricing.models';
import { clp, PriceDetailComponent } from './price-detail.component';

export function validatePricing(rule: EventPriceRule, categories: PricingCategoryOption[]): string {
  if (rule.calculationType === 'BY_COMBINATION') {
    const keys = new Set<string>();
    for (const tariff of rule.combinations ?? []) {
      if (!Number.isSafeInteger(tariff.price) || tariff.price < 0 || tariff.price > 99999999 || !tariff.terms.length ||
        tariff.terms.some(t => !Number.isSafeInteger(t.quantity) || t.quantity < 1 || t.quantity > 1000 || !categories.some(c => c.modalityId === t.modalityId)) ||
        new Set(tariff.terms.map(t => t.modalityId)).size !== tariff.terms.length) return 'Revisa cantidades, modalidades y precios de las combinaciones.';
      const key = `${tariff.registrationType}/${tariff.isPresale}/` + [...tariff.terms].sort((a,b) => a.modalityId - b.modalityId).map(t => `${t.modalityId}:${t.quantity}`).join(';');
      if (tariff.isActive && keys.has(key)) return 'Hay dos combinaciones activas iguales para el mismo período y tipo de inscripción.';
      if (tariff.isActive) keys.add(key);
    }
    return '';
  }
  const invalid = (n: number) => !Number.isFinite(n) || n < 0 || n > 99999999.99 || Math.abs(n * 100 - Math.round(n * 100)) > 0.00001;
  if (invalid(rule.basePrice) || invalid(rule.additionalPrice) || rule.groups.some(g => (g.additionalPrice != null && invalid(g.additionalPrice)) || (g.basePrice != null && invalid(g.basePrice)))) return 'Los precios deben ser positivos o cero y tener como máximo dos decimales.';
  if (rule.groups.filter(g => g.isActive && g.isBase).length > 1) return 'Sólo puede existir un grupo base activo.';
  if (new Set(rule.categories.map(c => c.categoryId)).size !== rule.categories.length) return 'Una categoría no puede pertenecer a varios grupos.';
  if (rule.groups.some(g => !g.name.trim() || g.groupOrder < 0)) return 'Revisa el nombre y orden de cada grupo.';
  if (rule.calculationType === 'BY_GROUP') {
    for (const category of categories) {
      if (isCoachCategory(category)) continue;
      const config = rule.categories.find(c => c.categoryId === category.categoryId);
      if (rule.modalities.some(m => m.modalityId === category.modalityId && m.isFree) || config?.isActive && config.isFree) continue;
      if (!config?.isActive || !rule.groups.some(g => g.id === config.priceGroupId && g.isActive)) return `Asigna un grupo a ${category.categoryName}.`;
    }
  }
  return '';
}

@Component({ standalone: true, selector: 'bte-event-pricing', templateUrl: './event-pricing.component.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatSelectModule, PriceDetailComponent] })
export class EventPricingComponent implements OnDestroy {
  private readonly api = inject(EventPricingService);
  private readonly subscriptions = new Subscription();
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  readonly eventId = Number(this.route.snapshot.paramMap.get('eventId'));
  readonly backLink = this.route.snapshot.routeConfig?.path?.startsWith('admin/') ? '/admin/events' : '/campeonatos/mis-eventos/' + this.eventId + '/resumen';
  readonly money = clp;
  readonly form = this.fb.nonNullable.group({ name: ['Tarifa de inscripción', [Validators.required, Validators.maxLength(150)]], calculationTypeId: [0, Validators.min(1)], basePrice: [20000, Validators.min(0)], additionalPrice: [10000, Validators.min(0)], isActive: [false] });
  config: EventPricingConfiguration | null = null;
  modalities: { id: number; name: string }[] = [];
  rule: EventPriceRule | null = null;
  summary: PricingSummary | null = null;
  result: EnrollmentPriceResult | null = null;
  selected = new Set<number>();
  get simulationType() { return simulationRegistrationType((this.config?.categories ?? []).filter(c => this.selected.has(c.categoryId))); }
  categoriesCollapsed = false;
  error = ''; simulationError = ''; message = ''; loading = false; saving = false; calculating = false; dirty = false;
  private nextGroupId = -1;
  private readonly selectedStrategy = signal<PricingStrategy>('BY_CATEGORY');
  constructor() {
    this.subscriptions.add(this.form.controls.calculationTypeId.valueChanges.subscribe(id => {
      const type = this.config?.calculationTypes.find(t => t.id === id);
      if (type) this.selectedStrategy.set(type.code);
    }));
    this.subscriptions.add(this.form.valueChanges.subscribe(() => this.markDirty()));
    this.load();
  }
  ngOnDestroy() { this.subscriptions.unsubscribe(); }
  markDirty() { this.dirty = true; this.result = null; this.message = ''; }
  load() {
    this.loading = true; this.error = '';
    this.subscriptions.add(this.api.getPricing(this.eventId).pipe(finalize(() => this.loading = false)).subscribe({ next: config => {
      this.config = config;
      this.modalities = [...new Map(config.categories.filter(c => !isCoachCategory(c)).map(c => [c.modalityId, { id: c.modalityId, name: c.modalityName }])).values()];
      const defaultType = config.calculationTypes.find(t => t.code === 'BY_COMBINATION') ?? config.calculationTypes[0];
      this.rule = config.rule ?? { id: 0, eventId: this.eventId, calculationTypeId: defaultType?.id ?? 0, calculationType: defaultType?.code ?? 'BY_CATEGORY', name: 'Tarifa de inscripción', description: null, basePrice: 0, additionalPrice: 0, priority: 0, isActive: false, groups: [], categories: [], modalities: [], combinations: [] };
      for (const category of config.categories) if (!this.rule.categories.some(c => c.categoryId === category.categoryId)) this.rule.categories.push({ categoryId: category.categoryId, priceGroupId: null, isFree: false, isActive: true });
      for (const modality of this.modalities) if (!this.rule.modalities.some(m => m.modalityId === modality.id)) this.rule.modalities.push({ modalityId: modality.id, isFree: false });
      this.form.reset(this.rule); this.dirty = false;
    }, error: e => this.error = this.errorMessage(e) }));
    this.subscriptions.add(this.api.summary(this.eventId).subscribe({ next: summary => this.summary = summary, error: () => this.summary = null }));
  }
  trackModality(_index: number, modality: { id: number }) { return modality.id; }
  get byGroup() { return this.selectedStrategy() === 'BY_GROUP'; }
  get byCombination() { return this.selectedStrategy() === 'BY_COMBINATION'; }
  addCombination() {
    if (!this.rule) return;
    (this.rule.combinations ??= []).push({ id: crypto.randomUUID(), registrationType: 'INDIVIDUAL', isPresale: false, isActive: true, price: 0, terms: [{ modalityId: this.modalities[0]?.id ?? 0, quantity: 1 }] });
    this.markDirty();
  }
  recalculateReason = ''; recalculating = false;
  recalculate() {
    if (!this.recalculateReason.trim() || this.dirty || this.recalculating) return;
    this.recalculating = true; this.error = '';
    this.subscriptions.add(this.api.recalculate(this.eventId, this.recalculateReason.trim(), crypto.randomUUID()).pipe(finalize(() => this.recalculating = false)).subscribe({
      next: result => { this.message = `${result.calculated} cálculos guardados. ${result.pending} pendientes de tarifa.`; this.load(); }, error: e => this.error = this.errorMessage(e)
    }));
  }
  modalityFree(id: number) { return this.rule?.modalities.some(m => m.modalityId === id && m.isFree) ?? false; }
  categoryName(id: number) { return this.config?.categories.find(c => c.categoryId === id)?.categoryName ?? String(id); }
  categoryModalityFree(id: number) { const c = this.config?.categories.find(c => c.categoryId === id); return c ? this.modalityFree(c.modalityId) : false; }
  toggleModality(id: number, checked: boolean) { const m = this.rule?.modalities.find(m => m.modalityId === id); if (m) m.isFree = checked; this.markDirty(); }
  addGroup() { this.rule?.groups.push({ id: this.nextGroupId--, name: '', groupOrder: (this.rule?.groups.length ?? 0) + 1, basePrice: null, additionalPrice: null, isBase: false, isActive: true }); this.markDirty(); }
  removeGroup(id: number) { if (!this.rule || !window.confirm('¿Desactivar este grupo? Deberás reasignar sus categorías cobrables.')) return; this.rule.groups = this.rule.groups.filter(g => g.id !== id); this.rule.categories.filter(c => c.priceGroupId === id).forEach(c => c.priceGroupId = null); this.markDirty(); }
  save() {
    if (!this.rule || !this.config || this.saving) return;
    this.form.markAllAsTouched(); if (this.form.invalid) { this.error = 'Revisa los campos obligatorios.'; return; }
    const value = this.form.getRawValue();
    const request: EventPriceRule = { ...this.rule, ...value, calculationType: this.byCombination ? 'BY_COMBINATION' : this.byGroup ? 'BY_GROUP' : 'BY_CATEGORY' };
    if (this.byCombination) request.isActive = !!request.combinations?.some(t => t.isActive);
    this.error = validatePricing(request, this.config.categories); if (this.error) return;
    this.saving = true;
    this.subscriptions.add((request.id ? this.api.updatePricing(this.eventId, request.id, request) : this.api.createPricing(this.eventId, request))
      .pipe(finalize(() => this.saving = false)).subscribe({ next: rule => { this.rule = rule; this.dirty = false; this.load(); this.message = 'Configuración guardada.'; }, error: e => this.error = this.errorMessage(e) }));
  }
  toggleSimulation(id: number, checked: boolean) { checked ? this.selected.add(id) : this.selected.delete(id); this.result = null; this.simulationError = ''; }
  simulate() {
    if (this.dirty || this.calculating) return;
    if (!this.simulationType) { this.simulationError = 'Selecciona categorías de deportistas o de equipos por separado.'; return; }
    this.calculating = true; this.simulationError = ''; this.result = null;
    this.subscriptions.add(this.api.calculate(this.eventId, [...this.selected], { registrationType: this.simulationType }).pipe(finalize(() => this.calculating = false)).subscribe({ next: result => this.result = result, error: e => this.simulationError = this.errorMessage(e) }));
  }
  private errorMessage(error: unknown) { return error instanceof HttpErrorResponse && typeof error.error?.message === 'string' ? error.error.message : 'No se pudo completar la operación. Inténtalo nuevamente.'; }
}
