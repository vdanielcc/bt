import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function instructorToday(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Santiago', year: 'numeric', month: 'numeric', day: 'numeric'
  }).formatToParts(now);
  const value = (type: string) => Number(parts.find(part => part.type === type)!.value);
  return new Date(value('year'), value('month') - 1, value('day'));
}

export function oneMonthBefore(date: Date): Date {
  const lastDay = new Date(date.getFullYear(), date.getMonth(), 0).getDate();
  return new Date(date.getFullYear(), date.getMonth() - 1, Math.min(date.getDate(), lastDay));
}

export function startDateNotBefore(minimum: Date): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    control.value instanceof Date && control.value < minimum ? { startTooOld: true } : null;
}

export function instructorDateOrder(control: AbstractControl): ValidationErrors | null {
  const start = control.get('startDate')?.value;
  const end = control.get('endDate')?.value;
  return start instanceof Date && end instanceof Date && end <= start ? { endNotAfterStart: true } : null;
}
