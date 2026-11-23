import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { EventInvitationsService } from '../invitations/event-invitations.service';
import { EventSummaryComponent } from './event-summary.component';

function bracket(count: number, version: number) {
  const rounds = [];
  for (let size = count / 2, round = 1; size >= 1; size /= 2, round++) {
    rounds.push({ number: round, name: `Ronda ${round}`, matches: Array.from({ length: size }, (_, i) => ({
      matchNumber: i + 1, position: i + 1,
      top: round === 1 ? { competitorId: i * 2 + 1, name: `Deportista ${i * 2 + 1}` } : null,
      bottom: round === 1 ? { competitorId: i * 2 + 2, name: `Deportista ${i * 2 + 2}` } : null
    })) });
  }
  return { version, competitorCount: count, rounds };
}

describe('Refresh organizer fixtures', () => {
  let component: EventSummaryComponent;
  let service: jasmine.SpyObj<EventInvitationsService>;
  let snack: { open: jasmine.Spy };
  beforeEach(() => {
    service = jasmine.createSpyObj('EventInvitationsService', ['refreshFixture', 'generateFixture', 'saveFixtureVersion', 'getCategoryWithCompetitors', 'getStoredFixtureVersion']);
    service.getCategoryWithCompetitors.and.returnValue(of([]));
    snack = { open: jasmine.createSpy('open') };
    component = new EventSummaryComponent({} as any, {} as any, service, { markForCheck() {} } as any, snack as any, {} as any, {} as any, {} as any);
    component.eventId = 35;
    component.selectedCategoryId = 3054;
    component.selectedCategory = { id: 3054, competitorCount: 2, fixtureVersion: 2 };
    component.categories = [component.selectedCategory, { id: 3055, competitorCount: 5 }];
    service.generateFixture.and.returnValue(of(bracket(2, 2)));
    component.generateFixture(true);
    spyOn(window, 'confirm').and.returnValue(true);
  });
  it('replaces the 2-person bracket with the official 16-person version and updates counts', () => {
    service.refreshFixture.and.returnValue(of(bracket(16, 3)));
    component.refreshFixture();
    expect(service.refreshFixture).toHaveBeenCalledOnceWith(35, 3054);
    expect(component.fixtureVersion).toBe('3');
    expect(component.fixtureRounds.length).toBe(4);
    expect(component.fixtureRounds[0].matches.length).toBe(8);
    expect(component.categoryCompetitors.length).toBe(16);
    expect(new Set(component.fixtureRounds[0].matches.flatMap(m => [m.top.competitorId, m.bottom.competitorId])).size).toBe(16);
    expect(component.categoryCompetitorCount(component.categories[0])).toBe(16);
    expect(component.categories[1].competitorCount).toBe(5);
    expect(component.canUndoFixtureChange).toBeFalse();
    expect(service.saveFixtureVersion).not.toHaveBeenCalled();
  });
  it('does not generate a version when confirmation is cancelled', () => {
    (window.confirm as jasmine.Spy).and.returnValue(false);
    component.refreshFixture();
    expect(service.refreshFixture).not.toHaveBeenCalled();
    expect(component.fixtureVersion).toBe('2');
  });
  it('blocks duplicate generation and local editing while the request is pending', () => {
    const pending = new Subject<any>(); service.refreshFixture.and.returnValue(pending);
    component.refreshFixture(); component.refreshFixture(); component.saveFixtureVersion(); component.addFixtureMatch();
    expect(service.refreshFixture).toHaveBeenCalledTimes(1);
    expect(service.saveFixtureVersion).not.toHaveBeenCalled();
    expect(component.fixtureRounds[0].matches.length).toBe(1);
    pending.next(bracket(16, 3)); pending.complete();
    expect(component.refreshingFixture).toBeFalse();
  });
  it('preserves the existing bracket and unsaved edits if the API rejects refresh', () => {
    component.addFixtureMatch();
    const previous = component.fixtureRounds;
    service.refreshFixture.and.returnValue(throwError(() => ({ error: { message: 'No autorizado' } })));
    component.refreshFixture();
    expect(component.fixtureRounds).toBe(previous);
    expect(component.canUndoFixtureChange).toBeTrue();
    expect(component.fixtureVersion).toBe('2');
    expect(component.refreshingFixture).toBeFalse();
    expect(snack.open).toHaveBeenCalledWith('No autorizado', undefined, { duration: 6000 });
  });
  it('does not replace another category with a late response', () => {
    const pending = new Subject<any>(); service.refreshFixture.and.returnValue(pending);
    component.refreshFixture(); component.selectedCategoryId = 3055;
    pending.next(bracket(16, 3)); pending.complete();
    expect(component.fixtureVersion).toBe('2');
  });
  it('does not refresh while loading or saving', () => {
    component.savingFixture = true; component.refreshFixture();
    component.savingFixture = false; component.generatingFixture = true; component.refreshFixture();
    expect(service.refreshFixture).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();
  });
});

