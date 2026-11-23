import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MatIconRegistry } from '@angular/material/icon';
import { of, Subject, throwError } from 'rxjs';
import { AcademyClassListItem, AcademyRoom, ClassInstructorAssignment, ClassSchedule } from '../models/academy-management.models';
import { AcademyManagementService } from '../services/academy-management.service';
import { AcademyOperationsService } from '../services/academy-operations.service';
import { ClassManagementService } from '../services/class-management.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ClassSchedulesComponent } from './class-schedules.component';
import { ClassInstructorsComponent } from './class-instructors.component';
import { ScheduleFormDialogComponent } from './schedule-form-dialog.component';
import { ClassInstructorDialogComponent } from './class-instructor-dialog.component';
import { ClassDetailComponent } from './class-detail.component';
import { environment } from '../../../../environments/environment';
const course: AcademyClassListItem = { id: 8, academyId: 7, name: 'Karate', code: 'K1', description: null, trainingModalityId: 1, trainingModalityName: 'Karate', trainingModality: { id: 1, name: 'Karate', isActive: true }, defaultRoomId: 2, defaultRoomName: 'Sala principal', defaultRoom: { id: 2, name: 'Sala principal', isActive: true }, capacity: 20, startDate: null, endDate: null, status: 'ACTIVE', isActive: true };
const schedule: ClassSchedule = { id: 1, classId: 8, roomId: 2, dayOfWeek: 1, startTime: '18:00:00', endTime: '19:00:00', effectiveFrom: '2026-03-01', effectiveTo: null, isActive: true };
const assignment: ClassInstructorAssignment = { id: 3, classId: 8, academyInstructorId: 9, role: 'INSTRUCTOR', isPrimary: false, startDate: '2026-03-01', endDate: null, status: 'ACTIVE' };
const instructor = { id: 9, academyId: 7, personId: 15, personName: 'Ana Pérez', isActive: true, title: null, licenseNumber: null, startDate: null, endDate: null };
const room: AcademyRoom = { id: 2, academyId: 7, name: 'Dojo', isActive: true, description: null, capacity: 20 };

