import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconRegistry } from '@angular/material/icon';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ClassListComponent } from './class-list.component';
import { environment } from '../../../../environments/environment';

describe('Class list', () => {
  const api = environment.apiBaseUrl;
  let http: HttpTestingController;
  let component: ClassListComponent;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ClassListComponent, HttpClientTestingModule, NoopAnimationsModule], providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ academyId: '7' })), snapshot: {} } }] });
    const fixture = TestBed.createComponent(ClassListComponent); component = fixture.componentInstance;
    spyOn(TestBed.inject(MatIconRegistry), 'getNamedSvgIcon').and.returnValue(of(document.createElementNS('http://www.w3.org/2000/svg', 'svg')));
    http = TestBed.inject(HttpTestingController); fixture.detectChanges();
    http.expectOne(`${api}/academies/7/classes/summary`).flush({ data: { total: 0, active: 0, inactive: 0, closed: 0 } });
    http.expectOne(`${api}/academies/7/training-modalities`).flush([]);
    http.expectOne(`${api}/academies/7/rooms`).flush([]);
  });
  afterEach(() => http.verify());
  it('shows loading until the list arrives and accepts an empty academy', () => {
    expect(component.loading).toBeTrue(); http.expectOne(`${api}/academies/7/classes`).flush({ data: [] });
    expect(component.loading).toBeFalse(); expect(component.courses).toEqual([]); expect(component.error).toBe('');
  });
  it('sends debounced filters to the API without repeating catalog or summary requests', fakeAsync(() => {
    http.expectOne(`${api}/academies/7/classes`).flush([]);
    component.filters.patchValue({ search: ' infantil ', status: 'ACTIVE', roomId: 2, trainingModalityId: 3 });
    tick(299); http.expectNone(request => request.url.endsWith('/classes'));
    tick(1); const request = http.expectOne(request => request.url.endsWith('/classes'));
    expect(request.request.params.get('search')).toBe('infantil'); expect(request.request.params.get('status')).toBe('ACTIVE');
    expect(request.request.params.get('trainingModalityId')).toBe('3'); expect(request.request.params.get('roomId')).toBe('2'); request.flush([]);
  }));
  it('keeps a retryable error distinct from an empty result', () => {
    http.expectOne(`${api}/academies/7/classes`).flush({}, { status: 500, statusText: 'Failure' });
    expect(component.error).toContain('No fue posible'); expect(component.loading).toBeFalse();
    component.load(); http.expectOne(`${api}/academies/7/classes`).flush([]); expect(component.error).toBe('');
  });
});