describe('Competitor management permissions', () => {
  it('does not request or regenerate fixtures after the last entrant is removed', () => {
    const service = jasmine.createSpyObj('service', ['getCategory', 'getCategoryWithCompetitors', 'generateFixture']);
    service.getCategory.and.returnValue(of({ id: 1 }));
    service.getCategoryWithCompetitors.and.returnValue(of([]));
    const component = new EventSummaryComponent({} as any, {} as any, service,
      { markForCheck() {} } as any, {} as any, {} as any, {} as any, {} as any);
    component.selectedCategoryId = 1;
    component.categories = [{ id: 1, fixtureVersion: 4, competitorCount: 1 }];
    component.outdatedFixtures.add(1);
    component.loadCategory();
    expect(service.generateFixture).not.toHaveBeenCalled();
    expect(component.fixtureRounds).toEqual([]);
    expect(component.fixtureVersion).toBe('Sin versiones');
    expect(component.categories[0].fixtureVersion).toBe(0);
    expect(component.outdatedFixtures.has(1)).toBeFalse();
    component.ngOnDestroy();
  });
  for (const [role, academyId, allowed] of [
    ['admin', 99, true], ['academy_admin', 7, true],
    ['academy_admin', 99, false], ['instructor', 7, false]
  ] as const) {
    it(`checks ${role} from academy ${academyId}`, () => {
      const component = new EventSummaryComponent({} as any,
        { getCurrentUser: () => ({ rol: role, academieId: academyId }) } as any,
        {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
      component.event = { id: 32, academyId: 7 } as any;
      expect(component.canManageCompetitors).toBe(allowed);
      if (role === 'academy_admin' && academyId === 99) {
        component.event!.coOrganizerAcademyIds = [99];
        expect(component.canManageCompetitors).toBeTrue();
        component.event!.coOrganizerAcademyIds = [];
        expect(component.canManageCompetitors).toBeFalse();
      }
      component.ngOnDestroy();
    });
  }
});

describe('Fixture refresh HTTP contract', () => {
  it('posts to generate while ordinary loading continues to use latest', () => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [{ provide: AuthService, useValue: {} }] });
    const service = TestBed.inject(EventInvitationsService);
    const http = TestBed.inject(HttpTestingController);
    service.refreshFixture(35, 3054).subscribe(value => expect(value.version).toBe(3));
    const refresh = http.expectOne(r => r.url.endsWith('/Events/35/Categories/3054/fixtures/generate'));
    expect(refresh.request.method).toBe('POST');
    refresh.flush({ data: bracket(16, 3) });
    service.generateFixture(35, 3054).subscribe();
    const latest = http.expectOne(r => r.url.endsWith('/Events/35/Categories/3054/fixtures/latest'));
    expect(latest.request.method).toBe('GET');
    latest.flush({ data: bracket(16, 3) });
    http.verify();
  });
});

describe('Loading categories with the production enrollment DTO', () => {
  for (const version of [1, 4]) {
    it(`keeps fixture entrants when enrollment exposes studentId and teamId (version ${version})`, () => {
      const enrollment = [{ id: 12, competitors: [
        { studentId: 101, fullName: 'Alumna Uno', academyName: 'Dojo' },
        { teamId: 201, fullName: 'Equipo: Dos', academyName: 'Dojo' }
      ] }];
      const fixture = bracket(2, version);
      const service = jasmine.createSpyObj('service', ['getCategory', 'getCategoryWithCompetitors', 'generateFixture']);
      service.getCategory.and.returnValue(of({ id: 12, modalityId: 1 }));
      service.getCategoryWithCompetitors.and.returnValue(of(enrollment));
      service.generateFixture.and.returnValue(of(fixture));
      const component = new EventSummaryComponent({} as any, {} as any, service,
        { markForCheck() {} } as any, {} as any, {} as any, {} as any, {} as any);
      component.selectedCategoryId = 12;
      component.categories = [{ id: 12, fixtureVersion: version === 1 ? 0 : version }];
      component.loadCategory();
      expect(component.categoryCompetitors.length).toBe(2);
      expect(component.fixtureRounds[0].matches[0].top.competitorId).toBe(1);
      expect(component.fixtureRounds[0].matches[0].bottom.competitorId).toBe(2);
      expect(component.fixtureRounds[0].matches[0].top.name).toBe('Deportista 1');
      expect(component.fixture.version).toBe(version);
      expect(component.fixture.generatedLocally).toBeFalsy();
      expect(service.generateFixture).toHaveBeenCalledOnceWith(0, 12);
      component.ngOnDestroy();
    });
  }
});

