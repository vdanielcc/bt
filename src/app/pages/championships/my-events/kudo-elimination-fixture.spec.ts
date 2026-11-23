import { jsPDF } from 'jspdf';
import { EventSummaryComponent } from './event-summary.component';
import { EventDetailComponent } from '../invitations/event-detail.component';
import { fixturePages, renderTournamentPdf } from './tournament-fixture-pdf';

describe('Eliminación directa Kudo', () => {
  it('uses the saved format for editable and historical fixture slots regardless of event association', () => {
    const component = new EventSummaryComponent({} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    component.event = { associationType: 'WKF', eventType: 'Karate' } as any;
    component.fixture = { fixtureType: 'ELIMINACIONKUDO' };
    component.selectedCategory = { fixtureType: 'ELIMINACION' };
    expect(component.isElimination).toBeTrue();
    expect(component.fixtureTypeChanged).toBeTrue();
    expect((component as any).slot({ competitorId: 1, name: 'Ana', academy: 'Dojo' }, true)).toEqual(jasmine.objectContaining({ label: 'AO', color: '#0957d9' }));
    expect((component as any).slot({ competitorId: 2, name: 'Eva', academy: 'Dojo' }, false)).toEqual(jasmine.objectContaining({ label: 'SHIRO', color: '#f8fafc' }));
    component.fixture.fixtureType = 'ELIMINACION';
    expect((component as any).slot(undefined, true).label).toBe('AKA');
  });

  it('shows AO and white SHIRO with elimination connections in invitation fixtures', () => {
    const component = new EventDetailComponent({} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    component.event = { associationType: 'WKF', eventType: 'Karate' } as any;
    component.latestFixture = { fixtureType: 'ELIMINACIONKUDO' };
    expect(component.fixtureIsElimination).toBeTrue();
    expect(component.fixtureTopLabel).toBe('AO');
    expect(component.fixtureTopColor).toBe('#0957d9');
    expect(component.fixtureBottomLabel).toBe('SHIRO');
    expect(component.fixtureLightCorner).toBeTrue();
  });

  it('retains elimination pagination for large Kudo brackets', () => {
    const rounds = [16, 8, 4, 2, 1].map((count, i) => ({ number: i + 1, matches: Array.from({ length: count }, (_, j) => ({ id: i * 100 + j })) }));
    expect(fixturePages(rounds, 'ELIMINACIONKUDO')).toEqual(fixturePages(rounds, 'ELIMINACION'));
  });

  it('exports blue AO and white SHIRO in every round and the third place annotation without red AKA', () => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 2;
    const logo = canvas.toDataURL('image/png');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [330, 216] });
    const fill = spyOn(doc, 'setFillColor').and.callThrough();
    const rounds = [2, 1].map((count, r) => ({ number: r + 1, name: r ? 'Final' : 'Semifinal', matches: Array.from({ length: count }, (_, i) => ({
      id: r * 10 + i, position: i + 1, matchNumber: i + 1, top: { competitorId: 1, name: 'Ana' }, bottom: { competitorId: 2, name: 'Eva' }
    })) }));
    renderTournamentPdf(doc, [{ category: { code: 'KU1', name: 'Kumite', pdfGroup: 3, thirdPlacePlayoff: true }, fixture: { fixtureType: 'ELIMINACIONKUDO', rounds, version: 1 } }], 'Torneo', logo, logo, 'WKF', 'WKF');
    const colors = fill.calls.allArgs().map(args => String(args[0]));
    expect(colors).toContain('#0957d9');
    expect(colors).toContain('#f8fafc');
    expect(colors).not.toContain('#dc2626');
    const pdf = doc.output();
    expect(pdf).toContain('(AO)'); expect(pdf).toContain('(SHIRO)'); expect(pdf).not.toContain('(AKA)');
    expect((pdf.match(/\(AO\)/g) || []).length).toBe(4);
    expect((pdf.match(/\(SHIRO\)/g) || []).length).toBe(4);
  });
});
