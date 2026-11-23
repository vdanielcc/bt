import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatAutocompleteHarness } from '@angular/material/autocomplete/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { of, Subject } from 'rxjs';
import { RegistrationSummary, RegistrationSummaryService } from '../invitations/registration-summary.service';
import { EventPaymentReviewComponent } from './event-payment-review.component';

const summary: RegistrationSummary = { eventId: 34, eventName: 'Evento', academyId: 9, academyName: 'Dojo Águila',
  methodOfPayment: null, entries: [], total: 20000, pricingComplete: true, approvedAmount: 0, pendingAmount: 10000, balance: 20000,
  transfers: [{ reference: 'ref', amount: 10000, approved: false, status: 'PENDING', createdAt: '', receipts: [] }] };
describe('Organizer payment review', () => {
  let fixture: ComponentFixture<EventPaymentReviewComponent>;
  let service: jasmine.SpyObj<RegistrationSummaryService>;
  beforeEach(async () => {
    service = jasmine.createSpyObj('RegistrationSummaryService', ['getOrganizerAcademies', 'getOrganizerSummary', 'review', 'download']);
    service.getOrganizerAcademies.and.returnValue(of([{ id: 9, name: 'Dojo Águila' }, { id: 10, name: 'Escuela Norte' }]));
    service.getOrganizerSummary.and.returnValue(of(summary));
    await TestBed.configureTestingModule({ imports: [EventPaymentReviewComponent, NoopAnimationsModule, HttpClientTestingModule],
      providers: [{ provide: RegistrationSummaryService, useValue: service }] }).compileComponents();
    fixture = TestBed.createComponent(EventPaymentReviewComponent); fixture.componentRef.setInput('eventId', 34); fixture.detectChanges();
  });
  it('filters predictive options while typing and loads only a selected dojo in event 34', async () => {
    const input = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatAutocompleteHarness);
    await input.enterText('aguila');
    const options = await input.getOptions(); expect(options.length).toBe(1); expect(await options[0].getText()).toBe('Dojo Águila');
    expect(service.getOrganizerSummary).not.toHaveBeenCalled();
    await input.selectOption({ text: 'Dojo Águila' });
    expect(service.getOrganizerSummary).toHaveBeenCalledOnceWith(34, 9);
    expect(fixture.componentInstance.summary?.total).toBe(20000);
  });
  it('clears the previous dojo and ignores a stale response after typing another name', () => {
    const pending = new Subject<RegistrationSummary>(); service.getOrganizerSummary.and.returnValue(pending);
    fixture.componentInstance.academy.setValue({ id: 9, name: 'Dojo Águila' });
    fixture.componentInstance.academy.setValue('Norte'); pending.next(summary);
    expect(fixture.componentInstance.summary).toBeUndefined();
  });
  it('requires a rejection reason and displays the reviewed summary', () => {
    const component = fixture.componentInstance; component.academy.setValue({ id: 9, name: 'Dojo Águila' });
    component.review(summary.transfers[0], 'REJECTED'); expect(service.review).not.toHaveBeenCalled();
    component.reasons['ref'] = '  Ilegible  ';
    service.review.and.returnValue(of({ ...summary, pendingAmount: 0, transfers: [{ ...summary.transfers[0], status: 'REJECTED', reviewReason: 'Ilegible' }] }));
    component.review(summary.transfers[0], 'REJECTED');
    expect(service.review).toHaveBeenCalledOnceWith(34, 9, 'ref', 'REJECTED', 'Ilegible');
    expect(component.status(component.summary!.transfers[0])).toBe('Rechazado');
    expect(component.summary?.balance).toBe(20000);
  });
});
