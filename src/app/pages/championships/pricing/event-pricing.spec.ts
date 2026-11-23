import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { EventPricingService } from './event-pricing.service';
import { EventPriceRule, EnrollmentPriceResult, PricingCategoryOption } from './event-pricing.models';
import { validatePricing } from './event-pricing.component';
import { EnrollmentPricePreviewComponent } from './enrollment-price-preview.component';
import { simulationRegistrationType } from './event-pricing.models';

const categories: PricingCategoryOption[] = [{ categoryId: 1, categoryName: 'Junior', modalityId: 1, modalityName: 'Kata' }];
function rule(): EventPriceRule { return { id: 1, eventId: 1, calculationTypeId: 1, calculationType: 'BY_CATEGORY', name: 'Tarifa', description: null, basePrice: 20000, additionalPrice: 10000, priority: 0, isActive: true, groups: [], categories: [{ categoryId: 1, priceGroupId: null, isFree: false, isActive: true }], modalities: [] }; }
const result: EnrollmentPriceResult = { eventId: 1, competitorId: null, priceRuleId: 1, calculationType: 'BY_GROUP', basePrice: 20000, additionalPrice: 10000, billableUnits: 1, baseAmount: 20000, additionalAmount: 0, discountAmount: 0, totalAmount: 20000, categories: [], groups: [] };
describe('Event pricing validation', () => {
  it('selects team tariffs for kata/kumite teams and keeps Coach outside the type decision', () => {
    const coach={categoryId:99,categoryName:'Coach',modalityId:8,modalityName:'Coach'};
    for(const modalityId of [4,5,6,7]) expect(simulationRegistrationType([{...categories[0],modalityId},coach])).toBe('EQUIPO');
    expect(simulationRegistrationType([...categories,coach])).toBe('INDIVIDUAL');
    expect(simulationRegistrationType([coach])).toBe('INDIVIDUAL');
    expect(simulationRegistrationType([...categories,{...categories[0],modalityId:4}])).toBeNull();
    const r=rule();r.calculationType='BY_GROUP';r.categories[0].isFree=true;
    expect(validatePricing(r,[...categories,coach])).toBe('');
  });
  it('keeps quantities exact and separates duplicate combinations by period and registration type', () => {
    const r = rule(); r.calculationType = 'BY_COMBINATION';
    r.combinations = [{ id: 'a', registrationType: 'INDIVIDUAL', isPresale: false, isActive: true, price: 30000, terms: [{modalityId:1,quantity:2}] }];
    expect(validatePricing(r,categories)).toBe('');
    r.combinations.push({...r.combinations[0],id:'b',isPresale:true});
    r.combinations.push({...r.combinations[0],id:'c',registrationType:'EQUIPO'});
    expect(validatePricing(r,categories)).toBe('');
    r.combinations.push({...r.combinations[0],id:'d'});
    expect(validatePricing(r,categories)).toContain('iguales');
    r.combinations[3].isActive = false; r.combinations[0].terms[0].quantity = 1.5;
    expect(validatePricing(r,categories)).toContain('cantidades');
  });
  it('validates optional group base prices, including zero and empty values', () => {
    const r = rule();
    r.groups = [{ id: 1, name: 'Equipos', groupOrder: 1, basePrice: 30000, additionalPrice: null, isBase: true, isActive: true }];
    expect(validatePricing(r, categories)).toBe('');
    for (const value of [-1, 30000.001, 100000000]) {
      r.groups[0].basePrice = value;
      expect(validatePricing(r, categories)).not.toBe('');
    }
    for (const value of [0, null, undefined]) {
      r.groups[0].basePrice = value;
      expect(validatePricing(r, categories)).toBe('');
    }
  });
  it('does not require groups for BY_CATEGORY', () => expect(validatePricing(rule(), categories)).toBe(''));
  it('requires a group after switching to BY_GROUP', () => { const r = rule(); r.calculationType = 'BY_GROUP'; expect(validatePricing(r, categories)).toContain('Junior'); });
  it('allows modality free and category free without a group', () => { const r = rule(); r.calculationType = 'BY_GROUP'; r.modalities = [{ modalityId: 1, isFree: true }]; expect(validatePricing(r, categories)).toBe(''); r.modalities = []; r.categories[0].isFree = true; expect(validatePricing(r, categories)).toBe(''); });
  it('validates group assignment and multiple bases', () => { const r = rule(); r.calculationType = 'BY_GROUP'; r.groups = [{ id: 1, name: 'Junior', groupOrder: 1, additionalPrice: null, isBase: true, isActive: true }]; r.categories[0].priceGroupId = 1; expect(validatePricing(r, categories)).toBe(''); r.groups.push({ ...r.groups[0], id: 2 }); expect(validatePricing(r, categories)).toContain('base'); });
  it('rejects negative and malformed prices', () => { const r = rule(); r.basePrice = -1; expect(validatePricing(r, categories)).not.toBe(''); r.basePrice = 20.001; expect(validatePricing(r, categories)).not.toBe(''); });
});
describe('Event pricing HTTP contracts', () => {
  let service: EventPricingService; let http: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ imports: [HttpClientTestingModule] }); service = TestBed.inject(EventPricingService); http = TestBed.inject(HttpTestingController); });
  afterEach(() => http.verify());
  it('creates a rule and sends numeric amounts', () => { service.createPricing(1, rule()).subscribe(); const req = http.expectOne(`${environment.apiBaseUrl}/events/1/pricing`); expect(req.request.method).toBe('POST'); expect(req.request.body.basePrice).toBe(20000); req.flush({ data: rule() }); });
  it('uses the API amount for simulation', () => { service.calculate(1, [1, 2]).subscribe(value => expect(value.totalAmount).toBe(20000)); const req = http.expectOne(`${environment.apiBaseUrl}/events/1/pricing/calculate`); expect(req.request.body).toEqual({ categoryIds: [1, 2] }); req.flush({ data: result }); });
  it('disables confirmation on error and cancels stale requests', fakeAsync(() => {
    const preview = new EnrollmentPricePreviewComponent(service); const ready = jasmine.createSpy('ready'); preview.ready.subscribe(ready);
    preview.eventId = 1; preview.categoryIds = '1'; preview.ngOnChanges(); tick(250);
    const first = http.expectOne(`${environment.apiBaseUrl}/events/1/pricing/calculate`);
    preview.categoryIds = '1,2'; preview.ngOnChanges(); expect(first.cancelled).toBeTrue(); tick(250);
    const second = http.expectOne(`${environment.apiBaseUrl}/events/1/pricing/calculate`); second.flush({ message: 'Falta grupo' }, { status: 422, statusText: 'Unprocessable Entity' });
    expect(preview.error).toBe('Falta grupo'); expect(ready).toHaveBeenCalledWith(false); expect(preview.result).toBeNull(); preview.ngOnDestroy();
  }));
});
