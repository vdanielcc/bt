import { jsPDF } from 'jspdf';
import { renderTournamentPdf } from './tournament-fixture-pdf';

describe('Competition PDF winner and podium', () => {
  for (const association of ['WKF', 'JKA', 'WUKF']) for (const fixtureType of ['ELIMINACION', 'ROUNDROBIN', 'MEJORDETRES', 'KATAJKA']) {
    for (const playoff of [false, true]) it(`${association} ${fixtureType} prints one winner and ${playoff ? 'one' : 'two'} third place rows`, () => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 2;
      const logo = canvas.toDataURL('image/png');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [330, 216] });
      const texts = spyOn(doc, 'text').and.callThrough();
      const rects = spyOn(doc, 'rect').and.callThrough();
      const fixture = { fixtureType, version: 1, thirdPlacePlayoff: playoff, rounds: [{ number: 1, name: 'Final', matches: [{ id: 1, position: 1, matchNumber: 1,
        top: { competitorId: 1, name: 'Ana' }, bottom: fixtureType === 'KATAJKA' ? {} : { competitorId: 2, name: 'Luis' } }] }] };
      const original = JSON.stringify(fixture);
      renderTournamentPdf(doc, [{ category: { code: 'K1', name: 'Categoria', pdfGroup: 3 }, fixture }], 'Torneo', logo, logo, 'Karate', association);
      const calls = texts.calls.allArgs();
      expect(calls.filter(args => String(args[0]) === 'Ganador').length).toBe(1);
      const places = calls.filter(args => args[1] === 12).map(args => String(args[0]));
      expect(places.filter(text => text === '3er lugar').length).toBe(playoff ? 1 : 2);
      expect(calls.some(args => String(args[0]) === 'Definición de tercer lugar')).toBe(playoff);
      if (fixtureType === 'ELIMINACION') expect(rects.calls.allArgs().filter(([x,,w,h]) => x >= 165 && w > 60 && h < 9).length).toBe(1);
      expect(JSON.stringify(fixture)).toBe(original);
      expect(doc.internal.pageSize.getWidth()).toBeCloseTo(330, 1);
      expect(doc.internal.pageSize.getHeight()).toBeCloseTo(216, 1);
      for (const [x, y, w, h] of rects.calls.allArgs()) {
        expect(x).toBeGreaterThanOrEqual(10);expect(x + w).toBeLessThanOrEqual(320);
        expect(y).toBeGreaterThan(42);expect(y + h).toBeLessThan(202);
      }
    });
  }
});
