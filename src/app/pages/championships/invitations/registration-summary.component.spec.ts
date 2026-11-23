import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { RegistrationSummaryComponent } from './registration-summary.component';
import { RegistrationSummary, RegistrationSummaryService } from './registration-summary.service';
import { RegistrationSummaryExportService } from './registration-summary-export.service';
import { TariffBatch } from '../pricing/event-pricing.models';
import { TariffBatchesComponent } from '../pricing/tariff-batches.component';
import { EventPricingService } from '../pricing/event-pricing.service';

const summary: RegistrationSummary = {
  eventId: 35, eventName: 'Evento', academyId: 9, academyName: 'Academia', methodOfPayment: 'Banco',
  entries: [{ competitorId: 1, name: 'Deportista', isTeam: false, categories: [{ id: 1, name: 'Kata' }], amount: 20000 }],
  total: 20000, pricingComplete: true, approvedAmount: 0, pendingAmount: 0, balance: 20000, transfers: []
};

describe('Registration summary transfer form', () => {
  let component: RegistrationSummaryComponent;
  let service: jasmine.SpyObj<RegistrationSummaryService>;
  afterEach(() => component.ngOnDestroy());
  beforeEach(() => {
    service = jasmine.createSpyObj('RegistrationSummaryService', ['getSummary', 'upload', 'download', 'removeRegistration']);
    service.getSummary.and.returnValue(of(summary));
    component = new RegistrationSummaryComponent(
      { snapshot: { paramMap: convertToParamMap({ id: '35' }) } } as ActivatedRoute,
      { getCurrentUser: () => ({ academieId: 9 }) } as AuthService,
      service, { markForCheck: () => {} } as ChangeDetectorRef, {} as RegistrationSummaryExportService);
    component.ngOnInit();
  });
  function fill() {
    component.selectedBatch = { id: 7, total: 10000, period: 'NORMAL', status: 'UNPAID', createdAt: '', presaleEndAt: null, items: [] };
    component.amount.setValue(10000);
    component.files = [new File(['%PDF-1.7'], 'comprobante.pdf', { type: 'application/pdf' })];
  }
  it('loads the event and current academy and keeps official totals', () => {
    expect(service.getSummary).toHaveBeenCalledWith(35, 9);
    expect(component.summary?.total).toBe(20000);
  });
  it('does not delete when confirmation is cancelled', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    component.removeRegistration(summary.entries[0]);
    expect(service.removeRegistration).not.toHaveBeenCalled();
  });
  it('deletes only the selected competitor in the current event and reloads official totals', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const pending = new Subject<unknown>();
    service.removeRegistration.and.returnValue(pending);
    component.removeRegistration(summary.entries[0]);
    component.removeRegistration(summary.entries[0]);
    expect(service.removeRegistration).toHaveBeenCalledOnceWith(35, 1, undefined);
    fill(); component.submit(); expect(service.upload).not.toHaveBeenCalled();
    const refreshed = { ...summary, entries: [], total: 0, balance: 0 };
    service.getSummary.and.returnValue(of(refreshed));
    pending.next({}); pending.complete();
    expect(component.summary).toEqual(refreshed);
    expect(component.removingId).toBeNull();
    expect(service.getSummary).toHaveBeenCalledTimes(2);
  });
  it('keeps the row and shows the API rejection when deletion fails', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    service.removeRegistration.and.returnValue(throwError(() => ({ error: { message: 'Inscripción bloqueada' } })));
    component.removeRegistration(summary.entries[0]);
    expect(component.summary?.entries).toEqual(summary.entries);
    expect(component.error).toBe('Inscripción bloqueada');
    expect(component.removingId).toBeNull();
    expect(service.getSummary).toHaveBeenCalledTimes(1);
  });
  it('does not delete while a transfer is being submitted', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    component.saving = true;
    component.removeRegistration(summary.entries[0]);
    expect(service.removeRegistration).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();
  });
  it('requires amount and receipts', () => {
    component.submit(); expect(service.upload).not.toHaveBeenCalled();
    expect(component.error).toContain('monto');
  });
  it('requires a batch before uploading when batch payments are enabled', () => {
    fill();
    component.selectBatch({ enabled: true, batch: null });
    component.submit();
    expect(service.upload).not.toHaveBeenCalled();
    expect(component.error).toContain('lote');
  });
  it('fills the selected batch total and includes the batch in the transfer', () => {
    fill();
    component.selectBatch({ enabled: true, batch: { id: 7, total: 60000 } as TariffBatch });
    expect(component.amount.value).toBe(60000);
    service.upload.and.returnValue(new Subject<unknown>());
    component.submit();
    expect(service.upload).toHaveBeenCalledWith(35, 9, 60000, jasmine.any(String), component.files, 7);
  });
  it('creates the selected group batch and uploads without requiring a separate create action', () => {
    fill(); component.batchesEnabled = true; component.selectedBatch = null;
    const pending = new Subject<{ id: number; total: number; period: string }>();
    const batches = jasmine.createSpyObj('TariffBatchesComponent', ['preparePayment']);
    batches.preparePayment.and.returnValue(pending);
    component.tariffBatches = batches;
    service.upload.and.returnValue(new Subject<unknown>());
    component.submit(); component.submit();
    expect(batches.preparePayment).toHaveBeenCalledOnceWith(10000);
    expect(service.upload).not.toHaveBeenCalled();
    pending.next({ id: 8, total: 10000, period: 'NORMAL' }); pending.complete();
    expect(service.upload).toHaveBeenCalledWith(35, 9, 10000, jasmine.any(String), component.files, 8);
    expect(component.preparingBatch).toBeFalse();
  });
  it('keeps a partial abono when the newly created lot has a higher total', () => {
    fill(); component.selectedBatch = null;
    const batches = jasmine.createSpyObj('TariffBatchesComponent', ['preparePayment']);
    batches.preparePayment.and.returnValue(of({ id: 8, total: 20000, period: 'NORMAL' })); component.tariffBatches = batches;
    service.upload.and.returnValue(new Subject<unknown>()); component.submit();
    expect(service.upload).toHaveBeenCalledWith(35, 9, 10000, jasmine.any(String), component.files, 8);
  });
  it('caps abonos at the available balance after approved and pending payments', () => {
    fill(); component.selectBatch({ enabled: true, batch: { id: 7, total: 20000, approvedAmount: 7000, pendingAmount: 5000, availableAmount: 8000 } as TariffBatch });
    expect(component.amount.value).toBe(8000); component.amount.setValue(9000); component.submit();
    expect(service.upload).not.toHaveBeenCalled(); expect(component.error).toContain('saldo disponible');
    component.amount.setValue(6000); service.upload.and.returnValue(new Subject<unknown>()); component.submit();
    expect(service.upload).toHaveBeenCalledWith(35, 9, 6000, jasmine.any(String), component.files, 7);
  });
  it('keeps the receipt when the abono exceeds the updated batch total', () => {
    fill(); component.batchesEnabled = true; component.selectedBatch = null;
    const batches = jasmine.createSpyObj('TariffBatchesComponent', ['preparePayment']);
    batches.preparePayment.and.returnValue(of({ id: 8, total: 5000, period: 'NORMAL' }));
    component.tariffBatches = batches;
    component.submit();
    expect(service.upload).not.toHaveBeenCalled();
    expect(component.files.length).toBe(1);
    expect(component.error).toContain('Revisa el monto');
    expect(component.amount.value).toBe(5000);
  });
  it('keeps the receipt and allows retrying when batch creation fails', () => {
    fill(); component.batchesEnabled = true; component.selectedBatch = null;
    const batches = jasmine.createSpyObj('TariffBatchesComponent', ['preparePayment']);
    batches.preparePayment.and.returnValue(throwError(() => new Error('Selecciona deportistas')));
    component.tariffBatches = batches;
    component.submit();
    expect(service.upload).not.toHaveBeenCalled();
    expect(component.preparingBatch).toBeFalse();
    expect(component.files.length).toBe(1);
    expect(component.error).toBe('Selecciona deportistas');
  });
  it('prevents duplicate submissions and refreshes after success', () => {
    fill(); const pending = new Subject<unknown>(); service.upload.and.returnValue(pending);
    component.submit(); component.submit(); expect(service.upload).toHaveBeenCalledTimes(1);
    pending.next({}); pending.complete();
    expect(component.success).toContain('Pendientes'); expect(component.files).toEqual([]);
    expect(service.getSummary).toHaveBeenCalledTimes(2);
  });
  it('reuses the transfer reference after a failed response', () => {
    fill(); service.upload.and.returnValue(throwError(() => ({ error: { message: 'Sin conexión' } })));
    component.submit(); const reference = service.upload.calls.mostRecent().args[3];
    component.submit(); expect(service.upload.calls.mostRecent().args[3]).toBe(reference);
    expect(component.files.length).toBe(1);
  });
  it('blocks payments when tariffs are missing', () => {
    fill(); component.selectedBatch = null; component.summary = { ...summary, pricingComplete: false };
    component.submit(); expect(service.upload).not.toHaveBeenCalled();
  });
  it('rejects unsupported files before uploading', () => {
    component.addFiles({ target: { files: [new File(['html'], 'archivo.html')], value: 'x' } } as unknown as Event);
    expect(component.files.length).toBe(0); expect(component.error).toContain('JPG');
  });
});

