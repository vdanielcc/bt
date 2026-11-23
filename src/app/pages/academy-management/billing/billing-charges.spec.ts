import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, Subject, throwError } from 'rxjs';
import { BillingManagementService } from '../services/billing-management.service';
import { MonthlyGenerationDialogComponent } from './monthly-generation-dialog.component';
import { ChargeFormDialogComponent } from './charge-form-dialog.component';
import { BillingChargeListComponent } from './billing-charge-list.component';
import { AuthService } from '../../../core/auth/auth.service';
import { BillingChargeRead, ChargePage } from '../models/billing-charge.models';

const charge={id:1,academyId:1,studentId:10,studentName:'Ana Test',billingConceptId:1,conceptName:'Mensualidad',conceptCode:'MONTHLY_FEE',description:'Octubre',referencePeriod:'2026-10',amount:35000,discountAmount:1000,surchargeAmount:500,totalAmount:34500,balance:34500,status:'PENDING',effectiveStatus:'PENDING',isOverdue:false,dueDate:'2026-10-28',graceDays:3,generatedAutomatically:true} as BillingChargeRead;
const page:ChargePage={items:[charge],total:1,page:1,pageSize:25,summary:{pendingCount:1,overdueCount:0,pendingAmount:34500,overdueAmount:0,chargesThisMonth:1}};

describe('Charge HTTP contracts',()=>{
 let api:BillingManagementService;let http:HttpTestingController;
 beforeEach(()=>{TestBed.configureTestingModule({imports:[HttpClientTestingModule]});api=TestBed.inject(BillingManagementService);http=TestBed.inject(HttpTestingController);});
 afterEach(()=>http.verify());
 it('sends server filters and unwraps paginated charges with summary',()=>{
  api.getChargePage(1,{isOverdue:true,referencePeriod:'2026-10',page:2,dueDateTo:'2026-10-17'}).subscribe(p=>expect(p.summary.pendingAmount).toBe(34500));
  const r=http.expectOne(r=>r.url.endsWith('/academies/1/billing/charges'));expect(r.request.params.get('isOverdue')).toBe('true');expect(r.request.params.has('status')).toBeFalse();expect(r.request.params.get('page')).toBe('2');expect(r.request.params.get('dueDateTo')).toBe('2026-10-17');r.flush({data:page});
 });
 it('uses explicit manual creation and never sends status or payment fields',()=>{
  const value={studentId:10,billingConceptId:6,description:'Cinturón',amount:12000,discountAmount:0,surchargeAmount:0,dueDate:null,referencePeriod:null};
  api.createManualCharge(1,value).subscribe(c=>expect(c.totalAmount).toBe(34500));const r=http.expectOne(r=>r.url.endsWith('/academies/1/billing/charges'));expect(r.request.body).toEqual(value);expect(r.request.method).toBe('POST');r.flush({data:charge});
 });
 it('returns typed monthly counts and loads delinquency from backend',()=>{
  api.generateMonthly(1,10,2026).subscribe(r=>expect(r.existing).toBe(1));const r=http.expectOne(r=>r.url.endsWith('/billing/monthly/generate'));expect(r.request.body).toEqual({month:10,year:2026});r.flush({data:{created:0,generated:0,existing:1,skipped:3,errors:[]}});
  api.getOverdue(1,{search:'Ana'}).subscribe(r=>expect(r.total).toBe(1));http.expectOne(r=>r.url.endsWith('/billing/overdue')).flush({data:{items:[],total:1,page:1,pageSize:25}});
 });
 it('preserves array consumers while the finance page uses pagination',()=>{api.getStudentCharges(10).subscribe(c=>expect(c[0].studentId).toBe(10));http.expectOne(r=>r.url.endsWith('/students/10/billing/charges')).flush({data:page});});
});

describe('Monthly generation dialog',()=>{
 it('prevents duplicate submits and displays counts without closing before review',()=>{
  const pending=new Subject<any>();const api=jasmine.createSpyObj('api',['generateMonthly']);api.generateMonthly.and.returnValue(pending);const ref=jasmine.createSpyObj('ref',['close']);
  const component=new MonthlyGenerationDialogComponent({academyId:1},new FormBuilder(),api,ref);component.generate();component.generate();expect(api.generateMonthly).toHaveBeenCalledTimes(1);
  pending.next({created:1,existing:2,skipped:3,errors:[]});pending.complete();expect(component.result?.created).toBe(1);expect(ref.close).not.toHaveBeenCalled();expect(component.saving).toBeFalse();
 });
 it('shows backend errors and allows retry',()=>{const api={generateMonthly:()=>throwError(()=>({error:{message:'Período inválido.'}}))} as any;const component=new MonthlyGenerationDialogComponent({academyId:1},new FormBuilder(),api,{} as any);component.generate();expect(component.error).toBe('Período inválido.');expect(component.saving).toBeFalse();});
});

