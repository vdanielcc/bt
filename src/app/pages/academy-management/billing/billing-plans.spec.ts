import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { BillingPlanDialogComponent } from './billing-plan-dialog.component';
import { BillingManagementService } from '../services/billing-management.service';
import { ClassManagementService } from '../services/class-management.service';
import { ClassEnrollmentDialogComponent } from '../classes/class-enrollment-dialog.component';
import { AcademyOperationsService } from '../services/academy-operations.service';
import { BillingPlan } from '../models/academy-management.models';
import { billingCycleLabel, planAvailable } from './billing-plan.util';

const plan = { id: 7, academyId: 1, name: 'Infantil', code: 'KIDS', amount: 35000, billingCycle: 'MONTHLY', dueDay: 5, graceDays: 0, isActive: true, validFrom: null, validTo: null, isDefault: true } as BillingPlan;
describe('Billing plan rules and form', () => {
  let component: BillingPlanDialogComponent;
  beforeEach(() => { component = new BillingPlanDialogComponent({academyId:1},new FormBuilder(), {} as BillingManagementService, {} as MatDialogRef<BillingPlanDialogComponent>, {} as MatSnackBar); component.form.patchValue({code:'KIDS',name:'Infantil',amount:35000,dueDay:5}); });
  it('requires positive amounts, code, valid monthly day and ordered dates', () => {
    expect(component.form.valid).toBeTrue();
    for (const invalid of [{amount:0},{dueDay:31},{dueDay:1.5},{code:' '},{validFrom:'2026-10-02',validTo:'2026-10-01'}]) {
      component.form.patchValue(invalid); expect(component.form.invalid).toBeTrue(); component.form.patchValue({amount:35000,dueDay:5,code:'KIDS',validFrom:'',validTo:''});
    }
  });
  it('clears monthly settings for per class and one time, and requires due day again on monthly', () => {
    for (const cycle of ['PER_CLASS','ONE_TIME']) { component.form.patchValue({billingCycle:cycle}); expect(component.form.controls.dueDay.value).toBeNull(); expect(component.form.valid).toBeTrue(); }
    component.form.patchValue({billingCycle:'MONTHLY'}); expect(component.form.invalid).toBeTrue();
  });
  it('filters inactive and expired plans and translates all cycles', () => {
    expect(planAvailable(plan,'2026-10-17')).toBeTrue();
    expect(planAvailable({...plan,isActive:false},'2026-10-17')).toBeFalse();
    expect(planAvailable({...plan,validTo:'2026-10-16'},'2026-10-17')).toBeFalse();
    expect(planAvailable({...plan,validFrom:'2026-10-18'},'2026-10-17')).toBeFalse();
    expect(billingCycleLabel('ONE_TIME')).toBe('Pago único');
  });
});
describe('Billing plan HTTP contracts', () => {
  let http:HttpTestingController;let billing:BillingManagementService;let classes:ClassManagementService;
  beforeEach(()=>{TestBed.configureTestingModule({imports:[HttpClientTestingModule]});http=TestBed.inject(HttpTestingController);billing=TestBed.inject(BillingManagementService);classes=TestBed.inject(ClassManagementService);});
  afterEach(()=>http.verify());
  it('unwraps detail with associated classes and exposes default in class plans',()=>{
    billing.getPlan(7).subscribe(p=>expect(p.classes?.[0].classId).toBe(1));http.expectOne(r=>r.url.endsWith('/billing-plans/7')).flush({data:{...plan,classes:[{classId:1,className:'Karate',isDefault:true}]}});
    classes.getBillingPlans(1).subscribe(p=>expect(p[0].isDefault).toBeTrue());http.expectOne(r=>r.url.endsWith('/classes/1/billing-plans')).flush({data:[plan]});
  });
  it('changes default using one operation and soft-deactivates with existing API',()=>{
    classes.setDefaultBillingPlan(1,7).subscribe();const request=http.expectOne(r=>r.url.endsWith('/classes/1/billing-plans/7/default'));expect(request.request.method).toBe('POST');request.flush({data:{}});
    billing.deletePlan(7).subscribe();const deactivate=http.expectOne(r=>r.url.endsWith('/billing-plans/7'));expect(deactivate.request.method).toBe('DELETE');deactivate.flush(null);
  });
});
describe('Enrollment chooses class default explicitly',()=>{
  it('preselects the valid class default and sends it in the enrollment request',()=>{
    const api=jasmine.createSpyObj('operations',['enroll','availableStudents']);api.availableStudents.and.returnValue(of([]));api.enroll.and.returnValue(of({}));
    TestBed.configureTestingModule({providers:[{provide:MAT_DIALOG_DATA,useValue:{course:{id:1,name:'Karate'}}},{provide:MatDialogRef,useValue:{close:()=>{}}},{provide:ClassManagementService,useValue:{getBillingPlans:()=>of([plan,{...plan,id:8,isActive:false}])}},{provide:AcademyOperationsService,useValue:api}]});
    const component=TestBed.runInInjectionContext(()=>new ClassEnrollmentDialogComponent());
    expect(component.plan.value).toBe(7);expect(component.plans.length).toBe(1);
    component.student.setValue({studentId:10,fullName:'Alumno',documentNumber:'123'});component.save();
    expect(api.enroll.calls.mostRecent().args[1].billingPlanId).toBe(7);
  });
});
