import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';
import { ImpersonateDialogComponent } from './impersonate-dialog.component';
import { environment } from '../../../environments/environment';

describe('Academy impersonation selector', () => {
  let component: ImpersonateDialogComponent;
  let backend: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ImpersonateDialogComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [{ provide: MatDialogRef, useValue: { disableClose: false } }]
    });
    component = TestBed.createComponent(ImpersonateDialogComponent).componentInstance;
    backend = TestBed.inject(HttpTestingController);
    component.ngOnInit();
    backend.expectOne(`${environment.apiBaseUrl}/admin/user-academies`).flush([
      { id: 7, name: 'Águilas de Chile' }, { id: 8, name: 'Budo Santiago' }
    ]);
  });
  afterEach(() => backend.verify());
  it('searches academy names regardless of accents and case', () => {
    component.choice.setValue('AGUI');
    expect(component.filtered.map(a => a.id)).toEqual([7]);
  });
  it('requires selecting an academy instead of submitting arbitrary typed text', () => {
    component.choice.setValue('Águilas de Chile');
    expect(component.selected).toBeUndefined();
    component.choice.setValue(component.options[0]);
    expect(component.selected?.id).toBe(7);
  });
  it('shows all academies before searching', () => {
    expect(component.filtered.length).toBe(2);
  });
  it('shows an empty result for an unknown academy', () => {
    component.choice.setValue('no existe');
    expect(component.filtered).toEqual([]);
  });
});
