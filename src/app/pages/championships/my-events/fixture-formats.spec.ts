import { EventSummaryComponent } from './event-summary.component';
import { fixturePages } from './tournament-fixture-pdf';
import { nProCsv } from './n-pro-csv';

describe('Formatos de llaves', () => {
  const slot = (id: number) => ({ competitorId: id, name: `Alumno ${id}`, academy: 'Dojo', academyName: 'Dojo', label: 'AKA', color: '#dc2626', past: false });
  const rounds = [1, 2, 3].map(number => ({ number, name: `Ronda ${number}`, matches: [{
    id: number, matchNumber: number, position: 1, winnerCompetitorId: null, nextMatchId: null, nextMatchPosition: null,
    isBye: false, top: slot(number === 3 ? 2 : 1), bottom: slot(number === 1 ? 2 : 3)
  }] }));

  it('guarda round robin sin inventar conexiones eliminatorias y muestra descansos', () => {
    const c = new EventSummaryComponent({} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    c.fixture = { fixtureType: 'ROUNDROBIN' };
    c.selectedCategory = { fixtureType: 'ROUNDROBIN' };
    c.fixtureRounds = rounds;
    const matches = (c as any).fixtureMatchesForSave();
    expect(matches.every((m: any) => m.nextMatchNumber === null && m.nextMatchPosition === null)).toBeTrue();
    expect(c.roundRestingNames(rounds[0])).toBe('Alumno 3');
    c.selectedCategory.fixtureType = 'MEJORDETRES';
    expect(c.fixtureTypeChanged).toBeTrue();
  });

  it('incluye todos los encuentros independientes una sola vez en una hoja', () => {
    const large = [1, 2, 3].map(number => ({ number, matches: Array.from({ length: 17 }, (_, i) => ({ id: number * 100 + i })) }));
    const pages = fixturePages(large, 'ROUNDROBIN');
    const ids = pages.flatMap(p => p.rounds.flatMap(r => r.matches.map(m => m.match.id)));
    expect(pages.length).toBe(1);
    expect(ids.length).toBe(51);
    expect(new Set(ids).size).toBe(51);
  });

  it('N-Pro exporta cada participante una vez con su primer encuentro', () => {
    const csv = nProCsv({ rounds, fixtureType: 'ROUNDROBIN' }, { gender: 'Male' });
    expect(csv.trim().split('\r\n').length).toBe(4);
    expect(csv).toContain('2;Alumno 3;Dojo');
  });
});
