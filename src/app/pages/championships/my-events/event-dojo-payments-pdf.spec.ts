import { jsPDF } from 'jspdf';
import { of, Subject, throwError } from 'rxjs';
import { RegistrationSummary } from '../invitations/registration-summary.service';
import { EventDojoPaymentsPdfComponent } from './event-dojo-payments-pdf.component';
import { paymentPdfMoney, renderDojoPaymentsPdf } from './event-dojo-payments-pdf';

function summary(name = 'Dojo Prueba'): RegistrationSummary {
  return { eventId: 35, eventName: 'Campeonato de prueba', academyId: 1, academyName: name, methodOfPayment: null,
    entries: [{ competitorId: 1, name: 'María González', isTeam: false,
      categories: [{ id: 1, name: 'Kata adulto' }, { id: 2, name: 'Kumite adulto' }], amount: 25000, paidAmount: 10000, balance: 15000 }],
    total: 25000, approvedAmount: 10000, pendingAmount: 5000, balance: 15000, pricingComplete: true, transfers: [] };
}

describe('Dojo payment PDF', () => {
  it('groups dojos alphabetically, includes categories and charges each entrant once', () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const draw = spyOn(doc, 'text').and.callThrough();
    renderDojoPaymentsPdf(doc, 'Campeonato', [summary('Dojo Z'), summary('Dojo A')]);
    const texts = draw.calls.allArgs().map(args => String(args[0]));
    expect(texts.indexOf('Dojo A')).toBeLessThan(texts.indexOf('Dojo Z'));
    expect(texts).toContain('Kata adulto'); expect(texts).toContain('Kumite adulto');
    // One entry amount and one dojo total for each dojo, never one amount per category.
    expect(texts.filter(t => t === '$ 25.000').length).toBe(4);
    expect(texts).toContain('TOTAL DOJO - 1 inscritos');
    expect(doc.getNumberOfPages()).toBe(2);
  });
  it('distinguishes unknown tariffs and unallocated payments from zero', () => {
    const data = summary(); data.pricingComplete = false;
    data.entries[0] = { ...data.entries[0], amount: null, paidAmount: null, balance: null };
    const doc = new jsPDF({ orientation: 'landscape' });
    const draw = spyOn(doc, 'text').and.callThrough();
    renderDojoPaymentsPdf(doc, data.eventName, [data]);
    const texts = draw.calls.allArgs().map(args => String(args[0]));
    expect(texts).toContain('Pendiente de tarifa'); expect(texts).toContain('Sin asignar');
    expect(texts).toContain('$ 25.000 (parcial)');
    expect(paymentPdfMoney(0)).toBe('$ 0'); expect(paymentPdfMoney(null)).toBe('Sin asignar');
  });
  it('paginates long category lists and large dojos within the printable area', () => {
    const data = summary();
    data.entries = Array.from({ length: 50 }, (_, i) => ({ ...data.entries[0], competitorId: i,
      categories: Array.from({ length: i === 0 ? 60 : 3 }, (_, j) => ({ id: j, name: 'Categoría larga de Kumite damas adultas avanzadas hasta 68 kilos' })) }));
    const doc = new jsPDF({ orientation: 'landscape' });
    const draw = spyOn(doc, 'text').and.callThrough();
    renderDojoPaymentsPdf(doc, data.eventName, [data]);
    expect(doc.getNumberOfPages()).toBeGreaterThan(3);
    expect(draw.calls.allArgs().every(args => Number(args[2]) <= 199)).toBeTrue();
    expect(draw.calls.allArgs().some(args => String(args[0]).includes('(continuación)'))).toBeTrue();
  });
});

describe('Dojo payment export loading', () => {
  function setup() {
    const service = jasmine.createSpyObj('payments', ['getOrganizerAcademies', 'getOrganizerSummary']);
    const snack = { open: jasmine.createSpy() };
    const component = new EventDojoPaymentsPdfComponent(service, snack as any, { markForCheck() {} } as any);
    component.eventId = 35;
    return { service, snack, component };
  }
  it('prevents duplicate exports and resets its busy state on a failed request', async () => {
    const { service, component, snack } = setup(); const pending = new Subject<any>();
    service.getOrganizerAcademies.and.returnValue(pending);
    const saving = component.download(); await component.download();
    expect(service.getOrganizerAcademies).toHaveBeenCalledTimes(1);
    pending.error(new Error('No disponible')); await saving;
    expect(component.busy).toBeFalse(); expect(snack.open).toHaveBeenCalled();
  });
  it('does not generate a partial PDF if any dojo fails to load', async () => {
    const { service, component, snack } = setup();
    service.getOrganizerAcademies.and.returnValue(of([{ id: 1, name: 'A' }, { id: 2, name: 'B' }]));
    service.getOrganizerSummary.and.callFake((event: number, id: number) => id === 1 ? of(summary()) : throwError(() => new Error('No disponible')));
    await component.download();
    expect(service.getOrganizerSummary).toHaveBeenCalledTimes(2);
    expect(snack.open).toHaveBeenCalled(); expect(component.busy).toBeFalse();
  });
});
