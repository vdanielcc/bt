import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { NavigationEnd, Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { filter, firstValueFrom, of, take } from 'rxjs';
import { ACADEMY_MANAGEMENT_ROUTES } from '../academy-management.routes';
import { authGuard, sectionGuard } from '../../../core/auth/auth.guard';
import { AuthService } from '../../../core/auth/auth.service';
import { ClassEditorComponent } from './class-editor.component';
import { ClassStatusActionsComponent } from './class-status-actions.component';
import { AcademyConfirmDialogComponent } from '../shared/academy-confirm-dialog.component';
import { AcademyClassListItem } from '../models/academy-management.models';
import { environment } from '../../../../environments/environment';

describe('Authorized class management flow', () => {
  const api = environment.apiBaseUrl;
  const course: AcademyClassListItem = {
    id: 10, academyId: 7, code: 'KI-A', name: 'Karate Infantil A', description: 'Grupo infantil',
    trainingModalityId: 1, trainingModalityName: 'Karate Infantil', trainingModality: { id: 1, name: 'Karate Infantil', isActive: true },
    defaultRoomId: 1, defaultRoomName: 'Dojo Principal', defaultRoom: { id: 1, name: 'Dojo Principal', isActive: true },
    capacity: 20, startDate: '2026-03-01', endDate: '2026-12-15', status: 'ACTIVE', isActive: true, createdAt: '2026-10-09T12:00:00'
  };
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, NoopAnimationsModule], providers: [
      provideRouter([{ path: 'academies/:academyId', canActivate: [authGuard], canActivateChild: [sectionGuard], children: ACADEMY_MANAGEMENT_ROUTES }]),
      { provide: AuthService, useValue: { isAuthenticated: () => true, getCurrentUser: () => ({ rol: 'academy_admin', academieId: 7 }) } }
    ] });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(MatIconRegistry).addSvgIconInNamespace('mat', 'home', TestBed.inject(DomSanitizer).bypassSecurityTrustResourceUrl('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"></svg>'));
    spyOn(TestBed.inject(MatIconRegistry), 'getNamedSvgIcon').and.returnValue(of(document.createElementNS('http://www.w3.org/2000/svg', 'svg')));
  });
  afterEach(() => http.verify());
  function options(): void {
    http.expectOne(`${api}/academies/7/training-modalities`).flush([{ id: 1, academyId: 7, name: 'Karate Infantil', isActive: true }]);
    http.expectOne(`${api}/academies/7/rooms`).flush([{ id: 1, academyId: 7, name: 'Dojo Principal', isActive: true }]);
  }

  it('creates, opens detail, edits, deactivates, activates and closes through the existing guarded routes', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/academies/7/classes');
    options(); http.expectOne(`${api}/academies/7/classes/summary`).flush({ data: { total: 0, active: 0, inactive: 0, closed: 0 } });
    http.expectOne(`${api}/academies/7/classes`).flush({ data: [] }); harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Aún no existen clases.');

    await harness.navigateByUrl('/academies/7/classes/new'); options(); harness.detectChanges();
    let editor = harness.routeDebugElement!.query(By.directive(ClassEditorComponent)).componentInstance as ClassEditorComponent;
    editor.form.patchValue({ name: course.name, code: course.code, description: course.description, trainingModalityId: 1, defaultRoomId: 1, capacity: 20, startDate: course.startDate, endDate: course.endDate });
    harness.detectChanges();
    (harness.routeNativeElement!.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    const create = http.expectOne(`${api}/academies/7/classes`); expect(create.request.method).toBe('POST');
    const createdNavigation = firstValueFrom(TestBed.inject(Router).events.pipe(filter(event => event instanceof NavigationEnd), take(1)));
    create.flush({ data: course }); await createdNavigation; harness.detectChanges();
    http.expectOne(`${api}/classes/10`).flush({ data: course }); harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/academies/7/classes/10');
    expect(harness.routeNativeElement?.textContent).toContain('Dojo Principal');
    expect(harness.routeNativeElement?.textContent).not.toContain('Generar sesiones');

    await harness.navigateByUrl('/academies/7/classes/10/edit');
    http.expectOne(`${api}/classes/10`).flush({ data: course }); harness.detectChanges(); options(); harness.detectChanges();
    editor = harness.routeDebugElement!.query(By.directive(ClassEditorComponent)).componentInstance as ClassEditorComponent;
    editor.form.controls.capacity.setValue(25); editor.save();
    const update = http.expectOne(`${api}/classes/10`); expect(update.request.method).toBe('PUT'); expect(update.request.body.capacity).toBe(25);
    const updatedNavigation = firstValueFrom(TestBed.inject(Router).events.pipe(filter(event => event instanceof NavigationEnd), take(1)));
    update.flush({ data: { ...course, capacity: 25 } }); await updatedNavigation; harness.detectChanges();
    http.expectOne(`${api}/classes/10`).flush({ data: { ...course, capacity: 25 } }); harness.detectChanges();

    spyOn(TestBed.inject(MatDialog), 'open').and.returnValue({ afterClosed: () => of(true) } as unknown as MatDialogRef<AcademyConfirmDialogComponent>);
    const actions = harness.routeDebugElement!.query(By.directive(ClassStatusActionsComponent)).componentInstance as ClassStatusActionsComponent;
    for (const status of ['INACTIVE', 'ACTIVE', 'CLOSED'] as const) {
      actions.change(status); const request = http.expectOne(`${api}/classes/10/status`);
      expect(request.request.body.status).toBe(status);
      request.flush({ data: { ...course, capacity: 25, status, isActive: status === 'ACTIVE' } }); harness.detectChanges();
    }
    expect(harness.routeNativeElement?.textContent).toContain('Cerrada');
  });
});