describe('Class planning tabs and actions', () => {
  let classes: jasmine.SpyObj<ClassManagementService>; let operations: jasmine.SpyObj<AcademyOperationsService>; let dialog: jasmine.SpyObj<MatDialog>; let role: string;
  beforeEach(() => {
    role = 'academy_admin'; classes = jasmine.createSpyObj('classes',['getSchedules','deleteSchedule']); classes.getSchedules.and.returnValue(of([schedule])); classes.deleteSchedule.and.returnValue(of(undefined));
    operations = jasmine.createSpyObj('operations',['getClassInstructors','removeInstructor']); operations.getClassInstructors.and.returnValue(of([assignment])); operations.removeInstructor.and.returnValue(of(undefined));
    dialog = jasmine.createSpyObj('dialog',['open']); dialog.open.and.returnValue({ afterClosed: () => of(true) } as MatDialogRef<unknown>);
    TestBed.configureTestingModule({ imports: [ClassSchedulesComponent, ClassInstructorsComponent, NoopAnimationsModule], providers: [
      { provide: ClassManagementService, useValue: classes }, { provide: AcademyOperationsService, useValue: operations }, { provide: MatDialog, useValue: dialog },
      { provide: AcademyManagementService, useValue: { getRooms: () => of([room]), getInstructors: () => of([instructor]) } }, { provide: AuthService, useValue: { getCurrentUser: () => ({ rol: role }) } }
    ] });
  });
  it('renders schedule day/time/room and prevents deactivating the last active schedule', () => {
    const fixture = TestBed.createComponent(ClassSchedulesComponent); fixture.componentRef.setInput('course',course); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Lunes'); expect(fixture.nativeElement.textContent).toContain('18:00'); expect(fixture.nativeElement.textContent).toContain('Dojo');
    fixture.componentInstance.deactivate(schedule); expect(classes.deleteSchedule).not.toHaveBeenCalled(); expect(dialog.open).not.toHaveBeenCalled();
    fixture.componentInstance.edit(schedule); expect(dialog.open.calls.mostRecent().args[1]).toEqual(jasmine.objectContaining({ data: jasmine.objectContaining({ mustRemainActive: true }) }));
  });
  it('confirms schedule deactivation and refreshes only after success', () => {
    classes.getSchedules.and.returnValue(of([schedule, { ...schedule, id: 2, dayOfWeek: 3 }]));
    const fixture = TestBed.createComponent(ClassSchedulesComponent); fixture.componentRef.setInput('course',course); fixture.detectChanges();
    fixture.componentInstance.deactivate(schedule); expect(classes.deleteSchedule).toHaveBeenCalledWith(1); expect(classes.getSchedules).toHaveBeenCalledTimes(2);
  });
  it('shows loading errors and supports retry without displaying stale rows', () => {
    classes.getSchedules.and.returnValue(throwError(() => ({ error: { message: 'Acceso denegado.' } })));
    const fixture = TestBed.createComponent(ClassSchedulesComponent); fixture.componentRef.setInput('course',course); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Acceso denegado.');
    classes.getSchedules.and.returnValue(of([])); fixture.componentInstance.load(); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('necesita al menos un horario activo');
  });
  it('renders instructor names and preserves the list when unlinking fails', () => {
    operations.removeInstructor.and.returnValue(throwError(() => ({ error: { message: 'No se puede desvincular.' } })));
    const fixture = TestBed.createComponent(ClassInstructorsComponent); fixture.componentRef.setInput('course',course); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Ana Pérez');
    fixture.componentInstance.remove(assignment); expect(fixture.componentInstance.actionError).toBe('No se puede desvincular.'); expect(fixture.componentInstance.rows.length).toBe(1); expect(fixture.componentInstance.busy).toBeFalse();
  });
  it('hides management controls and ignores direct edit/remove attempts for instructors', () => {
    role='instructor'; const fixture = TestBed.createComponent(ClassInstructorsComponent); fixture.componentRef.setInput('course',course); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('+ Asignar'); fixture.componentInstance.edit(); fixture.componentInstance.remove(assignment); expect(dialog.open).not.toHaveBeenCalled(); expect(operations.removeInstructor).not.toHaveBeenCalled();
  });
});

describe('Class planning dialogs', () => {
  let operations: jasmine.SpyObj<AcademyOperationsService>; let classes: jasmine.SpyObj<ClassManagementService>; let close: jasmine.Spy; let data: Record<string, unknown>;
  beforeEach(() => {
    operations=jasmine.createSpyObj('operations',['assignInstructor','updateClassInstructor']); classes=jasmine.createSpyObj('classes',['createSchedule','updateSchedule']); close=jasmine.createSpy('close');
    data={ academyId:7, classId:8, instructors:[instructor], assignments:[] };
    TestBed.configureTestingModule({ providers: [{ provide: AcademyOperationsService,useValue:operations }, { provide:ClassManagementService,useValue:classes }, { provide:AcademyManagementService,useValue:{ getRooms:()=>of([room]) } }, { provide:MAT_DIALOG_DATA,useValue:data }, { provide:MatDialogRef,useValue:{close} }] });
  });
  it('keeps an instructor dialog open with the server conflict and guards double submit', () => {
    operations.assignInstructor.and.returnValue(throwError(()=>({error:{message:'El instructor ya está asignado.'}})));
    const component=TestBed.runInInjectionContext(()=>new ClassInstructorDialogComponent()); component.form.controls.academyInstructorId.setValue(9); component.save(); expect(component.error).toContain('ya está asignado'); expect(close).not.toHaveBeenCalled();
    const pending=new Subject<ClassInstructorAssignment>(); operations.assignInstructor.and.returnValue(pending); component.save(); component.save(); expect(operations.assignInstructor).toHaveBeenCalledTimes(2); pending.complete();
  });
  it('updates the existing assignment using its id and typed body', () => {
    data['assignment']=assignment; operations.updateClassInstructor.and.returnValue(of(assignment)); const component=TestBed.runInInjectionContext(()=>new ClassInstructorDialogComponent()); component.form.controls.role.setValue('HEAD_INSTRUCTOR'); component.save();
    expect(operations.updateClassInstructor).toHaveBeenCalledWith(3,jasmine.objectContaining({academyInstructorId:9,role:'HEAD_INSTRUCTOR',startDate:'2026-03-01'})); expect(close).toHaveBeenCalledWith(true);
  });
  it('rejects invalid schedule time/date ranges and handles save conflicts', () => {
    const component=TestBed.runInInjectionContext(()=>new ScheduleFormDialogComponent()); component.form.patchValue({startTime:'19:00',endTime:'18:00'}); component.save(); expect(classes.createSchedule).not.toHaveBeenCalled();
    component.form.patchValue({startTime:'18:00',endTime:'19:00',effectiveFrom:'2026-03-02',effectiveTo:'2026-03-01'}); component.save(); expect(classes.createSchedule).not.toHaveBeenCalled();
    classes.createSchedule.and.returnValue(throwError(()=>({error:{message:'La sala está ocupada.'}}))); component.form.controls.effectiveTo.setValue(''); component.save(); expect(component.error).toBe('La sala está ocupada.'); expect(close).not.toHaveBeenCalled();
  });
});

