import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AcademyOperationsService } from '../services/academy-operations.service';
import { ClassManagementService } from '../services/class-management.service';
import { ClassEnrollmentDialogComponent } from './class-enrollment-dialog.component';
import { environment } from '../../../../environments/environment';
import { of, throwError, Subject } from 'rxjs';

describe('Class enrollment HTTP contracts', () => {
  let api: AcademyOperationsService; let http: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ imports: [HttpClientTestingModule] }); api = TestBed.inject(AcademyOperationsService); http = TestBed.inject(HttpTestingController); });
  afterEach(() => http.verify());
  it('sends server filters and unwraps the paginated list', () => {
    api.getEnrollments(8, 2, 'PAUSED', 'Pérez').subscribe(result => expect(result.total).toBe(1));
    const req = http.expectOne(r => r.url === `${environment.apiBaseUrl}/classes/8/enrollments`);
    expect(req.request.params.get('number')).toBe('2'); expect(req.request.params.get('status')).toBe('PAUSED'); expect(req.request.params.get('search')).toBe('Pérez');
    req.flush({ data: { items: [], total: 1, page: 2, pageSize: 100, totalPages: 1 } });
  });
  it('creates an enrollment without accepting academy, class or status in its body', () => {
    const value = { studentId: 15, enrollmentDate: '2026-03-01', billingPlanId: null, notes: null };
    api.enroll(8, value).subscribe(); const req = http.expectOne(`${environment.apiBaseUrl}/classes/8/enrollments`);
    expect(req.request.method).toBe('POST'); expect(req.request.body).toEqual(value); req.flush({ data: { id: 1 } });
  });
  it('queries bounded candidates and student classes using the existing academy API', () => {
    api.availableStudents(8, 'Juan').subscribe(); const req = http.expectOne(r => r.url.endsWith('/classes/8/available-students')); expect(req.request.params.get('search')).toBe('Juan'); req.flush({ data: [] });
    api.getStudentClasses(15).subscribe(); http.expectOne(r => r.url.endsWith('/students/15/class-enrollments')).flush({ data: { items: [] } });
  });
});

describe('Enrollment dialog business errors and duplicate submits', () => {
  let api: jasmine.SpyObj<AcademyOperationsService>; let ref: jasmine.SpyObj<MatDialogRef<ClassEnrollmentDialogComponent>>;
  beforeEach(() => {
    api = jasmine.createSpyObj('api', ['enroll', 'availableStudents']); api.availableStudents.and.returnValue(of([]));
    ref = jasmine.createSpyObj('ref', ['close']);
    TestBed.configureTestingModule({ providers: [
      { provide: AcademyOperationsService, useValue: api }, { provide: ClassManagementService, useValue: { getBillingPlans: () => of([]) } },
      { provide: MAT_DIALOG_DATA, useValue: { course: { id: 8, name: 'Karate' } } }, { provide: MatDialogRef, useValue: ref }
    ] });
  });
  function dialog(): ClassEnrollmentDialogComponent { const component = TestBed.runInInjectionContext(() => new ClassEnrollmentDialogComponent()); component.student.setValue({ studentId: 15, fullName: 'Juan Pérez', documentNumber: '123' }); return component; }
  it('keeps the dialog open and shows the backend conflict message', () => {
    api.enroll.and.returnValue(throwError(() => ({ status: 409, error: { message: 'La clase está completa.' } })));
    const component = dialog(); component.save(); expect(component.error).toBe('La clase está completa.'); expect(ref.close).not.toHaveBeenCalled(); expect(component.saving).toBeFalse();
  });
  it('ignores a second submit while the first request is pending', () => {
    const pending = new Subject<never>(); api.enroll.and.returnValue(pending); const component = dialog(); component.save(); component.save(); expect(api.enroll).toHaveBeenCalledTimes(1); expect(component.saving).toBeTrue(); pending.complete(); expect(component.saving).toBeFalse();
  });
  it('debounces candidate search and clears a prior selection when typing', fakeAsync(() => {
    const component = dialog(); component.student.setValue('Ju'); tick(301); expect(component.selected).toBeNull(); expect(api.availableStudents).toHaveBeenCalledWith(8, 'Ju');
  }));
});
