import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EventAdminService, EventUpdate } from './event-admin.service';
import { environment } from '../../../../environments/environment';

describe('Event PDF persistence confirmation', () => {
  let service: EventAdminService;
  let http: HttpTestingController;
  const url = `${environment.apiBaseUrl}/Events/59`;
  const value = { rulesDocument: null, rulesDocumentBase64: btoa('%PDF-1.4\n%%EOF') } as EventUpdate;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(EventAdminService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('sends PDF bytes and confirms the saved path after a 204 response', () => {
    let confirmed = false;
    service.update(59, value).subscribe(() => confirmed = true);
    const update = http.expectOne(url);
    expect(update.request.method).toBe('PUT');
    expect(update.request.body.rulesDocumentBase64).toBe(value.rulesDocumentBase64);
    update.flush(null, { status: 204, statusText: 'No Content' });
    expect(confirmed).toBeFalse();
    const verification = http.expectOne(url); expect(verification.request.method).toBe('GET');
    verification.flush({ data: { id: 59, rulesDocument: '/events/59/2026/11/rules/rules-new.pdf' } });
    expect(confirmed).toBeTrue();
  });
  it('reports failure if the API returns success without persisting the PDF', () => {
    let message = '';
    service.update(59, value).subscribe({ next: () => fail('Must not report success'), error: error => message = error.error.message });
    http.expectOne(url).flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne(url).flush({ data: { id: 59, rulesDocument: null } });
    expect(message).toContain('no confirmó las bases');
  });
  it('requires a different persisted path when replacing an existing PDF', () => {
    const previous = '/events/59/2026/11/rules/rules-old.pdf';
    let rejected = false;
    service.update(59, { ...value, rulesDocument: previous }).subscribe({ next: () => fail('Must confirm replacement'), error: () => rejected = true });
    http.expectOne(url).flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne(url).flush({ data: { id: 59, rulesDocument: previous } });
    expect(rejected).toBeTrue();
  });
});
