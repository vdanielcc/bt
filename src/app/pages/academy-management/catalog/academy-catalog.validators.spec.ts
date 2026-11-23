import { FormControl, FormGroup } from '@angular/forms';
import { academyAgeOrder, requiredTrimmed } from './academy-catalog.validators';

describe('Validación de configuración de academia', () => {
  it('allows optional ages and equal bounds, and rejects reversed bounds', () => {
    const form = new FormGroup(
      {
        minimumAge: new FormControl<number | null>(null),
        maximumAge: new FormControl<number | null>(null)
      },
      { validators: academyAgeOrder }
    );
    expect(form.valid).toBeTrue();
    form.setValue({ minimumAge: 10, maximumAge: 10 });
    expect(form.valid).toBeTrue();
    form.setValue({ minimumAge: 11, maximumAge: 10 });
    expect(form.hasError('ageOrder')).toBeTrue();
    form.setValue({ minimumAge: 11, maximumAge: null });
    expect(form.valid).toBeTrue();
  });
  it('rejects names containing only whitespace', () => {
    const name = new FormControl('  ', requiredTrimmed);
    expect(name.invalid).toBeTrue();
    name.setValue(' Karate Infantil ');
    expect(name.valid).toBeTrue();
  });
});
