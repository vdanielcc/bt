import { jsPDF } from 'jspdf';
import { renderSchedulePdf, SchedulePdfArea } from './schedule-pdf';

describe('PDF del cronograma', () => {
  const area = (number: number, count = 2): SchedulePdfArea => ({ number, items: Array.from({ length: count }, (_, i) => ({
    type: i === 1 ? 'break' : 'category', code: `C${number}-${i}`, name: `Actividad ${number}-${i}`, competitorCount: 4, durationMinutes: 15
  })) });
  function render(areas: SchedulePdfArea[]) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [330, 216] });
    const text = spyOn(doc, 'text').and.callThrough();
    const rect = spyOn(doc, 'rect').and.callThrough();
    const images = spyOn(doc, 'addImage').and.callThrough();
    renderSchedulePdf(doc, { id: 32, name: 'Torneo', eventDateStart: '2026-10-03T09:30:00' } as any, 'Academia', areas);
    return { doc, text, rect, images };
  }
  it('ubica tres áreas por hoja sin imágenes e incluyendo las horas', () => {
    const { doc, text, images } = render([area(1), area(2), area(3), area(4)]);
    expect(doc.getNumberOfPages()).toBe(2);
    expect(images.calls.count()).toBe(0);
    const headings = text.calls.allArgs().filter(args => typeof args[0] === 'string' && args[0].startsWith('Área '));
    expect(headings.map(args => [args[0], args[1]])).toEqual([['Área 1', 13], ['Área 2', 119], ['Área 3', 225], ['Área 4', 13]]);
    expect(doc.output()).toContain('09:30 - 09:45');
    expect(doc.output()).toContain('09:45 - 10:00');
  });
  it('compacta dieciocho actividades por área en una sola hoja', () => {
    const { doc } = render([area(1, 18), area(2, 18), area(3, 18)]);
    expect(doc.getNumberOfPages()).toBe(1);
    for (let a = 1; a <= 3; a++) for (let i = 0; i < 18; i++) expect(doc.output()).toContain(`Actividad ${a}-${i}`);
  });
  it('continúa áreas extensas sin perder actividades ni reiniciar los horarios', () => {
    const { doc, rect } = render([area(1, 50), area(2), area(3)]);
    const pdf = doc.output();
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    for (let i = 0; i < 50; i++) expect(pdf).toContain(`Actividad 1-${i}`);
    expect(pdf).toContain('21:45 - 22:00');
    for (const [x, y, width, height] of rect.calls.allArgs()) {
      expect(x + width).toBeLessThanOrEqual(320);
      expect(y + height).toBeLessThanOrEqual(202);
    }
  });
});