describe('Summary category drafts and JKA corners', () => {
  let component: EventSummaryComponent;
  let service: any;
  let closed: Subject<any>;
  beforeEach(() => {
    closed = new Subject<any>();
    service = jasmine.createSpyObj('service', ['generateFixture', 'saveFixtureVersion', 'getCategoryWithCompetitors']);
    service.generateFixture.and.returnValue(of(bracket(4, 7)));
    service.getCategoryWithCompetitors.and.returnValue(of([]));
    component = new EventSummaryComponent({} as any, { getCurrentUser: () => ({ rol: 'admin' }) } as any,
      service, { markForCheck() {} } as any, { open() {} } as any, {} as any, {} as any,
      { open: () => ({ afterClosed: () => closed }) } as any);
    component.eventId = 34;
    component.event = { associationType: 'JKA', eventType: 'Karate' } as any;
    component.selectedCategoryId = 1;
    component.selectedCategory = { id: 1, modalityId: 2, fixtureVersion: 7 };
    component.categories = [component.selectedCategory];
    component.generateFixture(true);
    component.categoryCompetitors = [1, 2, 3, 4].map(id => ({ competitorId: id }));
    spyOn(component, 'load');
    spyOn(component, 'loadCategory');
  });
  afterEach(() => component.ngOnDestroy());
  it('uses red AKA and white SHIRO for JKA kumite, and blue AO for WKF', () => {
    expect(component.fixtureRounds[0].matches[0].top.label).toBe('AKA');
    expect(component.fixtureRounds[0].matches[0].top.color).toBe('#dc2626');
    expect(component.fixtureRounds[0].matches[0].bottom.label).toBe('SHIRO');
    expect(component.fixtureRounds[0].matches[0].bottom.color).toBe('#f8fafc');
    component.event!.associationType = 'WKF';
    component.generateFixture(true);
    expect(component.fixtureRounds[0].matches[0].bottom.color).toBe('#0957d9');
  });
  for (const action of ['remove', 'move'] as const) {
    it(`${action} clears the entrant and their results throughout the draft without regenerating`, () => {
      const final = component.fixtureRounds[1].matches[0];
      final.top = { ...component.fixtureRounds[0].matches[0].top };
      final.winnerCompetitorId = 1;
      component.editCompetitorCategory(component.fixtureRounds[0].matches[0].top, action);
      closed.next({ sourceId: 1, targetId: action === 'move' ? 2 : undefined });
      expect(component.fixtureRounds.flatMap(r => r.matches).some(m => m.top.competitorId === 1 || m.bottom.competitorId === 1 || m.winnerCompetitorId === 1)).toBeFalse();
      expect(component.fixture.generatedLocally).toBeTrue();
      expect(component.fixture.version).toBe(7);
      expect(component.categoryCompetitors.length).toBe(3);
      expect(component.loadCategory).not.toHaveBeenCalled();
      expect(service.generateFixture).toHaveBeenCalledTimes(1);
      service.saveFixtureVersion.and.returnValue(of({ ...bracket(4, 8), rounds: [] }));
      component.saveFixtureVersion();
      const payload = service.saveFixtureVersion.calls.mostRecent().args[2];
      expect(payload.baseVersion).toBe(7);
      expect(payload.matches.some((m: any) => m.topCompetitorId === 1 || m.bottomCompetitorId === 1 || m.winnerCompetitorId === 1)).toBeFalse();
      expect(component.fixture.version).toBe(8);
    });
  }
  it('preserves the fixture if the enrollment dialog is cancelled', () => {
    component.editCompetitorCategory(component.fixtureRounds[0].matches[0].top, 'remove');
    closed.next(undefined);
    expect(component.fixtureRounds[0].matches[0].top.competitorId).toBe(1);
    expect(component.fixture.generatedLocally).toBeFalsy();
  });
  for (const action of ['remove', 'move'] as const) {
    it(`keeps Kata JKA opponents and official connections after ${action}`, () => {
      component.fixture.fixtureType = 'KATAJKA';
      component.selectedCategory.fixtureType = 'KATAJKA';
      const slot = component.fixtureRounds[0].matches[0].top;
      const opponent = component.fixtureRounds[0].matches[0].bottom.competitorId;
      const connections = component.fixtureRounds.flatMap(r => r.matches.map(m => m.nextMatchId));
      const count = component.fixtureRounds[0].matches.length;
      component.editCompetitorCategory(slot, action);
      closed.next({ sourceId: 1, targetId: action === 'move' ? 2 : undefined });
      expect(component.fixtureRounds[0].matches.length).toBe(count);
      expect(component.fixtureRounds[0].matches[0].bottom.competitorId).toBe(opponent);
      expect(component.fixtureRounds.flatMap(r => r.matches.map(m => m.nextMatchId))).toEqual(connections);
      expect(component.fixtureRounds.flatMap(r => r.matches).some(m => m.top.competitorId === slot.competitorId || m.bottom.competitorId === slot.competitorId || m.winnerCompetitorId === slot.competitorId)).toBeFalse();
      expect(component.fixtureRounds[component.fixtureRounds.length - 1].matches.every(m => !m.isBye)).toBeTrue();
    });
  }
  it('retains existing round-robin pairs and fits the remaining entrants into valid rounds', () => {
    component.fixture = { version: 7, fixtureType: 'ROUNDROBIN' };
    component.selectedCategory.fixtureType = 'ROUNDROBIN';
    const slot = component.fixtureRounds[0].matches[0].top;
    let id = 0;
    component.fixtureRounds = [1, 2, 3, 4].map(a => ({ number: a, name: `Ronda ${a}`, matches:
      [1, 2, 3, 4, 5].filter(b => b > a).map(b => ({ id: ++id, matchNumber: id, position: 1,
        winnerCompetitorId: b, nextMatchId: null, nextMatchPosition: null, isBye: false,
        top: { ...slot, competitorId: a }, bottom: { ...slot, competitorId: b } }))
    }));
    const expectedIds = component.fixtureRounds.flatMap(r => r.matches).filter(m => m.top.competitorId !== 1).map(m => m.id).sort();
    component.editCompetitorCategory(component.fixtureRounds[0].matches[0].top, 'remove');
    closed.next({ sourceId: 1 });
    expect(component.fixtureRounds.length).toBe(3);
    expect(component.fixtureRounds.flatMap(r => r.matches).map(m => m.id).sort()).toEqual(expectedIds);
    for (const round of component.fixtureRounds) {
      const ids = round.matches.flatMap(m => [m.top.competitorId, m.bottom.competitorId]);
      expect(ids.length).toBe(4);
      expect(new Set(ids).size).toBe(4);
      expect(round.matches.every(m => m.winnerCompetitorId === m.bottom.competitorId)).toBeTrue();
    }
  });
  it('searches category code and name with multiple terms ignoring accents', () => {
    component.categories = [{ id: 1, code: 'K-12', name: 'Kumite femenino básico' }, { id: 2, code: 'K-13', name: 'Kata básico' }];
    component.categorySearch = 'K-12 basico';
    expect(component.filteredCategories.map(c => c.id)).toEqual([1]);
    expect(component.loadCategory).not.toHaveBeenCalled();
  });
});


describe('Organizer registration labels', () => {
  const component = () => new EventSummaryComponent({} as any, {} as any, {} as any,
    { markForCheck() {} } as any, {} as any, {} as any, {} as any, {} as any);
  it('identifies coaches, teams and people who both coach and compete', () => {
    const view = component();
    expect(view.registrationKind({ isAthlete: true, isCoach: true })).toBe('Deportista / Coach');
    expect(view.registrationKind({ isCoach: true })).toBe('Coach');
    expect(view.registrationKind({ isTeam: true })).toBe('Equipo');
    expect(view.registrationKind({ IsAthlete: true })).toBe('Deportista');
  });
  it('uses the configured modality name and the production team ids', () => {
    const view = component();
    view.selectedCategory = { modalityId: 4, modalityName: 'Kata Equipo Femenino' };
    expect(view.modalityName).toBe('Kata Equipo Femenino');
    view.selectedCategory = { modalityId: 4 };
    expect(view.modalityName).toBe('Kata equipo femenino');
    view.selectedCategory = { modalityId: 6 };
    expect(view.modalityName).toBe('Kumite equipo femenino');
  });
});
