import { BillingPaymentRead, BillingPaymentDetail, PaymentPage, PaymentFilters, PaymentWrite, PaymentUpdate, AccountStatement } from '../models/billing-payment.models';
import { BillingChargeRead, ChargePage, ChargeFilters, ChargeWrite, ChargeUpdate, GenerationResult, OverduePage, ChargeReferences } from '../models/billing-charge.models';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, EMPTY, expand, reduce, Subject, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { BillingCharge, BillingConcept, BillingPayment, BillingPlan, CreateEntity } from '../models/academy-management.models';
import { unwrapApiResponse } from './api-response.util';

@Injectable({ providedIn: 'root' })
export class BillingManagementService {
  private readonly financialChanges=new Subject<BillingPaymentDetail>();
  readonly financialUpdates=this.financialChanges.asObservable();
  private readonly api = environment.apiBaseUrl;
  constructor(private readonly http: HttpClient) {}
  getPlans(academyId: number): Observable<BillingPlan[]> { return this.http.get<unknown>(`${this.api}/academies/${academyId}/billing-plans`).pipe(map(unwrapApiResponse<BillingPlan[]>)); }
  getPlan(id: number): Observable<BillingPlan> { return this.http.get<unknown>(`${this.api}/billing-plans/${id}`).pipe(map(unwrapApiResponse<BillingPlan>)); }
  createPlan(academyId: number, value: CreateEntity<BillingPlan>): Observable<BillingPlan> { return this.http.post<BillingPlan>(`${this.api}/academies/${academyId}/billing-plans`, value); }
  updatePlan(id: number, value: BillingPlan): Observable<void> { return this.http.put<void>(`${this.api}/billing-plans/${id}`, value); }
  deletePlan(id: number): Observable<void> { return this.http.delete<void>(`${this.api}/billing-plans/${id}`); }
  private chargeParams(filters:ChargeFilters):Record<string,string>{return Object.fromEntries(Object.entries(filters).filter(([,v])=>v!=null&&v!=='').map(([k,v])=>[k,String(v)]));}
  getChargePage(academyId:number,filters:ChargeFilters={}):Observable<ChargePage>{return this.http.get<unknown>(`${this.api}/academies/${academyId}/billing/charges`,{params:this.chargeParams(filters)}).pipe(map(unwrapApiResponse<ChargePage>));}
  getStudentChargePage(studentId:number,filters:ChargeFilters={}):Observable<ChargePage>{return this.http.get<unknown>(`${this.api}/students/${studentId}/billing/charges`,{params:this.chargeParams(filters)}).pipe(map(unwrapApiResponse<ChargePage>));}
  getOverdue(academyId:number,filters:ChargeFilters={}):Observable<OverduePage>{return this.http.get<unknown>(`${this.api}/academies/${academyId}/billing/overdue`,{params:this.chargeParams(filters)}).pipe(map(unwrapApiResponse<OverduePage>));}
  getCharge(id:number):Observable<BillingChargeRead>{return this.http.get<unknown>(`${this.api}/billing/charges/${id}`).pipe(map(unwrapApiResponse<BillingChargeRead>));}
  createManualCharge(academyId:number,value:ChargeWrite):Observable<BillingChargeRead>{return this.http.post<unknown>(`${this.api}/academies/${academyId}/billing/charges`,value).pipe(map(unwrapApiResponse<BillingChargeRead>));}
  updateCharge(id:number,value:ChargeUpdate):Observable<BillingChargeRead>{return this.http.put<unknown>(`${this.api}/billing/charges/${id}`,value).pipe(map(unwrapApiResponse<BillingChargeRead>));}
  billingStudents(academyId:number,search:string):Observable<{id:number;name:string}[]>{return this.http.get<unknown>(`${this.api}/academies/${academyId}/billing/students`,{params:{search}}).pipe(map(unwrapApiResponse<{id:number;name:string}[]>));}
  billingReferences(academyId:number,studentId:number):Observable<ChargeReferences>{return this.http.get<unknown>(`${this.api}/academies/${academyId}/billing/references`,{params:{studentId}}).pipe(map(unwrapApiResponse<ChargeReferences>));}
  getCharges(academyId: number, filters?: { status?: string; studentId?: number }): Observable<BillingCharge[]> { return this.http.get<unknown>(`${this.api}/academies/${academyId}/billing/charges`, { params: { ...(filters?.status ? { status: filters.status } : {}), ...(filters?.studentId ? { studentId: filters.studentId } : {}) } }).pipe(map(unwrapApiResponse<BillingCharge[]|{items:BillingCharge[]}>),map(data=>Array.isArray(data)?data:data.items)); }
  generateMonthly(academyId: number, month: number, year: number): Observable<GenerationResult> { return this.http.post<unknown>(`${this.api}/academies/${academyId}/billing/monthly/generate`, { month, year }).pipe(map(unwrapApiResponse<GenerationResult>)); }
  getConcepts(): Observable<BillingConcept[]> { return this.http.get<unknown>(`${this.api}/billing/concepts`).pipe(map(unwrapApiResponse<BillingConcept[]>)); }
  createCharge(value: CreateEntity<BillingCharge>): Observable<BillingCharge> { return this.http.post<BillingCharge>(`${this.api}/billing/charges`, value); }
  getPayments(academyId:number):Observable<BillingPaymentRead[]>{return this.getPaymentPage(academyId).pipe(map(p=>p.items));}
  getAllocationCandidates(academyId:number,studentId:number):Observable<BillingChargeRead[]>{
    const filters={studentId,eligibleForPayment:true,pageSize:100};return this.getChargePage(academyId,{...filters,page:1}).pipe(expand(p=>p.page*p.pageSize<p.total?this.getChargePage(academyId,{...filters,page:p.page+1}):EMPTY),reduce((all,p)=>all.concat(p.items),[] as BillingChargeRead[]));
  }
  getPaymentPage(academyId:number,filters:PaymentFilters={}):Observable<PaymentPage>{return this.http.get<unknown>(`${this.api}/academies/${academyId}/billing-payments`,{params:this.chargeParams(filters)}).pipe(map(unwrapApiResponse<PaymentPage>));}
  getPayment(id:number):Observable<BillingPaymentDetail>{return this.http.get<unknown>(`${this.api}/billing-payments/${id}`).pipe(map(unwrapApiResponse<BillingPaymentDetail>));}
  createPayment(value:PaymentWrite):Observable<BillingPaymentDetail>{return this.http.post<unknown>(`${this.api}/academies/${value.academyId}/billing-payments`,value).pipe(map(unwrapApiResponse<BillingPaymentDetail>));}
  updatePayment(id:number,value:PaymentUpdate):Observable<BillingPaymentDetail>{return this.http.put<unknown>(`${this.api}/billing-payments/${id}`,value).pipe(map(unwrapApiResponse<BillingPaymentDetail>));}
  allocatePayment(id:number,items:ReadonlyArray<{chargeId:number;amount:number}>):Observable<BillingPaymentDetail>{return this.http.put<unknown>(`${this.api}/billing-payments/${id}/allocations`,{items}).pipe(map(unwrapApiResponse<BillingPaymentDetail>));}
  transitionPayment(id:number,action:'confirm'|'reject'|'void'|'refund',reason?:string):Observable<BillingPaymentDetail>{return this.http.post<unknown>(`${this.api}/billing-payments/${id}/${action}`,action==='refund'?{reason}:{}).pipe(map(unwrapApiResponse<BillingPaymentDetail>),tap(d=>{if(action==='refund')this.financialChanges.next(d);}));}
  uploadPaymentReceipt(id:number,file:File):Observable<BillingPaymentDetail>{const body=new FormData();body.append('file',file);return this.http.post<unknown>(`${this.api}/billing-payments/${id}/receipt`,body).pipe(map(unwrapApiResponse<BillingPaymentDetail>));}
  downloadPaymentReceipt(id:number):Observable<Blob>{return this.http.get(`${this.api}/billing-payments/${id}/receipt`,{responseType:'blob'});}
  accountStatement(studentId:number):Observable<AccountStatement>{return this.http.get<unknown>(`${this.api}/students/${studentId}/billing/account-statement`).pipe(map(unwrapApiResponse<AccountStatement>));}
  getStudentBalance(studentId: number): Observable<unknown> { return this.http.get<unknown>(`${this.api}/students/${studentId}/billing/balance`).pipe(map(unwrapApiResponse<unknown>)); }
  getStudentCharges(studentId: number): Observable<BillingCharge[]> { return this.http.get<unknown>(`${this.api}/students/${studentId}/billing/charges`).pipe(map(unwrapApiResponse<BillingCharge[]|{items:BillingCharge[]}>),map(data=>Array.isArray(data)?data:data.items)); }
  getStudentPayments(studentId: number): Observable<BillingPayment[]> { return this.http.get<unknown>(`${this.api}/students/${studentId}/billing/payments`).pipe(map(unwrapApiResponse<BillingPayment[]>)); }
  voidCharge(id: number): Observable<void> { return this.http.post<void>(`${this.api}/billing/charges/${id}/void`, {}); }
  voidPayment(id: number): Observable<void> { return this.http.post<void>(`${this.api}/billing/payments/${id}/void`, {}); }
  refundPayment(id:number,reason:string):Observable<BillingPaymentDetail>{return this.transitionPayment(id,'refund',reason);}
}