describe('Charge form validation',()=>{
 it('validates nonnegative amounts and discount against total, and sends only allowed edits',()=>{
  const api=jasmine.createSpyObj('api',['updateCharge']);api.updateCharge.and.returnValue(of(charge));const ref=jasmine.createSpyObj('ref',['close']);
  TestBed.configureTestingModule({providers:[{provide:MAT_DIALOG_DATA,useValue:{academyId:1,charge}},{provide:FormBuilder,useValue:new FormBuilder()},{provide:BillingManagementService,useValue:api},{provide:MatDialogRef,useValue:ref}]});
  const c=TestBed.runInInjectionContext(()=>new ChargeFormDialogComponent({academyId:1,charge},new FormBuilder(),api,ref));
  c.form.patchValue({amount:.3,discountAmount:.4,surchargeAmount:.1});expect(c.form.valid).toBeTrue();expect(c.total).toBe(0);c.form.patchValue({amount:35000});
  c.form.patchValue({discountAmount:40000});expect(c.form.invalid).toBeTrue();c.form.patchValue({discountAmount:1000,surchargeAmount:-1});expect(c.form.invalid).toBeTrue();
  c.form.patchValue({surchargeAmount:500});expect(c.total).toBe(34500);c.save();expect(api.updateCharge.calls.mostRecent().args[1].status).toBeUndefined();expect(api.updateCharge.calls.mostRecent().args[1].generatedAutomatically).toBeUndefined();
 });
});

describe('Charge page actions and presentation',()=>{
 let api:any;let dialog:any;let role:string;
 beforeEach(()=>{
  role='academy_admin';api=jasmine.createSpyObj('api',['getChargePage','getConcepts','voidCharge']);api.getChargePage.and.returnValue(of(page));api.getConcepts.and.returnValue(of([{id:1,name:'Mensualidad'}]));api.voidCharge.and.returnValue(of(null));dialog={open:jasmine.createSpy('open').and.returnValue({afterClosed:()=>of(true)})};
  TestBed.configureTestingModule({imports:[BillingChargeListComponent,NoopAnimationsModule],providers:[{provide:ActivatedRoute,useValue:{snapshot:{paramMap:new Map([['academyId','1']])}}},{provide:BillingManagementService,useValue:api},{provide:AuthService,useValue:{getCurrentUser:()=>({rol:role})}},{provide:MatDialog,useValue:dialog}]});
 });
 it('renders debt summary and charge snapshot without payment actions',()=>{const fixture=TestBed.createComponent(BillingChargeListComponent);fixture.detectChanges();const text=fixture.nativeElement.textContent;expect(text).toContain('Ana Test');expect(text).toContain('Monto pendiente');expect(text).toContain('Descuento');expect(text).not.toContain('Registrar pago');expect(text).not.toContain('Marcar pagado');});
 it('requires confirmation before voiding and reloads the server result',()=>{const fixture=TestBed.createComponent(BillingChargeListComponent);fixture.detectChanges();fixture.componentInstance.voidCharge(charge);expect(dialog.open.calls.mostRecent().args[1].data.message).toContain('se conservará en el historial');expect(api.voidCharge).toHaveBeenCalledWith(1);expect(api.getChargePage).toHaveBeenCalledTimes(2);});
 it('hides finance mutation controls for instructor role',()=>{role='instructor';const fixture=TestBed.createComponent(BillingChargeListComponent);fixture.detectChanges();expect(fixture.nativeElement.textContent).not.toContain('Nuevo cargo');expect(fixture.nativeElement.textContent).not.toContain('Anular');});
 it('shows calculated overdue from backend while keeping pending actions available',()=>{
  api.getChargePage.and.returnValue(of({...page,items:[{...charge,status:'PENDING',effectiveStatus:'OVERDUE',isOverdue:true,dueDate:'2099-01-01'}]}));
  const fixture=TestBed.createComponent(BillingChargeListComponent);fixture.detectChanges();
  const row=fixture.nativeElement.querySelector('tbody tr').textContent;expect(row).toContain('Vencido');expect(row).toContain('Editar');expect(row).toContain('Anular');
 });
 it('keeps VOID historical and hides editing and voiding',()=>{
  api.getChargePage.and.returnValue(of({...page,items:[{...charge,status:'VOID',effectiveStatus:'VOID',isOverdue:false,balance:0}]}));
  const fixture=TestBed.createComponent(BillingChargeListComponent);fixture.detectChanges();
  const row=fixture.nativeElement.querySelector('tbody tr').textContent;expect(row).toContain('Anulado');expect(row).not.toContain('Editar');expect(row).not.toContain('Anular');
 });
});
