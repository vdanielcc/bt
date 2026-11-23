import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { VexPopoverRef } from '@vex/components/vex-popover/vex-popover-ref';
import { AuthService } from '../../../../core/auth/auth.service';
import { ImpersonateDialogComponent } from '../../../../core/auth/impersonate-dialog.component';
import { environment } from '../../../../../environments/environment';
import { SidenavUserMenuComponent } from './sidenav-user-menu.component';

describe('Sidenav change account action', () => {
  let fixture: ComponentFixture<SidenavUserMenuComponent>;
  let role: string;
  let popover: { close: jasmine.Spy };
  let backend: HttpTestingController;
  let dialog: MatDialog;

  beforeEach(() => {
    role = 'admin';
    popover = { close: jasmine.createSpy('close') };
    TestBed.configureTestingModule({
      imports: [SidenavUserMenuComponent, HttpClientTestingModule, RouterTestingModule,
        NoopAnimationsModule, MatDialogModule, MatIconTestingModule],
      providers: [
        { provide: VexPopoverRef, useValue: popover },
        { provide: AuthService, useValue: { getCurrentUser: () => ({ rol: role }) } }
      ]
    });
    fixture = TestBed.createComponent(SidenavUserMenuComponent);
    backend = TestBed.inject(HttpTestingController);
    dialog = TestBed.inject(MatDialog);
    fixture.detectChanges();
  });

  afterEach(fakeAsync(() => {
    dialog.closeAll();
    flush();
    backend.verify();
  }));

  it('opens the real academy selector from a rendered button click and supports searching', fakeAsync(() => {
    const button = fixture.nativeElement.querySelector('button.vex-user-menu-switch-account') as HTMLButtonElement;
    expect(button).not.toBeNull();
    button.click();
    expect(popover.close).toHaveBeenCalled();
    expect(dialog.openDialogs.length).toBe(1);
    const selector = dialog.openDialogs[0].componentInstance as ImpersonateDialogComponent;
    TestBed.inject(ApplicationRef).tick();
    backend.expectOne(`${environment.apiBaseUrl}/admin/user-academies`).flush([
      { id: 7, name: 'Águilas' }, { id: 8, name: 'Budo' }
    ]);
    TestBed.inject(ApplicationRef).tick();
    const input = document.querySelector('mat-dialog-container input') as HTMLInputElement;
    expect(input).not.toBeNull();
    input.value = 'agui';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    TestBed.inject(ApplicationRef).tick();
    expect(selector.filtered.map(a => a.id)).toEqual([7]);
    expect(selector.selected).toBeUndefined();
    flush();
  }));

  for (const otherRole of ['academy_admin', 'instructor', 'apoderado', 'alumno']) {
    it(`does not expose the admin selector to ${otherRole}`, () => {
      role = otherRole;
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button.vex-user-menu-switch-account')).toBeNull();
      fixture.componentInstance.switchAccount();
      expect(dialog.openDialogs.length).toBe(0);
      expect(popover.close).not.toHaveBeenCalled();
      backend.expectNone(`${environment.apiBaseUrl}/admin/user-academies`);
    });
  }
});
