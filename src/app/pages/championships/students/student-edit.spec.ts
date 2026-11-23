import { HttpClient } from '@angular/common/http';
import { FormBuilder } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { StudentDialogComponent } from './student-dialog.component';
import { StudentsService } from './students.service';
import { AcademyStudent } from './students.models';

describe('Student editing', () => {
  const student: AcademyStudent = { id: 12, firstName: 'Soledad', lastName: 'Apellido',
    role: 'D', birthDate: '2009-04-21', gender: 'F', documentNumber: '12345678-5',
    level: 'KYU B', modalities: ['KATA', 'PARA-KARATE'], height: 0 };
  let component: StudentDialogComponent;
  let service: jasmine.SpyObj<StudentsService>;
  beforeEach(() => {
    service = jasmine.createSpyObj('StudentsService', ['getDocumentConfiguration', 'updateStudent', 'createStudent']);
    service.getDocumentConfiguration.and.returnValue(of({ countryId: 1, countryCode: 'CL', documentTypeId: 2, documentLabel: 'RUT' }));
    service.updateStudent.and.returnValue(of({}));
    component = new StudentDialogComponent(new FormBuilder(), service,
      { translate: (text: string) => text } as LanguageService,
      jasmine.createSpyObj<MatDialogRef<StudentDialogComponent>>('Dialog', ['close']),
      { mode: 'edit', student, students: [student] });
    component.ngOnInit();
  });
  it('loads level and selected modalities and submits the same identity fields as creation', () => {
    expect(component.personForm.value.kata).toBeTrue();
    expect(component.personForm.value.paraKarate).toBeTrue();
    component.submit();
    expect(service.updateStudent).toHaveBeenCalledWith(12, jasmine.objectContaining({
      firstName: 'Soledad', documentNumber: '12345678-5', countryId: 1, documentTypeId: 2,
      birthDate: '2009-04-21', rol: 'D', level: 'KYU B', modalities: ['KATA', 'PARA-KARATE'], height: null
    }));
    expect(service.updateStudent.calls.mostRecent().args[1]).not.toEqual(jasmine.objectContaining({ phone: 0 }));
  });
  for (const mode of ['student', 'edit'] as const) {
    it(`allows ${mode} with empty height`, () => {
      service.createStudent.and.returnValue(of({}));
      component = new StudentDialogComponent(new FormBuilder(), service,
        { translate: (text: string) => text } as LanguageService,
        jasmine.createSpyObj<MatDialogRef<StudentDialogComponent>>('Dialog', ['close']),
        { mode, student, students: [student] });
      component.ngOnInit();
      expect(component.personForm.controls.height.value).toBeNull();
      component.personForm.controls.height.setValue(1.65);
      component.personForm.controls.height.setValue(null);
      expect(component.personForm.controls.height.valid).toBeTrue();
      component.submit();
      const payload = mode === 'edit'
        ? service.updateStudent.calls.mostRecent().args[1]
        : service.createStudent.calls.mostRecent().args[0];
      expect(payload.height).toBeNull();
    });
  }
  it('validates edited documents before sending the update', () => {
    component.personForm.controls.documentNumber.setValue('12345678-0');
    component.submit();
    expect(service.updateStudent).not.toHaveBeenCalled();
    expect(component.personForm.controls.documentNumber.hasError('document')).toBeTrue();
  });
  it('clears competition fields when changing to coach', () => {
    component.personForm.controls.rol.setValue('C');
    component.submit();
    expect(service.updateStudent.calls.mostRecent().args[1]).toEqual(jasmine.objectContaining({ level: '', modalities: [] }));
  });
  it('displays the deserialization error returned by API validation', () => {
    service.updateStudent.and.returnValue(throwError(() => ({ error: { errors: { '$.phone': ['El teléfono debe ser texto.'] } } })));
    component.submit();
    expect(component.errorMessage).toBe('El teléfono debe ser texto.');
    expect(component.saving).toBeFalse();
  });
  it('retains the coach role from the detail endpoint', () => {
    const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
    http.get.and.returnValue(of({ data: { id: 12, firstName: 'Coach', rol: 'Coach', level: 'OPEN', modalities: ['KUMITE'] } }));
    const realService = new StudentsService(http, {} as AuthService);
    realService.getStudent(12).subscribe(result => {
      expect(result.role).toBe('Coach');
      expect(result.level).toBe('OPEN');
      expect(result.modalities).toEqual(['KUMITE']);
    });
  });
});
