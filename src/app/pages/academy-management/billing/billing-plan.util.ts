import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';
import { BillingPlan } from '../models/academy-management.models';
import { localDate } from '../classes/enrollment-status.util';

export const billingCycles = [
  { value: 'MONTHLY', label: 'Mensual' },
  { value: 'PER_CLASS', label: 'Por clase' },
  { value: 'ONE_TIME', label: 'Pago único' }
] as const;
export const billingCycleLabel = (value: string | null): string => billingCycles.find(c => c.value === value)?.label ?? value ?? '—';
export function planAvailable(plan: BillingPlan, date = localDate()): boolean {
  return plan.isActive && (!plan.validFrom || plan.validFrom <= date) && (!plan.validTo || plan.validTo >= date);
}

// The academy model has no currency setting. Format the neutral amount using the app locale.
@Pipe({ name: 'planAmount', standalone: true })
export class PlanAmountPipe implements PipeTransform {
  private locale = inject(LOCALE_ID);
  transform(value: number): string { return new Intl.NumberFormat(this.locale, { maximumFractionDigits: 2 }).format(value); }
}