describe('Payment batch creation', () => {
  it('uses the unpaid balance when approved categories already exist', () => {
    const api = jasmine.createSpyObj('EventPricingService', ['createBatch', 'batches']);
    api.createBatch.and.returnValue(of({ id: 9, total: 7000, period: 'NORMAL' }));
    api.batches.and.returnValue(new Subject());
    const component = new TariffBatchesComponent(api as EventPricingService);
    component.eventId = 35; component.academyId = 9;
    component.entries = [{ ...summary.entries[0], amount: 19000, paidAmount: 12000, balance: 7000 }];
    component.selected.add(1);
    component.preparePayment(7000).subscribe();
    expect(api.createBatch).toHaveBeenCalledWith(35, 9, [1], jasmine.any(String));
    component.ngOnDestroy();
  });
  it('enables payment batches for legacy tariffs without an active pricing rule', () => {
    const api = jasmine.createSpyObj('EventPricingService', ['batches']); api.batches.and.returnValue(of([]));
    const component = new TariffBatchesComponent(api as EventPricingService);
    const selection = jasmine.createSpy('selection'); component.selection.subscribe(selection);
    component.load();
    expect(component.enabled).toBeTrue(); expect(selection).toHaveBeenCalledWith({ enabled: true, batch: null });
    component.ngOnDestroy();
  });
  it('does not create a batch when the abono exceeds the selected group balance', () => {
    const api = jasmine.createSpyObj('EventPricingService', ['createBatch']);
    const component = new TariffBatchesComponent(api as EventPricingService);
    component.entries = summary.entries;
    component.selected.add(1);
    let error = '';
    component.preparePayment(25000).subscribe({ error: value => error = value.message });
    expect(api.createBatch).not.toHaveBeenCalled();
    expect(error).toContain('saldo del grupo');
  });
  it('creates the payment batch for exactly the selected competitors', () => {
    const api = jasmine.createSpyObj('EventPricingService', ['createBatch', 'getPricing', 'batches']);
    api.createBatch.and.returnValue(of({ id: 8, total: 20000, period: 'NORMAL' }));
    api.getPricing.and.returnValue(new Subject()); api.batches.and.returnValue(new Subject());
    const component = new TariffBatchesComponent(api as EventPricingService);
    component.eventId = 35; component.academyId = 9; component.enabled = true;
    component.entries = summary.entries; component.selected.add(1);
    const selection = jasmine.createSpy('selection'); component.selection.subscribe(selection);
    component.preparePayment(20000).subscribe();
    expect(api.createBatch).toHaveBeenCalledWith(35, 9, [1], jasmine.any(String));
    expect(selection).toHaveBeenCalledWith({ enabled: true, batch: jasmine.objectContaining({ id: 8, total: 20000 }) });
    component.ngOnDestroy();
  });
  it('selects the created batch immediately while refreshing the list is pending', () => {
    const api = jasmine.createSpyObj('EventPricingService', ['createBatch', 'getPricing', 'batches']);
    const batch: TariffBatch = { id: 7, total: 60000, period: 'NORMAL', status: 'UNPAID', createdAt: '', presaleEndAt: null, items: [] };
    api.createBatch.and.returnValue(of(batch));
    api.getPricing.and.returnValue(new Subject());
    api.batches.and.returnValue(new Subject());
    const component = new TariffBatchesComponent(api as EventPricingService);
    component.enabled = true;
    component.eventId = 35;
    component.academyId = 9;
    component.selected.add(1);
    const selection = jasmine.createSpy('selection');
    component.selection.subscribe(selection);
    component.create();
    expect(selection).toHaveBeenCalledWith({ enabled: true, batch });
    expect(component.selectedBatch).toBe(7);
    component.ngOnDestroy();
  });
});

