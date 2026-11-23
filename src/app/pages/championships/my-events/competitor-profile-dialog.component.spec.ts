import { of, Subject, throwError } from 'rxjs';
import { CompetitorProfileDialogComponent } from './competitor-profile-dialog.component';
import { EventSummaryComponent } from './event-summary.component';
import { EventInvitationsService } from '../invitations/event-invitations.service';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { environment } from '../../../../environments/environment';

describe('Fixture competitor profiles', () => {
  const profile = { competitorId: 101, studentId: 12, teamId: null, name: 'Deportista', academy: 'Dojo', modalities: ['KATA'], members: [] };
  it('loads the event-scoped profile with a GET', () => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [{ provide: AuthService, useValue: {} }] });
    const service = TestBed.inject(EventInvitationsService), http = TestBed.inject(HttpTestingController);
    service.getFixtureCompetitorProfile(37, 101).subscribe(result => expect(result).toEqual(profile));
    const request = http.expectOne(`${environment.apiBaseUrl}/Events/37/fixture-participants/competitors/101/profile`);
    expect(request.request.method).toBe('GET'); request.flush({ data: profile }); http.verify();
  });
  it('supports loading, retry and cancels pending requests when closed', () => {
    const pending = new Subject<any>();
    const service = jasmine.createSpyObj('service', ['getFixtureCompetitorProfile']);
    service.getFixtureCompetitorProfile.and.returnValues(throwError(() => ({ status: 403 })), of(profile), pending);
    const component = new CompetitorProfileDialogComponent({ eventId: 37, competitorId: 101 }, service);
    component.ngOnInit(); expect(component.error).toContain('permiso'); expect(component.loading).toBeFalse();
    component.load(); expect(component.profile).toEqual(profile); expect(component.error).toBe('');
    component.load(); expect(component.loading).toBeTrue(); component.ngOnDestroy();
    pending.next(profile); expect(component.profile).toBeUndefined();
  });
  for (const format of ['ELIMINACION', 'ROUNDROBIN', 'MEJORDETRES', 'KATAJKA']) {
    for (const role of ['admin', 'organizer', 'collaborator']) {
      it(`opens a read-only profile for ${role} in ${format}`, () => {
        const dialog = jasmine.createSpyObj('dialog', ['open']);
        const auth = { getCurrentUser: () => ({ rol: role === 'admin' ? 'admin' : 'academy_admin', academieId: role === 'organizer' ? 1 : 2 }) };
        const component = new EventSummaryComponent({} as any, auth as any, {} as any, {} as any, {} as any, {} as any, {} as any, dialog);
        component.eventId = 37; component.event = { id: 37, academyId: 1, coOrganizerAcademyIds: [2] } as any;
        component.fixture = { fixtureType: format, version: 1 };
        const before = JSON.stringify(component.fixture);
        component.viewCompetitorProfile({ competitorId: 101 });
        expect(dialog.open).toHaveBeenCalledOnceWith(CompetitorProfileDialogComponent, jasmine.objectContaining({ data: { eventId: 37, competitorId: 101 } }));
        expect(JSON.stringify(component.fixture)).toBe(before);
        component.ngOnDestroy();
      });
    }
  }
  it('does not open profiles for empty slots or unrelated academies', () => {
    const dialog = jasmine.createSpyObj('dialog', ['open']);
    const auth = { getCurrentUser: () => ({ rol: 'academy_admin', academieId: 9 }) };
    const component = new EventSummaryComponent({} as any, auth as any, {} as any, {} as any, {} as any, {} as any, {} as any, dialog);
    component.eventId = 37; component.event = { id: 37, academyId: 1 } as any;
    component.viewCompetitorProfile({ competitorId: 101 });
    component.viewCompetitorProfile({ competitorId: null }); expect(dialog.open).not.toHaveBeenCalled(); component.ngOnDestroy();
  });
});
