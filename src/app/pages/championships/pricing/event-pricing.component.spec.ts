import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatSelectHarness } from '@angular/material/select/testing';
import { of } from 'rxjs';
import { EventPricingComponent } from './event-pricing.component';
import { EventPricingService } from './event-pricing.service';
import { EventPricingConfiguration } from './event-pricing.models';

describe('Event pricing calculation type form', () => {
  it('switches between combination, group and category forms through the selector', async () => {
    const config: EventPricingConfiguration = {
      mode: 'LEGACY', rule: null,
      calculationTypes: [
        { id: 1, code: 'BY_CATEGORY', name: 'Por categoría', description: null, isActive: true },
        { id: 2, code: 'BY_GROUP', name: 'Por grupo tarifario', description: null, isActive: true },
        { id: 3, code: 'BY_COMBINATION', name: 'Por combinación', description: null, isActive: true }
      ], categories: Array.from({ length: 74 }, (_, index) => ({ categoryId: index + 1, categoryName: `Categoría ${index + 1}`, modalityId: index % 3 + 1, modalityName: ['Kata', 'Kumite', 'Equipo'][index % 3] }))
    };
    await TestBed.configureTestingModule({
      imports: [EventPricingComponent, NoopAnimationsModule],
      providers: [provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ eventId: '1' }) } } },
        { provide: EventPricingService, useValue: { getPricing: () => of(config), summary: () => of(null), calculate: jasmine.createSpy('calculate').and.returnValue(of(null)) } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(EventPricingComponent);
    fixture.autoDetectChanges();
    const select = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatSelectHarness.with({ selector: '[formControlName="calculationTypeId"]' }));
    const text = () => fixture.nativeElement.textContent as string;
    expect(text()).toContain('Tarifas por combinación');
    const modalities = fixture.componentInstance.modalities;
    const button: HTMLButtonElement = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(b => b.textContent?.includes('Agregar combinación'))!;
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.modalities).toBe(modalities);
    const optionsBefore = Array.from(fixture.nativeElement.querySelectorAll('mat-option'));
    fixture.detectChanges();
    expect(Array.from(fixture.nativeElement.querySelectorAll('mat-option'))).toEqual(optionsBefore);
    const tariff = fixture.componentInstance.rule!.combinations![0];
    tariff.price = 30000;
    await select.clickOptions({ text: 'Por grupo tarifario' });
    expect(text()).toContain('Grupos tarifarios');
    expect(text()).toContain('Precio primera unidad');
    expect(text()).not.toContain('Agregar combinación');
    await select.clickOptions({ text: 'Por categoría' });
    expect(text()).toContain('Precio primera unidad');
    expect(text()).not.toContain('Grupos tarifarios');
    expect(text()).not.toContain('Agregar combinación');
    await select.clickOptions({ text: 'Por combinación' });
    expect(text()).toContain('Agregar combinación');
    expect(text()).not.toContain('Precio primera unidad');
    expect(fixture.componentInstance.rule!.combinations![0]).toBe(tariff);
    expect(tariff.price).toBe(30000);
    expect(fixture.componentInstance.dirty).toBeTrue();
    config.categories.push({categoryId:75,categoryName:'Kata equipo femenino',modalityId:4,modalityName:'Kata Equipo Femenino'});
    fixture.componentInstance.selected.add(75);fixture.componentInstance.dirty=false;
    fixture.componentInstance.simulate();
    expect(TestBed.inject(EventPricingService).calculate).toHaveBeenCalledWith(1,[75],{registrationType:'EQUIPO'});
    fixture.destroy();
  });
});
