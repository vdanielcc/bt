import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { finalize, forkJoin } from 'rxjs';
import { BillingChargeRead, chargeEffectiveStatuses } from '../models/billing-charge.models';
import { BillingPaymentRead, paymentCents } from '../models/billing-payment.models';
import { BillingManagementService } from '../services/billing-management.service';
import { PlanAmountPipe } from './billing-plan.util';
interface AllocationRow {charge:BillingChargeRead;amount:number;}
@Component({selector:'bte-payment-allocation',standalone:true,imports:[CommonModule,FormsModule,MatDialogModule,MatButtonModule,MatFormFieldModule,MatInputModule,PlanAmountPipe],template:`
<h2 mat-dialog-title>Distribuir pago pendiente</h2><mat-dialog-content><p *ngIf="loading">Cargando cargos…</p><p *ngIf="error" role="alert">{{error}}</p>
<ng-container *ngIf="!loading"><p>Monto pago: <strong>{{data.payment.amount|planAmount}}</strong> · Asignado: <strong>{{total|planAmount}}</strong> · Falta asignar: <strong>{{remaining|planAmount}}</strong></p><p>Esta propuesta no modifica el saldo hasta confirmar el pago.</p>
<div *ngFor="let row of rows" class="charge"><div>{{row.charge.description}}<small>{{states[row.charge.effectiveStatus]}} · Vence: {{row.charge.dueDate||'Sin fecha'}} · Saldo: {{row.charge.balance|planAmount}}</small></div><mat-form-field><mat-label>Monto a aplicar</mat-label><input matInput type="number" min="0" step="0.01" [max]="row.charge.balance" [(ngModel)]="row.amount"></mat-form-field></div><p *ngIf="!rows.length">Sin cargos elegibles.</p><p *ngIf="removedProposal">Hay asignaciones anteriores a cargos que ya no están disponibles. Al guardar se retirarán de la propuesta.</p></ng-container>
</mat-dialog-content><mat-dialog-actions align="end"><button mat-button [disabled]="saving" mat-dialog-close>Cerrar</button><button mat-flat-button color="primary" [disabled]="saving||loading||invalid||data.payment.status!=='PENDING'" (click)="save()">Guardar distribución</button></mat-dialog-actions>`,styles:[`.charge{display:flex;gap:1rem;align-items:center;border-bottom:1px solid #ddd;padding:.5rem}.charge div{flex:1}small{display:block}`]})
export class PaymentAllocationComponent implements OnInit {
 rows:AllocationRow[]=[];ready=false;loading=true;saving=false;error='';removedProposal=false;states=chargeEffectiveStatuses;
 get total():number{return this.rows.reduce((sum,row)=>sum+paymentCents(row.amount||0),0)/100;}
 get remaining():number{return (paymentCents(this.data.payment.amount)-paymentCents(this.total))/100;}
 get invalid():boolean{return !this.ready||this.remaining<0||this.rows.some(r=>!Number.isFinite(r.amount)||r.amount<0||paymentCents(r.amount)>paymentCents(r.charge.balance)||Math.abs(r.amount*100-paymentCents(r.amount))>1e-6);}
 constructor(@Inject(MAT_DIALOG_DATA)public data:{payment:BillingPaymentRead},private service:BillingManagementService,private ref:MatDialogRef<PaymentAllocationComponent>){}
 ngOnInit():void{if(!this.data.payment.studentId||this.data.payment.status!=='PENDING'){this.loading=false;this.error='Solo se distribuyen pagos pendientes con alumno.';return;}
  forkJoin({detail:this.service.getPayment(this.data.payment.id),charges:this.service.getAllocationCandidates(this.data.payment.academyId,this.data.payment.studentId)}).pipe(finalize(()=>this.loading=false)).subscribe({next:({detail,charges})=>{this.data.payment=detail.payment;if(detail.payment.status!=='PENDING'){this.error='El pago dejó de estar pendiente.';return;}
   const eligible=charges.filter(c=>(c.status==='PENDING'||c.status==='PARTIAL')&&c.balance>0&&c.academyId===detail.payment.academyId&&c.studentId===detail.payment.studentId);
   this.removedProposal=detail.allocations.some(a=>!eligible.some(c=>c.id===a.chargeId));this.rows=eligible.sort((a,b)=>Number(b.isOverdue)-Number(a.isOverdue)||(a.dueDate||'9999').localeCompare(b.dueDate||'9999')).map(charge=>({charge,amount:detail.allocations.find(a=>a.chargeId===charge.id)?.amount??0}));this.ready=true;
  },error:e=>this.error=e.error?.message||'No fue posible cargar la distribución.'});
 }
 save():void{if(this.saving||this.loading||this.invalid||this.data.payment.status!=='PENDING')return;this.saving=true;this.error='';this.ref.disableClose=true;
  this.service.allocatePayment(this.data.payment.id,this.rows.filter(r=>r.amount>0).map(r=>({chargeId:r.charge.id,amount:Number(r.amount)}))).pipe(finalize(()=>{this.saving=false;this.ref.disableClose=false;})).subscribe({next:()=>this.ref.close(true),error:e=>this.error=e.error?.message||'No fue posible guardar la distribución.'});
 }
}
