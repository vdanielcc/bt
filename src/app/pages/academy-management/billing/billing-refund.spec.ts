import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, Subject } from 'rxjs';
import { AcademyConfirmDialogComponent } from '../shared/academy-confirm-dialog.component';
import { BillingManagementService } from '../services/billing-management.service';
import { BillingAccountStatementComponent } from './billing-account-statement.component';
import { BillingPaymentDetailComponent } from './billing-payment-detail.component';
import { AccountStatement, BillingPaymentDetail } from '../models/billing-payment.models';

const initial:any={payment:{id:1,academyId:1,studentId:10,studentName:'Ana',amount:35000,allocatedAmount:35000,remainingToAllocate:0,status:'CONFIRMED',paymentMethod:'TRANSFER'},allocations:[{chargeId:1,amount:35000,description:'Mensualidad'}],academyTimeZone:'America/Lima'};
const statement:AccountStatement={studentId:10,totalCharged:35000,totalPaid:0,totalPending:35000,totalOverdue:35000,balance:35000,charges:[{id:1,status:'PENDING',effectiveStatus:'OVERDUE',isOverdue:true,balance:35000,paidAmount:0,description:'Mensualidad'} as any],payments:[{...initial.payment,status:'REFUNDED'}]};
const refunded:BillingPaymentDetail={...initial,payment:{...initial.payment,status:'REFUNDED',refundReason:'Duplicado',refundedAt:'2026-10-18T02:00:00Z'},affectedCharges:statement.charges,accountStatement:statement};

describe('Required refund reason in shared confirmation dialog',()=>{
 it('blocks blank/whitespace/overlong reasons and returns the trimmed reason',async()=>{
  const ref={close:jasmine.createSpy('close')};TestBed.configureTestingModule({imports:[AcademyConfirmDialogComponent,NoopAnimationsModule],providers:[{provide:MAT_DIALOG_DATA,useValue:{title:'Reembolsar pago',reasonRequired:true,reasonMaxLength:500,message:'Conserva el historial financiero.'}},{provide:MatDialogRef,useValue:ref}]});
  const f=TestBed.createComponent(AcademyConfirmDialogComponent);f.detectChanges();await f.whenStable();const button=f.nativeElement.querySelectorAll('button')[1] as HTMLButtonElement;
  expect(f.nativeElement.textContent).toContain('Motivo del reembolso');expect(button.disabled).toBeTrue();f.componentInstance.reason='  ';f.detectChanges();expect(button.disabled).toBeTrue();
  f.componentInstance.reason='x'.repeat(501);f.detectChanges();expect(button.disabled).toBeTrue();f.componentInstance.reason='  Duplicado  ';f.detectChanges();expect(button.disabled).toBeFalse();button.click();expect(ref.close).toHaveBeenCalledWith({reason:'Duplicado'});
 });
});

describe('Refund authoritative response',()=>{
 it('publishes the returned summary and sends only the reason',()=>{
  TestBed.configureTestingModule({imports:[HttpClientTestingModule]});const api=TestBed.inject(BillingManagementService);const http=TestBed.inject(HttpTestingController);const updates:BillingPaymentDetail[]=[];api.financialUpdates.subscribe(d=>updates.push(d));
  api.refundPayment(1,'Duplicado').subscribe(r=>expect(r.affectedCharges?.[0].balance).toBe(35000));const request=http.expectOne(r=>r.url.endsWith('/billing-payments/1/refund'));expect(request.request.body).toEqual({reason:'Duplicado'});request.flush({data:refunded});expect(updates).toEqual([refunded]);http.verify();
 });
 it('updates student charges, payment history and totals without another request',()=>{
  const updates=new Subject<BillingPaymentDetail>();const api={financialUpdates:updates,accountStatement:jasmine.createSpy('accountStatement').and.returnValue(of({...statement,totalPaid:35000,balance:0}))};
  TestBed.configureTestingModule({imports:[BillingAccountStatementComponent],providers:[{provide:BillingManagementService,useValue:api},{provide:MatDialog,useValue:{}}]});
  const f=TestBed.createComponent(BillingAccountStatementComponent);f.componentInstance.studentId=10;f.detectChanges();updates.next(refunded);f.detectChanges();expect(f.componentInstance.statement).toBe(statement);expect(f.nativeElement.textContent).toContain('Reembolsado');expect(api.accountStatement).toHaveBeenCalledTimes(1);
 });
 it('a late previous account request cannot overwrite the post-refund summary',()=>{
  const updates=new Subject<BillingPaymentDetail>();const pending=new Subject<AccountStatement>();const api={financialUpdates:updates,accountStatement:()=>pending};
  TestBed.configureTestingModule({imports:[BillingAccountStatementComponent],providers:[{provide:BillingManagementService,useValue:api},{provide:MatDialog,useValue:{}}]});const f=TestBed.createComponent(BillingAccountStatementComponent);f.componentInstance.studentId=10;f.detectChanges();updates.next(refunded);pending.next({...statement,totalPaid:35000,balance:0});pending.complete();expect(f.componentInstance.statement).toBe(statement);
 });
});

describe('Refund detail validation and refresh',()=>{
 let api:any;let dialog:any;
 beforeEach(()=>{
  api={getPayment:jasmine.createSpy('getPayment').and.returnValue(of(initial)),transitionPayment:jasmine.createSpy('transitionPayment').and.returnValue(of(refunded))};dialog={open:jasmine.createSpy('open').and.returnValue({afterClosed:()=>of({reason:'Duplicado'})})};
  TestBed.configureTestingModule({imports:[BillingPaymentDetailComponent,NoopAnimationsModule],providers:[{provide:BillingManagementService,useValue:api},{provide:MAT_DIALOG_DATA,useValue:{id:1,canManage:true}},{provide:MatDialogRef,useValue:{close:()=>{}}}]}).overrideComponent(BillingPaymentDetailComponent,{set:{providers:[{provide:MatDialog,useValue:dialog}]}});
 });
 it('renders reason, academy time zone and recalculated data from the response',()=>{const f=TestBed.createComponent(BillingPaymentDetailComponent);f.detectChanges();f.componentInstance.transition('refund');f.detectChanges();const text=f.nativeElement.textContent;expect(text).toContain('Duplicado');expect(text).toContain('America/Lima');expect(text).toContain('Cargos recalculados');expect(text).toContain('Saldo del alumno');expect(api.getPayment).toHaveBeenCalledTimes(1);expect(f.componentInstance.detail).toBe(refunded);});
 it('does not submit a blank reason or boolean-only confirmation',()=>{dialog.open.and.returnValue({afterClosed:()=>of({reason:'   '})});const f=TestBed.createComponent(BillingPaymentDetailComponent);f.detectChanges();f.componentInstance.transition('refund');dialog.open.and.returnValue({afterClosed:()=>of(true)});f.componentInstance.transition('refund');expect(api.transitionPayment).not.toHaveBeenCalled();});
 it('blocks opening two refund confirmations simultaneously',()=>{const answer=new Subject<any>();dialog.open.and.returnValue({afterClosed:()=>answer});const f=TestBed.createComponent(BillingPaymentDetailComponent);f.detectChanges();f.componentInstance.transition('refund');f.componentInstance.transition('refund');expect(dialog.open).toHaveBeenCalledTimes(1);answer.next({reason:'Duplicado'});answer.complete();expect(api.transitionPayment).toHaveBeenCalledTimes(1);});
});
