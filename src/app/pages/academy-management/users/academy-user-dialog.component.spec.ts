import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, Subject, throwError } from 'rxjs';
import { AcademyUserDialogComponent } from './academy-user-dialog.component';
import { AcademyUser, AcademyUsersService } from './academy-users.service';

describe('AcademyUserDialogComponent', () => {
  let api: jasmine.SpyObj<AcademyUsersService>;
  let ref: jasmine.SpyObj<MatDialogRef<AcademyUserDialogComponent>>;
  const user: AcademyUser = { id: 10, personId: 20, firstName: 'Ana', lastName: 'Pérez',
    email: 'ana@example.com', role: 'alumno', isActive: true };

  function setup(edit = false, systemAdmin = false): AcademyUserDialogComponent {
    api = jasmine.createSpyObj('AcademyUsersService', ['options', 'people', 'create', 'update']);
    api.options.and.returnValue(of({ countryId: 1, countryName: 'Chile', documentTypes: [{ id: 1, name: 'RUN' }] }));
    api.people.and.returnValue(of([{ id: 20, firstName: 'Ana', lastName: 'Pérez', documentNumber: '123' }]));
    api.create.and.returnValue(of(user)); api.update.and.returnValue(of(user));
    ref = jasmine.createSpyObj('MatDialogRef', ['close']);
    TestBed.configureTestingModule({ imports: [AcademyUserDialogComponent, NoopAnimationsModule], providers: [
      { provide: MAT_DIALOG_DATA, useValue: { academyId: 7, systemAdmin, user: edit ? user : undefined } },
      { provide: MatDialogRef, useValue: ref }, { provide: AcademyUsersService, useValue: api }
    ] });
    const fixture = TestBed.createComponent(AcademyUserDialogComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }
  function credentials(component: AcademyUserDialogComponent): void {
    component.form.patchValue({ email: 'ana@example.com', role: 'alumno', password: 'Password123!', passwordConfirm: 'Password123!' });
  }

  it('creates an account for the selected registered person without recreating the person', fakeAsync(() => {
    const component = setup(); tick(250); credentials(component); component.personId.setValue(20);
    component.save();
    expect(api.create).toHaveBeenCalledWith(7, { personId: 20, email: 'ana@example.com', role: 'alumno', password: 'Password123!' });
    expect(ref.close).toHaveBeenCalledWith(true);
  }));
  it('submits new person and account in one request', fakeAsync(() => {
    const component = setup(); tick(250); credentials(component); component.mode.setValue('new');
    component.person.setValue({ firstName: 'Ana', lastName: 'Pérez', birthDate: '2010-01-01', gender: 'Female', documentTypeId: 1, documentNumber: '123' });
    component.save();
    const body = api.create.calls.mostRecent().args[1];
    expect(body.person?.firstName).toBe('Ana'); expect(body.personId).toBeUndefined();
  }));
  it('normalizes the RUN before submitting a new person and rejects invalid verifiers', fakeAsync(() => {
    const component = setup(); tick(250); credentials(component); component.mode.setValue('new');
    component.options!.documentTypes[0].code = 'RUN';
    component.person.setValue({ firstName: 'Ana', lastName: 'Perez', birthDate: '2010-01-01', gender: 'Female', documentTypeId: 1, documentNumber: '10.382.978-3' });
    component.save();
    expect(api.create).not.toHaveBeenCalled();
    component.person.controls.documentNumber.setValue('10.382.978-k');
    component.save();
    expect(api.create.calls.mostRecent().args[1].person?.documentNumber).toBe('10382978-K');
  }));

  it('rejects missing person, short passwords and mismatched confirmation', fakeAsync(() => {
    const component = setup(); tick(250); credentials(component); component.save();
    expect(api.create).not.toHaveBeenCalled();
    component.personId.setValue(20); component.form.controls.password.setValue('short'); component.save();
    expect(api.create).not.toHaveBeenCalled();
    component.form.controls.password.setValue('OtherPassword123!'); component.save();
    expect(api.create).not.toHaveBeenCalled();
  }));
  it('prevents duplicate submissions while saving', fakeAsync(() => {
    const component = setup(); tick(250); credentials(component); component.personId.setValue(20);
    const pending = new Subject<AcademyUser>(); api.create.and.returnValue(pending);
    component.save(); component.save();
    expect(api.create).toHaveBeenCalledTimes(1); expect(ref.disableClose).toBe(true);
    pending.next(user); pending.complete();
  }));
  it('keeps form data after a duplicate email response', fakeAsync(() => {
    const component = setup(); tick(250); credentials(component); component.personId.setValue(20);
    api.create.and.returnValue(throwError(() => ({ status: 409, error: { message: 'El correo ya tiene una cuenta.' } })));
    component.save();
    expect(component.error).toBe('El correo ya tiene una cuenta.');
    expect(component.form.controls.email.value).toBe('ana@example.com');
    expect(component.saving).toBe(false); expect(ref.close).not.toHaveBeenCalled();
  }));
  it('edits account state and role without resubmitting person or password', () => {
    const component = setup(true);
    component.form.patchValue({ role: 'apoderado', isActive: false }); component.save();
    expect(api.update).toHaveBeenCalledWith(7, 10, { email: 'ana@example.com', role: 'apoderado', isActive: false });
    expect(api.people).not.toHaveBeenCalled(); expect(api.create).not.toHaveBeenCalled();
  });
  it('keeps the three limited profiles for academy administrators', fakeAsync(() => {
    const component = setup(); tick(250);
    expect(component.roles.map(r => r.value)).toEqual(['instructor', 'apoderado', 'alumno']);
  }));
  for (const role of ['admin', 'academy_admin'] as const) {
    it(`allows the system admin to create ${role} in the selected academy`, fakeAsync(() => {
      const component = setup(false, true); tick(250); credentials(component);
      component.personId.setValue(20); component.form.controls.role.setValue(role); component.save();
      expect(component.roles.length).toBe(5);
      expect(api.create).toHaveBeenCalledWith(7, { personId: 20, email: 'ana@example.com', role, password: 'Password123!' });
    }));
  }
});
