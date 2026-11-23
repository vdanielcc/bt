import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { AcademyCatalogDialogComponent } from './academy-catalog-dialog.component';
import { AcademyManagementService } from '../services/academy-management.service';
import { GradingManagementService } from '../services/grading-management.service';

describe('Formulario modalidades y salas', () => {
  function setup(kind: 'modalities' | 'rooms') {
    const api = jasmine.createSpyObj<AcademyManagementService>(
      'AcademyManagementService',
      ['createTrainingModality', 'createRoom']
    );
    const grading = jasmine.createSpyObj<GradingManagementService>(
      'GradingManagementService',
      ['getAcademyStyles', 'getMartialArtStyles', 'getSportsAssociations']
    );
    grading.getAcademyStyles.and.returnValue(
      of([
        {
          id: 12,
          academyId: 7,
          styleId: 2,
          sportsAssociationId: null,
          isPrimary: true,
          isActive: true
        }
      ])
    );
    grading.getMartialArtStyles.and.returnValue(
      of([
        { id: 2, code: 'K', name: 'Karate', description: null, isActive: true }
      ])
    );
    grading.getSportsAssociations.and.returnValue(of([]));
    const snack = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    const ref = jasmine.createSpyObj<
      MatDialogRef<AcademyCatalogDialogComponent>
    >('MatDialogRef', ['close']);
    TestBed.configureTestingModule({
      imports: [AcademyCatalogDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { kind, academyId: 7 } },
        { provide: AcademyManagementService, useValue: api },
        { provide: GradingManagementService, useValue: grading },
        { provide: MatSnackBar, useValue: snack },
        { provide: MatDialogRef, useValue: ref }
      ]
    });
    TestBed.overrideProvider(MatSnackBar, { useValue: snack });
    const fixture = TestBed.createComponent(AcademyCatalogDialogComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, api, snack, ref };
  }
  it('sends the selected academy style rather than clearing it', () => {
    const { component, api, ref } = setup('modalities');
    api.createTrainingModality.and.returnValue(
      of({
        id: 1,
        academyId: 7,
        academyStyleId: 12,
        code: null,
        name: 'Infantil',
        description: null,
        minimumAge: null,
        maximumAge: null,
        isActive: true
      })
    );
    component.form.patchValue({ name: 'Infantil', academyStyleId: 12 });
    component.save();
    expect(api.createTrainingModality).toHaveBeenCalledWith(
      7,
      jasmine.objectContaining({ academyStyleId: 12 })
    );
    expect(ref.close).toHaveBeenCalledWith(true);
  });
  it('rejects reversed ages before sending a request', () => {
    const { component, api } = setup('modalities');
    component.form.patchValue({
      name: 'Infantil',
      minimumAge: 12,
      maximumAge: 5
    });
    component.save();
    expect(api.createTrainingModality).not.toHaveBeenCalled();
  });
  it('rejects nonpositive room capacity and surfaces save errors without closing', () => {
    const { component, api, snack, ref } = setup('rooms');
    component.form.patchValue({ name: 'Sala', capacity: 0 });
    component.save();
    expect(api.createRoom).not.toHaveBeenCalled();
    component.form.controls.capacity.setValue(10);
    api.createRoom.and.returnValue(
      throwError(() => ({
        error: { message: 'Ya existe una sala con ese nombre.' }
      }))
    );
    component.save();
    expect(snack.open).toHaveBeenCalledWith(
      'Ya existe una sala con ese nombre.',
      'Cerrar',
      jasmine.any(Object)
    );
    expect(component.saving).toBeFalse();
    expect(ref.close).not.toHaveBeenCalled();
  });
});
