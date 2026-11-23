import { EventDetailComponent } from './event-detail.component';

describe('Invitation fixture presentation', () => {
  let component: EventDetailComponent;
  beforeEach(() => {
    component = new EventDetailComponent({} as any, {} as any, {} as any, {} as any,
      {} as any, {} as any, {} as any, {} as any);
    component.event = { associationType: 'JKA', eventType: 'Karate' } as any;
    component.fixtureCategories = [{ id: 7, modalityId: 2 }];
    component.selectedFixtureCategoryId = 7;
  });
  it('uses white SHIRO for individual and team JKA kumite', () => {
    for (const modalityId of [2, 4, 5]) {
      component.fixtureCategories[0].modalityId = modalityId;
      expect(component.fixtureLightCorner).toBeTrue();
      expect(component.fixtureBottomLabel).toBe('SHIRO');
    }
    component.event!.associationType = 'WKF';
    expect(component.fixtureLightCorner).toBeFalse();
    expect(component.fixtureBottomLabel).toBe('AO');
  });
  it('keeps blue AO for JKA kata and white SHIRO for traditional events', () => {
    component.fixtureCategories[0].modalityId = 1;
    expect(component.fixtureBottomLabel).toBe('AO');
    component.event!.eventType = 'Karate tradicional';
    expect(component.fixtureBottomLabel).toBe('SHIRO');
  });
  it('uses the saved format and preserves official encounters and resting entrants', () => {
    const first = { matches: [{ top: { competitorId: 1, name: 'Ana' }, bottom: { competitorId: 2, name: 'Luis' } }] };
    const second = { matches: [{ top: { competitorId: 1, name: 'Ana' }, bottom: { competitorId: 3, name: 'Eva' } }] };
    component.latestFixture = { fixtureType: 'ROUNDROBIN', rounds: [first, second] };
    expect(component.fixtureIsElimination).toBeFalse();
    expect(component.fixtureRounds).toEqual([first, second]);
    expect(component.roundRestingNames(first)).toBe('Eva');
    component.latestFixture.fixtureType = 'ELIMINACION';
    expect(component.fixtureIsElimination).toBeTrue();
    expect(component.roundRestingNames(first)).toBe('');
  });
  it('leaves one blank winner space until the official final has a winner', () => {
    const top = { competitorId: 1, name: 'Ana' };
    const bottom = { competitorId: 2, name: 'Luis' };
    const final = { top, bottom, winnerCompetitorId: null as number | null };
    component.latestFixture = { fixtureType: 'ELIMINACION', rounds: [{ matches: [final] }] };
    expect(component.fixtureWinner).toBeUndefined();
    final.winnerCompetitorId = 2;
    expect(component.fixtureWinner).toBe(bottom);
    expect(component.fixtureRounds.length).toBe(1);
    component.latestFixture.fixtureType = 'MEJORDETRES';
    expect(component.fixtureWinner).toBeUndefined();
  });
});
