import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FederationCatalogComponent } from './federation-catalog.component';
import { environment } from '../../../../environments/environment';

describe('Federation catalog editor', () => {
  const api = `${environment.apiBaseUrl}/SportsAssociations`;
  let component: FederationCatalogComponent;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [FederationCatalogComponent, HttpClientTestingModule, NoopAnimationsModule] });
    const fixture = TestBed.createComponent(FederationCatalogComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(api).flush([]);
    http.expectOne(`${api}/editor-options`).flush({ communes: [{ id: 1, name: 'Comuna' }], representatives: [{ id: 2, name: 'Representante', documentNumber: '123' }] });
    component.edit();
    component.form.patchValue({ name: ' Federación ', address: ' Dirección ', email: ' federacion@example.com ', communeId: 1, legalRepresentativeId: 2 });
  });
  afterEach(() => http.verify());

  it('requires both RUT and verification digit before requesting a write', () => {
    component.form.patchValue({ rut: '123' });
    component.save();
    expect(component.saveError).toContain('dígito');
    http.expectNone(api);
  });

  it('keeps entered data and restores editing when the API reports a duplicate', () => {
    component.save();
    const request = http.expectOne(api);
    expect(request.request.method).toBe('POST');
    expect(request.request.body.name).toBe('Federación');
    component.save(); // A second click must not create another federation.
    http.expectNone(api);
    request.flush({ message: 'Ya existe una federación.' }, { status: 409, statusText: 'Conflict' });
    expect(component.editing).toBeTrue();
    expect(component.saving).toBeFalse();
    expect(component.form.enabled).toBeTrue();
    expect(component.form.controls.name.value).toBe('Federación');
    expect(component.saveError).toContain('Ya existe');
  });

  it('finds representatives by document number', () => {
    component.form.controls.legalRepresentativeId.setValue(null);
    component.representativeSearch = '123';
    expect(component.filteredRepresentatives.map(x => x.id)).toEqual([2]);
    component.representativeSearch = 'otro';
    expect(component.filteredRepresentatives).toEqual([]);
  });
});
