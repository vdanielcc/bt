import { fakeAsync, tick } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { convertToParamMap } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { ResetPasswordComponent } from './reset-password.component';

describe('ResetPasswordComponent', () => {
  function setup(token = 'email-token') {
    const auth = { resetPassword: jasmine.createSpy().and.returnValue(of(undefined)), clearSession: jasmine.createSpy() };
    const router = { navigate: jasmine.createSpy().and.returnValue(Promise.resolve(true)) };
    const route = { snapshot: { queryParamMap: convertToParamMap({ token }) } };
    const component = new ResetPasswordComponent(new FormBuilder(), route as any, router as any, auth as any);
    component.ngOnInit();
    return { component, auth, router };
  }

  it('does not submit a missing token, weak password or different confirmation', () => {
    const { component, auth } = setup('');
    component.form.setValue({ newPassword: 'Password1!', confirmPassword: 'Password1!' });
    component.send();
    expect(auth.resetPassword).not.toHaveBeenCalled();
    component.token = 'email-token';
    for (const password of ['short1!', 'Password!', 'Password1', '12345678!', 'Password 1!']) {
      component.form.setValue({ newPassword: password, confirmPassword: password });
      component.send();
    }
    component.form.setValue({ newPassword: 'Password1!', confirmPassword: 'Different1!' });
    component.send();
    expect(auth.resetPassword).not.toHaveBeenCalled();
    component.ngOnDestroy();
  });

  it('sends the email token once, clears sensitive fields and returns to login', fakeAsync(() => {
    const { component, auth, router } = setup();
    const pending = new Subject<void>();
    auth.resetPassword.and.returnValue(pending);
    component.form.setValue({ newPassword: 'Password1!', confirmPassword: 'Password1!' });
    component.send(); component.send();
    expect(auth.resetPassword).toHaveBeenCalledOnceWith({ token: 'email-token', newPassword: 'Password1!' });
    expect(component.submitting).toBeTrue();
    pending.next(); pending.complete();
    expect(component.completed).toBeTrue();
    expect(component.token).toBe('');
    expect(component.form.controls.newPassword.value).toBe('');
    expect(auth.clearSession).toHaveBeenCalled();
    tick(2500);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
    component.ngOnDestroy();
  }));

  it('shows an invalid or expired token response without reporting success', () => {
    const { component, auth } = setup();
    auth.resetPassword.and.returnValue(throwError(() => new Error('Token inválido o expirado.')));
    component.form.setValue({ newPassword: 'Password1!', confirmPassword: 'Password1!' });
    component.send();
    expect(component.errorMessage).toBe('Token inválido o expirado.');
    expect(component.submitting).toBeFalse();
    expect(component.completed).toBeFalse();
    expect(auth.clearSession).not.toHaveBeenCalled();
    component.ngOnDestroy();
  });
});
