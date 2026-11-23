import { FormBuilder } from '@angular/forms';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { StudentManagementComponent } from './student-management.component';
import { StudentManagementService } from './student-management.service';
import { StudentsService } from '../championships/students/students.service';
import { AuthService } from '../../core/auth/auth.service';
import { canAccessRoute } from '../../core/auth/route-access';

describe('Admin student management', () => {
  function setup() {
    const service = jasmine.createSpyObj('StudentManagementService', ['getAcademies', 'search', 'move']);
    const students = jasmine.createSpyObj('StudentsService', ['getStudent']);
    const dialog = jasmine.createSpyObj('MatDialog', ['open']);
    dialog.open.and.returnValue({ afterClosed: () => of(true) });
    service.move.and.returnValue(of({ message: 'Alumno trasladado.' }));
    const component = new StudentManagementComponent(new FormBuilder(), service, students, dialog);
    component.academies = [{ id: 1, name: 'Dojo Olímpico Norte' }, { id: 2, name: 'Dojo Sur' }];
    return { component, service, students, dialog };
  }
  it('allows the admin route only to the system admin', () => {
    expect(canAccessRoute({ rol: 'admin', academieId: 1 }, '/admin/students')).toBeTrue();
    expect(canAccessRoute({ rol: 'academy_admin', academieId: 1 }, '/admin/students')).toBeFalse();
    expect(canAccessRoute({ rol: 'alumno', academieId: 1 }, '/admin/students')).toBeFalse();
  });
  it('opens the existing creation form for the selected dojo', async () => {
    const { component, dialog } = setup();
    component.chooseMode('create'); component.sourceSearch = 'norte olimpico';
    expect(component.sourceOptions.map(a => a.id)).toEqual([1]);
    component.selectSource(2);
    expect(dialog.open.calls.mostRecent().args[1].data).toEqual(jasmine.objectContaining({ academyId: 2, academyName: 'Dojo Sur', systemAdmin: true, mode: 'student' }));
    await Promise.resolve();
    expect(component.success).toContain('Dojo Sur');
  });
  it('ignores search responses after the query changes', async () => {
    const { component, service } = setup(); const pending = new Subject<any>();
    service.search.and.returnValue(pending);
    component.chooseMode('move'); component.form.controls.query.setValue('Pedro');
    const search = component.search();
    component.form.controls.query.setValue('Soto'); component.resetResults();
    pending.next({ items: [{ id: 9 }], total: 1, page: 1, pageSize: 25 }); pending.complete(); await search;
    expect(component.results).toBeNull(); expect(component.sourceAcademyId).toBeNull();
    expect(component.searching).toBeFalse();
  });
  it('allows editing a student without a current dojo using the original document configuration', async () => {
    const { component, students, dialog } = setup();
    const student = { id: 9, firstName: 'Pedro', lastName: 'Soto', documentNumber: '123', academies: [] };
    students.getStudent.and.returnValue(of({ ...student, role: 'D', birthDate: '2010-01-01' }));
    component.chooseMode('edit');
    const opening = component.openStudent('edit', student);
    await Promise.resolve();
    expect(students.getStudent).toHaveBeenCalledWith(9, true);
    expect(dialog.open.calls.mostRecent().args[1].data).toEqual(jasmine.objectContaining({ academyId: 0, systemAdmin: true, mode: 'edit' }));
    await opening;
  });
  it('requires a selected destination and prevents moving to the same dojo', async () => {
    const { component, service } = setup(); component.chooseMode('move');
    component.selectStudent({ id: 9, firstName: 'Pedro', lastName: 'Soto', documentNumber: '123', academies: [{ id: 1, name: 'Dojo Norte' }] });
    expect(component.sourceAcademyId).toBe(1);
    expect(component.transferSourceName).toBe('Dojo Norte');
    component.changeDestination(1); await component.move(); expect(service.move).not.toHaveBeenCalled();
    component.changeDestination('Dojo Sur'); await component.move(); expect(service.move).not.toHaveBeenCalled();
    component.changeDestination(2); await component.move();
    expect(service.move).toHaveBeenCalledOnceWith(9, 1, 2);
    expect(component.selected).toBeNull(); expect(component.success).toContain('Dojo Sur');
  });
  for (const criterion of ['documentNumber', 'firstName', 'lastName'] as const) {
    it(`searches all dojos by ${criterion} without an origin selection`, async () => {
      const { component, service } = setup();
      service.search.and.returnValue(of({ items: [], total: 0, page: 2, pageSize: 25 }));
      component.chooseMode('move'); component.form.setValue({ criterion, query: ' Pedro ' });
      await component.search(2);
      expect(service.search).toHaveBeenCalledOnceWith(criterion, 'Pedro', null, 2);
      expect(component.results?.page).toBe(2);
    });
  }
  it('requires an explicit origin when the student belongs to multiple dojos', async () => {
    const { component, service } = setup();
    component.academies.push({ id: 3, name: 'Dojo Nuevo' });
    component.chooseMode('move');
    component.selectStudent({ id: 9, firstName: 'Pedro', lastName: 'Soto', documentNumber: '123', academies: [{ id: 1, name: 'Norte' }, { id: 2, name: 'Sur' }] });
    component.changeDestination(3); await component.move(); expect(service.move).not.toHaveBeenCalled();
    component.selectTransferSource(3); expect(component.sourceAcademyId).toBeNull();
    component.selectTransferSource(2); expect(component.destinationAcademyId).toBeNull();
    expect(component.destinationOptions.map(a => a.id)).toEqual([3]);
    component.changeDestination(3); await component.move();
    expect(service.move).toHaveBeenCalledOnceWith(9, 2, 3);
  });
  it('does not move a student with no associated dojo or keep the previous origin', async () => {
    const { component, service } = setup(); component.chooseMode('move');
    component.selectStudent({ id: 8, firstName: 'Ana', lastName: 'Soto', documentNumber: '123', academies: [{ id: 1, name: 'Norte' }] });
    component.selectStudent({ id: 9, firstName: 'Pedro', lastName: 'Soto', documentNumber: '456', academies: [] });
    expect(component.sourceAcademyId).toBeNull();
    component.changeDestination(2); await component.move();
    expect(service.move).not.toHaveBeenCalled();
  });
});

