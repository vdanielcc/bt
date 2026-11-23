import { EventDetailComponent } from './event-detail.component';
import { EventInvitationsService } from './event-invitations.service';
import { of } from 'rxjs';
import { fakeAsync, tick } from '@angular/core/testing';

describe('Invitation registration list', () => {
  const athlete = { id: 5, nombres: 'Ana', apellidos: 'Perez', rol: 'Sportman', fechaNacimiento: '2010-01-01' };
  const team = { id: 5, nombres: 'Kata Equipo Femenino', apellidos: 'Academia A', rol: 'Team', fechaNacimiento: '0001-01-01' };
  let component: EventDetailComponent;
  beforeEach(() => {
    component = new EventDetailComponent({} as any, {} as any, {} as any, {} as any,
      {} as any, {} as any, { translate: (s: string) => s } as any, {} as any);
    component.students = [athlete, team];
  });
  it('keeps athletes and teams, including matching IDs, in pagination', () => {
    expect(component.filteredStudents).toEqual([athlete, team]);
    component.studentPageSize = 1;
    component.studentPageIndex = 1;
    expect(component.pagedStudents).toEqual([team]);
  });
  it('finds teams by name and displays their role without a fake birth date', () => {
    component.applyStudentFilter('Academia A');
    expect(component.filteredStudents).toEqual([team]);
    expect(component.role(team)).toBe('Equipo');
    expect(component.birthDate(team)).toBe('');
    expect(component.birthDate(athlete)).toBe('2010-01-01');
  });
  it('refreshes the buttons when the deadline is reached on an already open page', fakeAsync(() => {
    const changeDetector = jasmine.createSpyObj('ChangeDetectorRef', ['markForCheck']);
    const deadline = new Date(Date.now() + 1000).toISOString();
    component = new EventDetailComponent({ snapshot: { paramMap: { get: () => '34' } } } as any,
      { getEvent: () => of({ eventDateCheckin: deadline }) } as any, {} as any,
      { bypassSecurityTrustHtml: () => '' } as any, {} as any, changeDetector, {} as any, {} as any);
    spyOn(component, 'loadStudents'); spyOn(component, 'loadCategories'); spyOn(component, 'loadFixtureCategories');
    component.ngOnInit();
    expect(component.registrationClosed).toBeFalse();
    changeDetector.markForCheck.calls.reset();
    tick(1000);
    expect(component.registrationClosed).toBeTrue();
    expect(changeDetector.markForCheck).toHaveBeenCalled();
    component.ngOnDestroy();
  }));
  it('sends team enrollments to the team endpoint', () => {
    const http = jasmine.createSpyObj('HttpClient', ['post']);
    http.post.and.returnValue(of({}));
    new EventInvitationsService(http, {} as any).enrollTeam(34, 5, [7]).subscribe();
    const [url, body] = http.post.calls.mostRecent().args;
    expect(url).toContain('/Competitors/enroll-team');
    expect(body).toEqual({ eventId: 34, teamId: 5, categoryIds: [7] });
  });
  it('prevents opening an enrollment after the registration deadline while keeping the list available', () => {
    const dialog = jasmine.createSpyObj('MatDialog', ['open']);
    component = new EventDetailComponent({} as any, {} as any, {} as any, {} as any,
      {} as any, {} as any, {} as any, dialog);
    component.event = { eventDateCheckin: new Date(Date.now() - 1000).toISOString() } as any;
    component.students = [athlete, team];
    component.openEnrollment(athlete);
    expect(component.registrationClosed).toBeTrue();
    expect(dialog.open).not.toHaveBeenCalled();
    expect(component.filteredStudents).toEqual([athlete, team]);
  });
});
