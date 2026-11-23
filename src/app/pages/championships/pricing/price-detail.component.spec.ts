import { TestBed } from '@angular/core/testing';
import { PriceDetailComponent } from './price-detail.component';
import { EnrollmentPriceResult } from './event-pricing.models';
describe('Enrollment combination total', () => {
  it('shows the package total without allocated category amounts in the enrollment preview', () => {
    const fixture = TestBed.createComponent(PriceDetailComponent);
    const result: EnrollmentPriceResult = { eventId: 1, competitorId: null, priceRuleId: 1, calculationType: 'BY_COMBINATION', basePrice: 30000, additionalPrice: 0, billableUnits: 2, baseAmount: 30000, additionalAmount: 0, discountAmount: 0, totalAmount: 30000, groups: [], categories: [1,2].map(id => ({categoryId:id,categoryName:'Categoría '+id,modalityId:id,modalityName:'Modalidad',isFree:false,priceGroupId:null,priceGroupName:null,amount:15000,reason:'Incluida en combinación'})) };
    fixture.componentInstance.result = result; fixture.componentInstance.combinationTotalOnly = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('$30.000');
    expect(fixture.nativeElement.textContent).not.toContain('$15.000');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
    fixture.componentInstance.combinationTotalOnly = false; fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
    fixture.componentInstance.combinationTotalOnly = true; result.calculationType = 'BY_CATEGORY'; fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
    fixture.destroy();
  });
});