describe('Administrative student HTTP contracts', () => {
  let http: HttpTestingController; let service: StudentManagementService; let students: StudentsService;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [
      { provide: AuthService, useValue: { getCurrentUser: () => ({ academieId: 1 }), getCountries: () => of([]) } }
    ] });
    http = TestBed.inject(HttpTestingController); service = TestBed.inject(StudentManagementService); students = TestBed.inject(StudentsService);
  });
  afterEach(() => http.verify());
  it('sends the search criterion, academy and page to the admin endpoint', () => {
    service.search('documentNumber', '12.345.678-5', 2, 3).subscribe();
    const request = http.expectOne(r => r.url.endsWith('/admin/students/search'));
    expect(request.request.params.get('academyId')).toBe('2');
    expect(request.request.params.get('criterion')).toBe('documentNumber');
    expect(request.request.params.get('page')).toBe('3');
    request.flush({ items: [], total: 0, page: 3, pageSize: 25 });
  });
  it('creates in the selected academy without substituting the signed in academy', () => {
    students.createStudent({ firstName: 'Pedro', lastName: 'Soto' } as any, 2, true).subscribe();
    const request = http.expectOne(r => r.url.endsWith('/admin/students'));
    expect(request.request.method).toBe('POST'); expect(request.request.body.academiId).toBe(2);
    request.flush({});
  });
  it('loads the original document configuration when editing a moved student', () => {
    students.getDocumentConfiguration(2, 9).subscribe(configuration => {
      expect(configuration.countryCode).toBe('CL');
      expect(configuration.documentTypeId).toBe(1);
    });
    const request = http.expectOne(r => r.url.endsWith('/admin/students/9/document-configuration'));
    request.flush({ countryId: 1, countryCode: 'CL', documentTypeId: 1, documentLabel: 'RUT' });
  });
});
