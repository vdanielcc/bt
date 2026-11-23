import { KudoRepechageFixtureComponent } from './kudo-repechage-fixture.component';
import { fixturePages } from './tournament-fixture-pdf';

describe('Kudo repechage fixture', () => {
  it('does not declare a champion until a required reset is completed', () => {
    const component = new KudoRepechageFixtureComponent();
    const top = { competitorId: 1, name: 'Invicto' }, bottom = { competitorId: 2, name: 'Repechaje' };
    const reset = { stage: 'RESET', isActive: true, top, bottom, winnerCompetitorId: null as number | null };
    component.rounds = [{ matches: [{ stage: 'GF', top, bottom, winnerCompetitorId: 2 }, reset] }];
    expect(component.winner).toBeUndefined();
    reset.winnerCompetitorId = 2;
    expect(component.winner.name).toBe('Repechaje');
  });
  it('shows official winner and loser source labels for pending encounters', () => {
    const component = new KudoRepechageFixtureComponent();
    expect(component.name({ topSourceNumber: 3, topSourceResult: 'loser' }, true)).toBe('Perdedor del combate 3');
    expect(component.name({ bottomSourceNumber: 5, bottomSourceResult: 'winner' }, false)).toBe('Ganador del combate 5');
  });
  it('keeps every stage and encounter in large PDF exports', () => {
    const rounds = [16,8,4,2,1,8,8,4,4,2,2,1,1,1,1].map((count, number) => ({ number,
      matches: Array.from({ length: count }, (_, id) => ({ id: number * 100 + id })) }));
    const pages = fixturePages(rounds, 'KUDOREPECHAGE');
    expect(pages.every(page => page.rounds.length === 1 && page.rounds[0].matches.length <= 8)).toBeTrue();
    expect(pages.flatMap(p => p.rounds.flatMap(r => r.matches)).length).toBe(rounds.reduce((n,r) => n+r.matches.length,0));
  });
});
