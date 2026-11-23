import { jsPDF } from 'jspdf';
import { fixturePages, modalityGroup, orderedCategories, renderTournamentPdf } from './tournament-fixture-pdf';

describe('Tournament fixture PDF', () => {
  it('renders JKA kumite as red AKA and white SHIRO', () => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 2;
    const logo = canvas.toDataURL('image/png');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [330, 216] });
    const fill = spyOn(doc, 'setFillColor').and.callThrough();
    renderTournamentPdf(doc, [{ category: { pdfGroup: 3, code: 'K1', name: 'Kumite' }, fixture: {
      version: 1, rounds: [{ number: 1, name: 'Final', matches: [{ id: 1, position: 1,
        top: { competitorId: 1, name: 'A' }, bottom: { competitorId: 2, name: 'B' } }] }]
    } }], 'Torneo', logo, logo, 'Karate', 'JKA');
    const colors = fill.calls.allArgs().map(args => String(args[0]));
    expect(colors).toContain('#dc2626');
    expect(colors).toContain('#f8fafc');
    expect(colors).not.toContain('#0957d9');
    expect(doc.output()).toContain('(SHIRO)');
    expect(doc.output()).not.toContain('(AO)');
  });
  for (const [fixtureType, roundCount, perRound] of [['MEJORDETRES', 3, 1], ['ROUNDROBIN', 3, 2], ['ROUNDROBIN', 17, 8]] as const) {
    it(`fits ${roundCount * perRound} ${fixtureType} encounters on one page without losing names or overlapping the footer`, () => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 2;
      const logo = canvas.toDataURL('image/png');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [330, 216] });
      const rectangles = spyOn(doc, 'rect').and.callThrough();
      const images = spyOn(doc, 'addImage').and.callThrough();
      const rounds = Array.from({ length: roundCount }, (_, r) => ({ number: r + 1, name: `Ronda ${r + 1}`, matches:
        Array.from({ length: perRound }, (_, i) => ({ id: r * perRound + i + 1, position: i + 1, matchNumber: r * perRound + i + 1,
          top: { competitorId: 1, name: `Alumno-${r}-${i}-A`, academyName: 'Dojo' },
          bottom: { competitorId: 2, name: `Alumno-${r}-${i}-B`, academyName: 'Dojo' }
        })) }));
      renderTournamentPdf(doc, [{ category: { pdfGroup: 3, code: 'K1', name: 'Kumite' }, fixture: { fixtureType, rounds, version: 1 } }], 'Torneo', logo, logo);
      expect(doc.getNumberOfPages()).toBe(1);
      expect(images.calls.count()).toBe(2);
      expect(rectangles.calls.count()).toBe(roundCount * perRound * 4 + 6);
      for (const [x, y, w, h] of rectangles.calls.allArgs()) {
        expect(x).toBeGreaterThanOrEqual(10);
        expect(w).toBeGreaterThan(0);
        expect(h).toBeGreaterThan(0);
        expect(x + w).toBeLessThanOrEqual(320);
        expect(y + h).toBeLessThan(202);
      }
      const pdf = doc.output();
      for (let r = 0; r < roundCount; r++) for (let i = 0; i < perRound; i++) {
        expect(pdf).toContain(`ALUMNO-${r}-${i}-A`);
        expect(pdf).toContain(`ALUMNO-${r}-${i}-B`);
      }
    });
  }
  for (const eventType of ['WKF', 'JKA']) {
    it(`uses the individual fixture colors for ${eventType}, including empty slots`, () => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 2;
      const logo = canvas.toDataURL('image/png');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [330, 216] });
      const fill = spyOn(doc, 'setFillColor').and.callThrough();
      renderTournamentPdf(doc, [{ category: { pdfGroup: 0, code: 'KA 1', name: 'Kata' }, fixture: {
        version: 1, rounds: [{ number: 1, name: 'Final', matches: [
          { id: 1, position: 1, top: { competitorId: 1, name: 'A' }, bottom: { competitorId: 2, name: 'B' } },
          { id: 2, position: 2, isBye: true, top: { competitorId: 3, name: 'C' }, bottom: { name: 'BYE' } }
        ] }]
      } }], 'Torneo', logo, logo, eventType);
      const colors = fill.calls.allArgs().map(args => String(args[0]));
      expect(colors).toContain('#dc2626');
      expect(colors).toContain(eventType === 'WKF' ? '#0957d9' : '#f8fafc');
      expect(colors).toContain('#e5e7eb');
      expect(colors).toContain('#9ca3af');
      expect(doc.output()).not.toContain('BYE');
    });
  }
  it('orders modalities and category codes, includes one entrant and excludes empty and unrelated categories', () => {
    const modalities = ['Kumite Equipo Mixto', 'Kata Equipo Femenino', 'Para-Karate', 'Kumite Individual Masculino', 'Kata', 'Coach'].map((name, id) => ({ id, name }));
    const categories = modalities.map(m => ({ id: m.id, modalityId: m.id, code: '10', competitorCount: 1 }));
    categories.push({ id: 20, modalityId: 4, code: '2', competitorCount: 2 });
    categories.push({ id: 21, modalityId: 4, code: '1', competitorCount: 0 });
    expect(orderedCategories(categories, modalities).map(c => c.id)).toEqual([20, 4, 2, 1, 3, 0]);
    expect(modalityGroup('Seminario Kata/Kumite')).toBe(-1);
  });

  it('paginates 64 entrants without dropping or duplicating any match', () => {
    let id = 0;
    const rounds = [32, 16, 8, 4, 2, 1].map(count => ({ matches: Array.from({ length: count }, () => ({ id: ++id })) }));
    const pages = fixturePages(rounds);
    const matches = pages.flatMap(p => p.rounds.flatMap(r => r.matches.map(m => m.match.id)));
    expect(pages.length).toBe(5);
    expect(matches.length).toBe(63);
    expect(new Set(matches).size).toBe(63);
    expect(pages.every(p => p.rounds.every(r => r.matches.every(m => m.slot >= 0 && m.slot < 8)))).toBeTrue();
  });

  it('includes both logos, the footer and a single competitor in a real PDF', () => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 10;
    canvas.getContext('2d')!.fillRect(0, 0, 10, 10);
    const logo = canvas.toDataURL('image/png');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [330, 216] });
    const images = spyOn(doc, 'addImage').and.callThrough();
    renderTournamentPdf(doc, [{ category: { pdfGroup: 0, code: 'KA 01', name: 'Kata' }, fixture: {
      version: 2, rounds: [{ number: 1, name: 'FINAL', matches: [{ id: 1, position: 1, isBye: true, top: { name: 'Alonzo', academyName: 'Dojo', corner: 'AKA' }, bottom: { corner: 'AO' } }] }]
    } }], 'Torneo', logo, logo);
    const pdf = doc.output();
    expect(doc.getNumberOfPages()).toBe(1);
    expect(images.calls.count()).toBe(2);
    expect(pdf).toContain('ALONZO');
    expect(pdf).toContain('DOJO');
    expect(pdf).not.toContain('Alonzo');
    expect(pdf).not.toContain('(Dojo)');
    expect(pdf).toContain('https://budotournaments.net/app');
    expect(pdf).toContain('2.0');
    expect(pdf).not.toContain('BYE');
  });
});
