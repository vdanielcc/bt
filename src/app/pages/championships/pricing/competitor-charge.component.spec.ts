import { of } from 'rxjs';
import { CompetitorChargeComponent } from './competitor-charge.component';
import { EventPricingService } from './event-pricing.service';

describe('Current charge and historical versions', () => {
  it('shows the current calculation while retaining the saved historical amount', () => {
    const historical = { id: 1, isCurrent: true, calculation: { totalAmount: 20000 } };
    const current = { id: 1, calculatedAt: '', calculation: { totalAmount: 30000 } };
    const api = jasmine.createSpyObj('EventPricingService', ['history', 'getCompetitorCharge']);
    api.history.and.returnValue(of([historical])); api.getCompetitorCharge.and.returnValue(of(current));
    const component = new CompetitorChargeComponent(api as EventPricingService);
    component.eventId = 35; component.competitorId = 1; component.open();
    expect(component.charge?.calculation.totalAmount).toBe(30000);
    expect(component.history[0].calculation.totalAmount).toBe(20000);
    expect(api.getCompetitorCharge).toHaveBeenCalledWith(35, 1);
    component.ngOnDestroy();
  });
});
