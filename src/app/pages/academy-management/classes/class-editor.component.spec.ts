import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ClassEditorComponent } from './class-editor.component';
import { AcademyConfirmDialogComponent } from '../shared/academy-confirm-dialog.component';
import { environment } from '../../../../environments/environment';
import { AcademyClass } from '../models/academy-management.models';

describe('Class editor', () => {
  const api = environment.apiBaseUrl;
  let component: ClassEditorComponent;
  let http: HttpTestingController;
  function setup(course?: AcademyClass): void {
    TestBed.configureTestingModule({ imports: [ClassEditorComponent, HttpClientTestingModule, NoopAnimationsModule] });
    const fixture = TestBed.createComponent(ClassEditorComponent);
    fixture.componentRef.setInput('academyId', 7);
    if (course) fixture.componentRef.setInput('course', course);
    component = fixture.componentInstance; http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(`${api}/academies/7/training-modalities`).flush([{ id: 1, academyId: 7, name: 'Karate', isActive: true }, { id: 2, academyId: 7, name: 'Histórica', isActive: false }]);
    http.expectOne(`${api}/academies/7/rooms`).flush([{ id: 1, academyId: 7, name: 'Dojo', isActive: true }, { id: 2, academyId: 7, name: 'Histórica', isActive: false }]);
    component.form.patchValue({ name: ' Karate Infantil A ', trainingModalityId: 1, capacity: 20, startDate: '2026-03-01', endDate: '2026-12-15' });
  }
  afterEach(() => http?.verify());

  it('loads only active options for a new class', () => {
    setup(); expect(component.modalities.map(x => x.id)).toEqual([1]); expect(component.rooms.map(x => x.id)).toEqual([1]);
  });
  it('retains inactive references already assigned while editing', () => {
    setup({ id: 10, academyId: 7, trainingModalityId: 2, defaultRoomId: 2, name: 'Historical', code: null, description: null, capacity: null, startDate: null, endDate: null, status: 'INACTIVE', isActive: false });
    expect(component.modalities.map(x => x.id)).toEqual([1, 2]); expect(component.rooms.map(x => x.id)).toEqual([1, 2]);
  });
  it('rejects empty names, missing modalities, invalid capacity and reversed dates', () => {
    setup();
    for (const value of [{ name: '  ' }, { trainingModalityId: null }, { capacity: 0 }, { capacity: -1 }, { capacity: 1.5 }, { startDate: '2027-01-01', endDate: '2026-12-15' }]) {
      component.form.patchValue({ name: 'Karate', trainingModalityId: 1, capacity: 20, startDate: '2026-03-01', endDate: '2026-12-15', ...value });
      component.save(); expect(component.form.invalid).toBeTrue();
    }
    http.expectNone(`${api}/academies/7/classes`);
  });
  it('submits nullable fields, unwraps the created record and prevents double submission', () => {
    setup(); component.form.patchValue({ capacity: null, endDate: '', defaultRoomId: null });
    const emitted = jasmine.createSpy('saved'); component.saved.subscribe(emitted);
    component.save(); component.save();
    const request = http.expectOne(`${api}/academies/7/classes`);
    expect(request.request.method).toBe('POST'); expect(request.request.body.name).toBe('Karate Infantil A');
    expect(request.request.body.endDate).toBeNull(); expect(request.request.body.capacity).toBeNull();
    expect(request.request.body.academyId).toBeUndefined(); expect(request.request.body.isActive).toBeUndefined();
    request.flush({ estado: 'success', codigo: 201, data: { id: 10, name: 'Karate Infantil A' } });
    expect(emitted.calls.first().args[0].id).toBe(10);
  });
  it('keeps values and exposes useful business errors after a failed submit', () => {
    setup(); component.save();
    http.expectOne(`${api}/academies/7/classes`).flush({ message: 'Ya existe una clase con ese nombre.' }, { status: 409, statusText: 'Conflict' });
    expect(component.form.enabled).toBeTrue(); expect(component.saving).toBeFalse();
    expect(component.form.controls.name.value).toBe('Karate Infantil A'); expect(component.error).toContain('Ya existe');
  });
  it('requires Material confirmation before saving a closed class', () => {
    setup(); component.form.controls.status.setValue('CLOSED');
    const open = spyOn(TestBed.inject(MatDialog), 'open').and.returnValue({ afterClosed: () => of(false) } as unknown as MatDialogRef<AcademyConfirmDialogComponent>);
    component.save(); expect(open).toHaveBeenCalled(); http.expectNone(`${api}/academies/7/classes`);
  });
});