describe('Class detail lazy planning tabs with real HTTP services', () => {
  let http: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ imports:[HttpClientTestingModule,NoopAnimationsModule],providers:[provideRouter([{path:'academies/:academyId/classes/:classId',component:ClassDetailComponent}]),{provide:AuthService,useValue:{getCurrentUser:()=>({rol:'academy_admin'})}}] }); http=TestBed.inject(HttpTestingController); spyOn(TestBed.inject(MatIconRegistry),'getNamedSvgIcon').and.returnValue(of(document.createElementNS('http://www.w3.org/2000/svg','svg'))); });
  afterEach(()=>http.verify());
  it('loads schedules and instructors only when their tabs are opened', async () => {
    const harness=await RouterTestingHarness.create(); await harness.navigateByUrl('/academies/7/classes/8'); http.expectOne(`${environment.apiBaseUrl}/classes/8`).flush({data:course}); harness.detectChanges();
    http.expectNone(`${environment.apiBaseUrl}/classes/8/schedules`);
    const clickTab=async (label:string)=> { const tabs=Array.from(harness.routeNativeElement!.querySelectorAll<HTMLElement>('[role="tab"]')); tabs.find(t=>t.textContent?.includes(label))!.click(); harness.detectChanges(); await harness.fixture.whenStable(); harness.detectChanges(); };
    await clickTab('Horarios'); http.expectOne(`${environment.apiBaseUrl}/classes/8/schedules`).flush({data:[schedule]}); http.expectOne(`${environment.apiBaseUrl}/academies/7/rooms`).flush({data:[room]}); harness.detectChanges(); expect(harness.routeNativeElement?.textContent).toContain('Lunes');
    await clickTab('Instructores'); http.expectOne(`${environment.apiBaseUrl}/classes/8/instructors`).flush({data:[assignment]}); http.expectOne(`${environment.apiBaseUrl}/academies/7/instructors`).flush({data:[instructor]}); harness.detectChanges(); expect(harness.routeNativeElement?.textContent).toContain('Ana Pérez');
    TestBed.inject(AcademyOperationsService).updateClassInstructor(3,{academyInstructorId:9,role:'ASSISTANT',isPrimary:false,startDate:null,endDate:null}).subscribe(); const req=http.expectOne(`${environment.apiBaseUrl}/class-instructors/3`); expect(req.request.method).toBe('PUT'); expect(req.request.body.role).toBe('ASSISTANT'); req.flush({data:{...assignment,role:'ASSISTANT'}});
  });
});
