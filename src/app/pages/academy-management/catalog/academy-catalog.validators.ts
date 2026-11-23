import { AbstractControl, ValidationErrors } from '@angular/forms';

export function academyAgeOrder(
  control: AbstractControl
): ValidationErrors | null {
  const minimum = control.get('minimumAge')?.value;
  const maximum = control.get('maximumAge')?.value;
  return minimum != null && maximum != null && minimum > maximum
    ? { ageOrder: true }
    : null;
}

export function requiredTrimmed(
  control: AbstractControl
): ValidationErrors | null {
  return typeof control.value === 'string' && control.value.trim()
    ? null
    : { required: true };
}
