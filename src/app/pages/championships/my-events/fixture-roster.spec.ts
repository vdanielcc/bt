import { fixtureRosterChanged } from './fixture-roster';

describe('Stored fixture roster validation', () => {
  const first = { competitorId: 10, studentId: 1, name: 'A' };
  const second = { competitorId: 20, studentId: 2, name: 'B' };
  const fixture = { competitorCount: 2, rounds: [
    { matches: [{ top: first, bottom: second }] },
    { matches: [{ top: first, bottom: {} }] }
  ] };
  it('ignores order, byes and repeated appearances in later rounds', () => {
    expect(fixtureRosterChanged(fixture, [{ studentId: 2 }, { studentId: 1 }])).toBeFalse();
  });
  it('detects more entrants, fewer entrants and an empty category', () => {
    expect(fixtureRosterChanged(fixture, [{ studentId: 1 }, { studentId: 2 }, { studentId: 3 }])).toBeTrue();
    expect(fixtureRosterChanged(fixture, [{ studentId: 1 }])).toBeTrue();
    expect(fixtureRosterChanged(fixture, [])).toBeTrue();
  });
  it('detects a replaced athlete even if the total and name are unchanged', () => {
    expect(fixtureRosterChanged(fixture, [{ studentId: 1 }, { studentId: 3, name: 'B' }])).toBeTrue();
  });
  it('uses stored count to detect a removed competitor no longer returned in slots', () => {
    expect(fixtureRosterChanged({ competitorCount: 2, rounds: [{ matches: [{ top: first }] }] }, [{ studentId: 1 }])).toBeTrue();
  });
  it('clears the difference once a saved version contains the new entrants', () => {
    expect(fixtureRosterChanged({ rounds: [{ matches: [{ top: first, bottom: { competitorId: 30, studentId: 3 } }] }] }, [{ studentId: 1 }, { studentId: 3 }])).toBeFalse();
  });
  it('supports PascalCase responses and team names with their club', () => {
    const team = { CompetitorId: 40, Name: 'Equipo: A', AcademyName: 'Dojo' };
    const teams = { CompetitorCount: 1, Rounds: [{ Matches: [{ Top: team, Bottom: {} }] }] };
    expect(fixtureRosterChanged(teams, [{ TeamId: 8, FullName: 'Equipo: A', AcademyName: 'Dojo' }])).toBeFalse();
    expect(fixtureRosterChanged(teams, [{ TeamId: 9, FullName: 'Equipo: B', AcademyName: 'Dojo' }])).toBeTrue();
  });
});
