import { UntypedFormBuilder } from '@angular/forms';
import { Subject } from 'rxjs';
import { RegisterComponent } from './register.component';

describe('Registration RUN normalization', () => {
  it('sends a formatted RUN without periods and with uppercase verifier', () => {
    const auth = jasmine.createSpyObj('AuthService', ['register']);
    auth.register.and.returnValue(new Subject());
    const component = new RegisterComponent({} as any, new UntypedFormBuilder(), {} as any,
      jasmine.createSpyObj('Snackbar', ['open']), auth);
    component.countries = [{ id: 1, name: 'Chile', code: 'CL' }];
    component.onCountryChange(1);
    component.form.patchValue({ firstName: 'Persona', countryId: 1, documentNumber: '10.382.978-k',
      email: 'persona@example.invalid', password: 'Password123!', passwordConfirm: 'Password123!' });
    component.send();
    expect(auth.register).toHaveBeenCalledWith(jasmine.objectContaining({ documentNumber: '10382978-K' }));
    component.formatDocument();
    expect(component.form.controls['documentNumber'].value).toBe('10382978-K');
  });
});
