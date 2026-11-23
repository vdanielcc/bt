import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { StudentDialogComponent } from './student-dialog.component';
import { validStudentDocument, normalizeStudentDocument } from './student-document';

describe('Student national documents', () => {
  for (const [country, value, valid] of [
    ['CL', '12.345.678-5', true], ['CL', '123456785', true],
    ['CL', '12.345.678-4', false], ['CL', '00000000-0', false],
    ['CL', 'abc12345678-5', false], ['CL', '1-9', false],
    ['BR', '529.982.247-25', true], ['BR', '52998224725', true],
    ['BR', '52998224724', false], ['BR', '11111111111', false],
    ['BR', '00000000000', false], ['BR', 'abc52998224725', false]
  ] as const) {
    it(`${country}: ${value} validity is ${valid}`, () => {
      expect(validStudentDocument(value, country)).toBe(valid);
    });
  }

  function dialog(countryCode: string) {
    const service = jasmine.createSpyObj('StudentsService', ['getDocumentConfiguration', 'createStudent']);
    service.getDocumentConfiguration.and.returnValue(of({ countryId: 20, countryCode,
      documentTypeId: 30, documentLabel: countryCode === 'BR' ? 'CPF' : 'RUT' }));
    service.createStudent.and.returnValue(of({}));
    const component = new StudentDialogComponent(new FormBuilder(), service,
      { translate: (text: string) => text } as any, jasmine.createSpyObj('Dialog', ['close']),
      { mode: 'student', students: [] });
    component.personForm.patchValue({ firstName: 'Alumno', lastName: 'Prueba',
      birthDate: new Date(2010, 0, 1), gender: 'M', rol: 'D' });
    return { component, service };
  }

  it('loads Brazil from the academy, validates CPF and sends the resolved IDs', () => {
    const { component, service } = dialog('BR');
    component.ngOnInit();
    expect(component.documentLabel).toBe('CPF');
    component.personForm.controls.documentNumber.setValue('529.982.247-24');
    component.submit();
    expect(service.createStudent).not.toHaveBeenCalled();
    component.personForm.controls.documentNumber.setValue('529.982.247-25');
    component.submit();
    expect(service.createStudent.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({
      countryId: 20, documentTypeId: 30, documentNumber: '52998224725', documentSize: null
    }));
  });

  it('loads Chile and rejects a CPF', () => {
    const { component, service } = dialog('CL');
    component.ngOnInit();
    expect(component.documentLabel).toBe('RUT');
    component.personForm.controls.documentNumber.setValue('52998224725');
    component.submit();
    expect(service.createStudent).not.toHaveBeenCalled();
    expect(normalizeStudentDocument('12.345.678-5', 'CL')).toBe('12345678-5');
  });

  it('sends a Chilean RUN without periods and preserves its verifier', () => {
    const { component, service } = dialog('CL');
    component.ngOnInit();
    component.personForm.controls.documentNumber.setValue('10.382.978-k');
    component.submit();
    expect(service.createStudent.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ documentNumber: '10382978-K' }));
    expect(normalizeStudentDocument('10.382.978-k', 'CL')).toBe(normalizeStudentDocument('10382978-K', 'CL'));
  });

  it('blocks saving when country loading fails and allows retrying', () => {
    const { component, service } = dialog('BR');
    service.getDocumentConfiguration.and.returnValue(throwError(() => new Error('offline')));
    component.ngOnInit();
    component.submit();
    expect(service.createStudent).not.toHaveBeenCalled();
    expect(component.loadingDocument).toBeFalse();
    service.getDocumentConfiguration.and.returnValue(of({ countryId: 20, countryCode: 'BR', documentTypeId: 30, documentLabel: 'CPF' }));
    component.loadDocumentConfiguration();
    expect(component.documentLabel).toBe('CPF');
    expect(component.errorMessage).toBe('');
  });
});
