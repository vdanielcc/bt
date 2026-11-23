import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { AcademyStylesComponent } from './academy-styles.component';
import { GradingManagementService } from '../services/grading-management.service';
import { AcademyStyle } from '../models/academy-management.models';

describe('Estilos y federaciones de academia', () => {
  const association: AcademyStyle = {
    id: 8,
    academyId: 7,
    styleId: 2,
    sportsAssociationId: 3,
    isPrimary: false,
    isActive: true
  };
  function setup() {
    const service = jasmine.createSpyObj<GradingManagementService>(
      'GradingManagementService',
      [
        'getAcademyStyles',
        'getMartialArtStyles',
        'getSportsAssociations',
        'updateAcademyStyle',
        'deleteAcademyStyle'
      ]
    );
    service.getAcademyStyles.and.returnValue(of([association]));
    service.getMartialArtStyles.and.returnValue(
      of([
        { id: 2, code: 'K', name: 'Karate', description: null, isActive: true }
      ])
    );
    service.getSportsAssociations.and.returnValue(
      of([{ id: 3, name: 'Federación' }])
    );
    service.updateAcademyStyle.and.returnValue(of(undefined));
    service.deleteAcademyStyle.and.returnValue(of(undefined));
    const dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    const snack = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    TestBed.configureTestingModule({
      imports: [AcademyStylesComponent, NoopAnimationsModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ academyId: '7' }) }
          }
        },
        { provide: GradingManagementService, useValue: service },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snack },
        {
          provide: AuthService,
          useValue: {
            getCurrentUser: () => ({ rol: 'academy_admin', academieId: 7 })
          }
        }
      ]
    });
    TestBed.overrideProvider(MatSnackBar, { useValue: snack });
    TestBed.overrideProvider(MatDialog, { useValue: dialog });
    const fixture = TestBed.createComponent(AcademyStylesComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, service, snack };
  }
  it('uses the route academy and renders resolved style and federation names', () => {
    const { fixture, service } = setup();
    expect(service.getAcademyStyles).toHaveBeenCalledWith(7);
    expect(fixture.nativeElement.textContent).toContain('Karate');
    expect(fixture.nativeElement.textContent).toContain('Federación');
    expect(fixture.nativeElement.textContent).not.toContain(
      'Catálogo de estilos / disciplinas'
    );
  });
  it('requests the primary change from the backend without modifying other rows locally', () => {
    const { component, service } = setup();
    component.updateAssociation(association, true);
    expect(service.updateAcademyStyle).toHaveBeenCalledWith(
      7,
      8,
      jasmine.objectContaining({ isPrimary: true, isActive: true })
    );
    expect(association.isPrimary).toBeFalse();
  });
  it('shows backend loading errors separately from an empty list', () => {
    const { fixture, component, service } = setup();
    service.getAcademyStyles.and.returnValue(
      throwError(() => ({
        error: { message: 'Sin permiso para esta academia.' }
      }))
    );
    component.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Sin permiso para esta academia.'
    );
    expect(fixture.nativeElement.textContent).not.toContain(
      'Aún no hay estilos asociados.'
    );
  });
  it('surfaces a duplicate conflict from the API', () => {
    const { component, service, snack } = setup();
    service.updateAcademyStyle.and.returnValue(
      throwError(() => ({
        status: 409,
        error: { message: 'Estilo ya asociado.' }
      }))
    );
    component.updateAssociation(association, true);
    expect(snack.open).toHaveBeenCalledWith(
      'Estilo ya asociado.',
      'Cerrar',
      jasmine.any(Object)
    );
    expect(component.busy).toBeFalse();
  });
});
