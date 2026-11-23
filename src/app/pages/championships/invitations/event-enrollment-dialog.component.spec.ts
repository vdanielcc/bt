import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { EventInvitationsService } from './event-invitations.service';
import { EventEnrollmentDialogComponent } from './event-enrollment-dialog.component';
import { EventInvitation } from './event-invitation.model';
import { environment } from '../../../../environments/environment';

describe('Event enrollment limits', () => {
  let component: EventEnrollmentDialogComponent;
  let service: jasmine.SpyObj<EventInvitationsService>;
  let snack: jasmine.SpyObj<MatSnackBar>;
  let dialog: jasmine.SpyObj<MatDialogRef<EventEnrollmentDialogComponent>>;
  const event: EventInvitation = { id: 34, name: 'Evento', poster: '', eventDateCheckin: '', maxCategoriesPerRegistration: 2 };
  const categories = Array.from({ length: 6 }, (_, index) => ({ id: index + 1, name: index === 5 ? 'Coach' : 'Kumite', modality: 'Karate' }));
  beforeEach(() => {
    service = jasmine.createSpyObj('EventInvitationsService', ['getEligibleCategories', 'getEvent', 'enroll', 'enrollTeam']);
    service.getEligibleCategories.and.returnValue(of(categories));
    service.getEvent.and.returnValue(of({ ...event }));
    service.enroll.and.returnValue(of({}));
    service.enrollTeam.and.returnValue(of({}));
    snack = jasmine.createSpyObj('MatSnackBar', ['open']);
    dialog = jasmine.createSpyObj('MatDialogRef', ['close']);
    component = new EventEnrollmentDialogComponent({ event: { ...event }, student: { id: 23 } }, dialog, service, snack,
      { translate: (text: string) => text } as LanguageService, { markForCheck: () => {} } as ChangeDetectorRef);
    component.ngOnInit(); component.priceReady = true;
  });
  it('reloads the current limit from the API and accepts exactly that many categories', () => {
    expect(service.getEvent).toHaveBeenCalledWith(34);
    component.selectedIds = new Set([1, 2]); component.save();
    expect(service.enroll).toHaveBeenCalledWith(34, 23, [1, 2], undefined, undefined);
  });
  it('blocks expired registrations for ordinary users even when the dialog was already open', () => {
    component.data.event.registrationClosesAtUtc = new Date(Date.now() - 1000).toISOString();
    component.data.event.eventDateCheckin = '2099-01-01T12:00:00';
    component.selectedIds = new Set([1]); component.save();
    expect(service.enroll).not.toHaveBeenCalled();
    expect(snack.open.calls.mostRecent().args[0]).toContain('cerradas');
  });
  it('allows organizer enrollment after close without an exception reason', () => {
    component.data.event.registrationClosesAtUtc = new Date(Date.now() - 1000).toISOString();
    component.data.event.canOverrideRegistrationClose = true;
    component.selectedIds = new Set([1]); component.save();
    expect(service.enroll).toHaveBeenCalledWith(34, 23, [1], undefined, undefined);
  });
  it('loads and enrolls teams without treating their IDs as student IDs', () => {
    component.data.student = { id: 23, rol: 'Team' };
    component.load();
    expect(service.getEligibleCategories).toHaveBeenCalledWith(34, 23, 'Team');
    component.selectedIds.add(1);
    component.priceReady = true;
    component.save();
    expect(service.enrollTeam).toHaveBeenCalledWith(34, 23, [1], undefined);
    expect(service.enroll).not.toHaveBeenCalled();
  });
  it('counts all selected categories and does not give Coach an extra slot', () => {
    component.selectedIds = new Set([1, 2, 6]); component.save();
    expect(service.enroll).not.toHaveBeenCalled();
    expect(snack.open.calls.mostRecent().args[0]).toContain('máximo de 2');
  });
  it('uses zero as no configured limit instead of falling back to four', () => {
    component.data.event.maxCategoriesPerRegistration = 0;
    component.selectedIds = new Set([1, 2, 3, 4, 5]); component.save();
    expect(service.enroll).toHaveBeenCalled();
  });
  it('does not send duplicate submissions while saving', () => {
    service.enroll.and.returnValue(new Subject());
    component.selectedIds.add(1); component.save(); component.save();
    expect(service.enroll).toHaveBeenCalledTimes(1);
  });
  it('keeps selections and displays the API business error', () => {
    service.enroll.and.returnValue(throwError(() => new HttpErrorResponse({ status: 422, error: { message: 'Máximo permitido: 1' } })));
    component.selectedIds = new Set([1, 2]); component.save();
    expect(snack.open.calls.mostRecent().args[0]).toBe('Máximo permitido: 1');
    expect(dialog.close).not.toHaveBeenCalled(); expect(component.selectedIds.size).toBe(2);
  });
  it('explains a permission failure instead of hiding it as a generic error', () => {
    service.enroll.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    component.selectedIds.add(1); component.save();
    expect(snack.open.calls.mostRecent().args[0]).toContain('No tienes permiso');
  });
});

describe('Enrollment academy scope request', () => {
  it('sends the session academy with the student and selected categories', () => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    const http = TestBed.inject(HttpClient);
    const requests = TestBed.inject(HttpTestingController);
    const service = new EventInvitationsService(http,
      { getCurrentUser: () => ({ academieId: 9 }) } as AuthService);
    service.enroll(34, 23, [1]).subscribe();
    const request = requests.expectOne(`${environment.apiBaseUrl}/Competitors/enroll`);
    expect(request.request.body).toEqual({ eventId: 34, studentId: 23, academyId: 9, categoryIds: [1] });
    request.flush({}); requests.verify();
  });
});
