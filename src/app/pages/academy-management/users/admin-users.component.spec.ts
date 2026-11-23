import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatIconRegistry } from '@angular/material/icon';
import { of, Subject, throwError } from 'rxjs';
import { AcademyUsersComponent } from './academy-users.component';
import { AcademyUser, AcademyUsersService } from './academy-users.service';

describe('System admin user maintenance', () => {
  let api: jasmine.SpyObj<AcademyUsersService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  function setup(): AcademyUsersComponent {
    api = jasmine.createSpyObj('AcademyUsersService', ['academies', 'list']);
    api.academies.and.returnValue(of([{ id: 7, name: 'Dojo Uno' }, { id: 8, name: 'Dojo Dos' }]));
    api.list.and.returnValue(of([]));
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    dialog.open.and.returnValue({ afterClosed: () => of(false) } as any);
    TestBed.configureTestingModule({ imports: [AcademyUsersComponent, NoopAnimationsModule], providers: [
      { provide: AcademyUsersService, useValue: api }, { provide: MatDialog, useValue: dialog },
      { provide: ActivatedRoute, useValue: { snapshot: { data: { systemAdmin: true }, paramMap: convertToParamMap({}) } } },
      { provide: MatIconRegistry, useValue: { getNamedSvgIcon: () => of(document.createElementNS('http://www.w3.org/2000/svg', 'svg')) } }
    ] });
    TestBed.overrideComponent(AcademyUsersComponent, {
      add: { providers: [{ provide: MatDialog, useValue: dialog }] }
    });
    const fixture = TestBed.createComponent(AcademyUsersComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }
  it('requires academy selection before creating or fetching users', () => {
    const component = setup(); component.open();
    expect(component.academies.length).toBe(2);
    expect(api.list).not.toHaveBeenCalled(); expect(dialog.open).not.toHaveBeenCalled();
  });
  it('passes selected academy and admin capability to the account form', () => {
    const component = setup(); component.selectAcademy(8); component.open();
    expect(api.list).toHaveBeenCalledWith(8);
    expect(dialog.open.calls.mostRecent().args[1]?.data).toEqual({
      academyId: 8, academyName: 'Dojo Dos', systemAdmin: true, user: undefined
    });
  });
  it('cancels the previous list when changing academies and ignores stale responses', () => {
    const component = setup();
    const first = new Subject<AcademyUser[]>(); const second = new Subject<AcademyUser[]>();
    api.list.and.callFake(id => id === 7 ? first : second);
    component.selectAcademy(7); component.selectAcademy(8);
    first.next([{ id: 1 } as AcademyUser]);
    expect(component.data.data).toEqual([]);
    second.next([{ id: 2 } as AcademyUser]); second.complete();
    expect(component.data.data.map(row => row.id)).toEqual([2]);
    expect(component.loading).toBe(false);
  });
  it('supports retry after the academy catalog fails', () => {
    const component = setup();
    api.academies.and.returnValue(throwError(() => ({ status: 500 })));
    component.loadAcademies(); expect(component.academiesError).not.toBe('');
    api.academies.and.returnValue(of([{ id: 7, name: 'Dojo Uno' }]));
    component.loadAcademies(); expect(component.academiesError).toBe('');
  });
});
