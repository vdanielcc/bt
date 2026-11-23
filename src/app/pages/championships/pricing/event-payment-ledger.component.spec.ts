import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EventPaymentLedgerComponent } from './event-payment-ledger.component';

describe('Event payment reconciliation', () => {
  let component: EventPaymentLedgerComponent;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, EventPaymentLedgerComponent] });
    http = TestBed.inject(HttpTestingController);
    component = new EventPaymentLedgerComponent(TestBed.inject(HttpClient));
    component.eventId = 35; component.academyId = 1;
  });
  afterEach(() => { component.ngOnDestroy(); http.verify(); });
  it('sends a scoped allocation with a reason and reuses the operation after a failed response', () => {
    component.canReconcile = true; component.reference = 'receipt-1'; component.batchId = 7; component.amount = 5000; component.reason = 'Comprobado';
    component.allocate();
    const first = http.expectOne(r => r.url.endsWith('/payments/allocations'));
    expect(first.request.params.get('academyId')).toBe('1');
    const body = first.request.body;
    expect(body.amount).toBe(5000); expect(body.reason).toBe('Comprobado'); expect(body.batchId).toBe(7);
    first.flush({ message: 'Sin conexión' }, { status: 503, statusText: 'Unavailable' });
    component.allocate();
    const retry = http.expectOne(r => r.url.endsWith('/payments/allocations'));
    expect(retry.request.body.operationId).toBe(body.operationId);
    retry.flush({ message: 'Sin conexión' }, { status: 503, statusText: 'Unavailable' });
  });
  it('does not allow the academy read-only view to write allocations', () => {
    component.reference = 'r'; component.batchId = 7; component.amount = 5000; component.reason = 'Motivo';
    component.allocate(); http.expectNone(r => r.method === 'POST'); expect(component.saving).toBeFalse();
  });
  it('requires a reason before confirming historical prices', () => {
    component.canReconcile = true; component.reference = 'r'; component.selectHistorical(1, true);
    component.historical.get(1)!.amount = 17000;
    component.createHistorical(); http.expectNone(r => r.method === 'POST');
    expect(component.error).toContain('motivo');
  });
  it('keeps legacy reconciliation available even when old tariffs are missing', () => {
    component.load();
    http.expectOne(r => r.url.endsWith('/payments/ledger')).flush({ data: {
      transfers: [{ paymentId: 1, reference: 'legacy-1', status: 'APPROVED', amount: 17000, unallocatedAmount: 17000, batchId: null }], allocations: [], audit: [], unallocatedApproved: 17000
    } });
    http.expectOne(r => r.url.endsWith('/pricing/batches')).flush({ message: 'Falta la tarifa histórica' }, { status: 422, statusText: 'Unprocessable' });
    expect(component.unallocated.length).toBe(1); expect(component.ledger?.unallocatedApproved).toBe(17000);
  });
  it('renders the ledger and administrative fields without exposing technical audit JSON', () => {
    const fixture = TestBed.createComponent(EventPaymentLedgerComponent);
    fixture.componentInstance.ledger = { transfers: [], allocations: [], audit: [{ id: 1, action: 'REPRICE', actorUserId: null, batchId: 7, createdAt: '', reason: 'Fin de preventa', transferReference: '', detailsJson: '{"before":{"total":12000},"after":{"total":20000}}' }], unallocatedApproved: 0 };
    fixture.componentInstance.canReconcile = true; fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Asignar un pago antiguo aprobado');
    expect(fixture.nativeElement.textContent).toContain('Total anterior:');
    expect(fixture.nativeElement.textContent).not.toContain('detailsJson'); fixture.destroy();
  });
});
