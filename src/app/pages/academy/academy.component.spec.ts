import { ChangeDetectorRef } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { AcademyComponent } from './academy.component';
import { AcademyDetail, AcademyService } from './academy.service';

describe('AcademyComponent account form', () => {
  let component: AcademyComponent;
  let service: jasmine.SpyObj<AcademyService>;
  const academy: AcademyDetail = { id: 7, name: 'Mi academia', address: 'Direccion', website: 'https://example.org',
    phoneNumber: '123', logo: '/academies/7/2026/09/logo.jpeg', logoBase64: '', legalRepresentativeId: 4,
    sportsAssociationId: 2, communeId: 3 };

  beforeEach(() => {
    service = jasmine.createSpyObj('AcademyService', ['getAcademy', 'getOptions', 'updateAcademy', 'logoUrl']);
    service.getAcademy.and.returnValue(of(academy));
    service.getOptions.and.returnValue(of({ representatives: [{ id: 4, label: 'Representante' }], associations: [], communes: [] }));
    service.logoUrl.and.returnValue('https://api.example.org/api/Academies/7/logo');
    service.updateAcademy.and.returnValue(of(null));
    component = new AcademyComponent(new FormBuilder(), service,
      { getCurrentUser: () => ({ academieId: 7, rol: 'academy_admin' }) } as AuthService,
      { translate: (value: string) => value } as LanguageService,
      { open: jasmine.createSpy('open') } as unknown as MatSnackBar,
      { markForCheck: () => {} } as ChangeDetectorRef);
    component.ngOnInit();
  });

  it('loads the session academy and only its permitted representative', () => {
    expect(service.getAcademy).toHaveBeenCalledWith(7);
    expect(service.getOptions).toHaveBeenCalledWith(4);
    expect(component.form.getRawValue().name).toBe('Mi academia');
    expect(component.logoPreview).toBe('https://api.example.org/api/Academies/7/logo');
  });

  it('saves the complete contract and reloads persisted information after 204', () => {
    component.form.patchValue({ name: 'Nuevo nombre', logoBase64: 'new-image' });
    component.save();
    expect(service.updateAcademy).toHaveBeenCalledWith(7, { ...academy, name: 'Nuevo nombre', logoBase64: 'new-image' });
    expect(service.getAcademy).toHaveBeenCalledTimes(2);
    expect(component.form.getRawValue().logoBase64).toBe('');
  });

  it('does not submit while reading a logo or with invalid required fields', () => {
    component.readingLogo = true;
    component.save();
    component.readingLogo = false;
    component.form.patchValue({ name: '' });
    component.save();
    expect(service.updateAcademy).not.toHaveBeenCalled();
  });
});