describe('Registration payment HTTP contract', () => {
  let http: HttpTestingController;
  let service: RegistrationSummaryService;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(RegistrationSummaryService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('removes registrations using eventId and competitorId, not the student ID', () => {
    service.removeRegistration(35, 861).subscribe();
    const req = http.expectOne(r => r.url.endsWith('/Competitors/remove'));
    expect(req.request.method).toBe('DELETE');
    expect(req.request.params.get('eventId')).toBe('35');
    expect(req.request.params.get('competitorId')).toBe('861');
    expect(req.request.body).toBeNull();
    req.flush({});
  });
  it('sends one amount and all files in a multipart request', () => {
    const files = [new File(['a'], 'a.pdf'), new File(['b'], 'b.png')];
    service.upload(35, 9, 10000, 'reference', files).subscribe();
    const req = http.expectOne(r => r.url.endsWith('/Payments/transfer'));
    const form = req.request.body as FormData;
    expect(form.get('eventId')).toBe('35'); expect(form.get('academyId')).toBe('9');
    expect(form.getAll('amount')).toEqual(['10000']); expect(form.getAll('files').length).toBe(2);
    expect(form.get('requestId')).toBe('reference'); req.flush({});
  });
  it('unwraps the API summary envelope', () => {
    service.getSummary(35, 9).subscribe(value => expect(value).toEqual(summary));
    const req = http.expectOne(r => r.url.endsWith('/Payments/registration-summary'));
    expect(req.request.params.get('academyId')).toBe('9'); req.flush({ data: summary });
  });
});
