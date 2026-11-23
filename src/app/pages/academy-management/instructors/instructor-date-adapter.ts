import { Injectable } from '@angular/core';
import { MatDateFormats, NativeDateAdapter } from '@angular/material/core';

export const INSTRUCTOR_DATE_FORMATS: MatDateFormats = {
  parse: { dateInput: 'dd-mm-yyyy' },
  display: {
    dateInput: 'dd-mm-yyyy',
    monthYearLabel: { year: 'numeric', month: 'long' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' }
  }
};

@Injectable()
export class InstructorDateAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: Object): string {
    if (displayFormat === 'dd-mm-yyyy') {
      return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getFullYear()).padStart(4, '0')}`;
    }
    return super.format(date, displayFormat);
  }

  override parse(value: unknown): Date | null {
    if (value == null || value === '') return null;
    if (value instanceof Date) return value;
    if (typeof value !== 'string') return this.invalid();
    const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value.trim());
    if (!match) return this.invalid();
    const [, day, month, year] = match.map(Number);
    try {
      const date = this.createDate(year, month - 1, day);
      return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year ? date : this.invalid();
    } catch {
      return this.invalid();
    }
  }
}
