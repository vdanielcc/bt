import { jsPDF } from 'jspdf';
import { RegistrationSummary } from './registration-summary.service';
import { registrationSummaryWorkbook, renderRegistrationSummaryPdf, summaryFooter, summaryTimestamp, summaryTotals, registrationCountRows } from './registration-summary-export';

describe('Registration summary downloads', () => {
  const summary: RegistrationSummary = { eventId: 50, eventName: 'Torneo & Copa', academyId: 9, academyName: 'Dojo Norte',
    methodOfPayment: null, entries: [{ competitorId: 1, name: 'José', isTeam: false,
      categories: [{ id: 1, name: 'Kata' }, { id: 2, name: 'Kumite' }], amount: 15000 }],
    total: 15000, pricingComplete: true, approvedAmount: 4000, pendingAmount: 3000, balance: 11000, transfers: [] };
  const logos = { budo: 'data:image/png;base64,AA==', academy: 'data:image/png;base64,AA==', organizer: 'data:image/png;base64,AA==' };
  it('exports official athlete, coach, team and sporting registration counts separately', () => {
    const counted = { ...summary, totalCompetitors: 1, totalCoaches: 0, totalTeams: 2, totalRegistrations: 5 };
    expect(registrationCountRows(counted).map(row => row[1])).toEqual([1, 0, 2, 5]);
    const files = registrationSummaryWorkbook(counted, 'test', { budo: '', academy: '', organizer: '' });
    const sheet = String(files['xl/worksheets/sheet1.xml']);
    expect(sheet).toContain('Deportistas \u00fanicos');
    expect(sheet).toContain('Coaches');
    expect(sheet).toContain('Inscripciones deportivas (sin coaches)');
    expect(sheet).toContain('<c r="E10" t="n" s="0"><v>5</v></c>');
    expect(summaryTotals(counted)).toEqual(summaryTotals(summary));
  });
  it('keeps the official totals and unresolved fees', () => {
    const incomplete = { ...summary, pricingComplete: false, entries: [{ ...summary.entries[0], amount: null }] };
    expect(summaryTotals(summary)[3][1]).toBe(11000);
    const files = registrationSummaryWorkbook(incomplete, '04-10-2026 12:00', { budo: '', academy: '', organizer: '' });
    expect(files['xl/worksheets/sheet1.xml']).toContain('Por definir');
    expect(files['xl/worksheets/sheet1.xml']).toContain('Kata\nKumite');
    expect(files['xl/worksheets/sheet1.xml']).not.toContain('<v>null</v>');
  });
  it('embeds three images and writes numeric CLP cells in a valid workbook', () => {
    const files = registrationSummaryWorkbook(summary, '04-10-2026 12:00', logos);
    expect(Object.keys(files).filter(name => name.startsWith('xl/media/')).length).toBe(3);
    expect(files['xl/worksheets/sheet1.xml']).toContain('<c r="E5" t="n" s="0"><v>15000</v></c>');
    for (const [name, content] of Object.entries(files)) {
      if (typeof content === 'string') expect(new DOMParser().parseFromString(content, 'application/xml').querySelector('parsererror')).withContext(name).toBeNull();
    }
    expect(files['xl/drawings/drawing1.xml']).toContain('<xdr:col>2</xdr:col>');
  });
  it('uses Chile time and the requested footer URL', () => {
    expect(summaryTimestamp(new Date('2026-07-04T16:30:00Z'))).toContain('12:30');
    expect(summaryFooter('04-07-2026 12:30')).toBe('https://budotournaments.net/app  -  @budotournaments_net  -  04-07-2026 12:30');
  });
  it('paginates lengthy categories and repeats logos and the footer', () => {
    const doc = new jsPDF({ unit: 'mm', format: 'letter' });
    spyOn(doc, 'getImageProperties').and.returnValue({ width: 100, height: 100 } as any);
    const image = spyOn(doc, 'addImage').and.returnValue(doc);
    const text = spyOn(doc, 'text').and.callThrough();
    const entries = Array.from({ length: 60 }, (_, index) => ({ ...summary.entries[0], competitorId: index + 1 }));
    entries[0] = { ...entries[0], categories: Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Categoría ${i}` })) };
    renderRegistrationSummaryPdf(doc, { ...summary, entries }, '04-10-2026 12:00', logos);
    expect(doc.getNumberOfPages()).toBeGreaterThan(2);
    expect(image.calls.count()).toBe(doc.getNumberOfPages() * 3);
    expect(text.calls.allArgs().filter(args => args[0] === summaryFooter('04-10-2026 12:00')).length).toBe(doc.getNumberOfPages());
    expect(text.calls.allArgs().some(args => args[0] === '$ 11.000')).toBeTrue();
  });
});
