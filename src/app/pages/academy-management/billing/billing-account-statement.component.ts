import { Component, Input, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BillingManagementService } from '../services/billing-management.service';
import { AccountStatement, paymentStatuses, paymentMethods } from '../models/billing-payment.models';
import { chargeEffectiveStatuses } from '../models/billing-charge.models';
import { BillingPaymentDetailComponent } from './billing-payment-detail.component';
import { BillingChargeDetailComponent } from './billing-charge-detail.component';
import { PlanAmountPipe } from './billing-plan.util';
@Component({standalone:true,selector:'bte-billing-account-statement',imports:[CommonModule,MatButtonModule,PlanAmountPipe],template:`
<section class="p-4"><h2>Estado de cuenta</h2><button mat-button (click)="load()" [disabled]="loading">Actualizar</button><p *ngIf="loading">Cargando finanzas…</p><p *ngIf="error" role="alert">{{error}}</p>
<ng-container *ngIf="statement as s"><div class="summary"><p>Saldo total<strong>{{s.balance|planAmount}}</strong></p><p>Monto vencido<strong>{{s.totalOverdue|planAmount}}</strong></p><p>Total pagado<strong>{{s.totalPaid|planAmount}}</strong></p><p>Total cargos vigentes<strong>{{s.totalCharged|planAmount}}</strong></p></div>
<h3>Cargos</h3><div class="overflow-x-auto"><table class="w-full text-left"><thead><tr><th>Fecha</th><th>Concepto</th><th>Descripción</th><th>Total</th><th>Pagado</th><th>Saldo</th><th>Estado financiero</th><th>Condición</th><th>Vencimiento</th><th></th></tr></thead><tbody><tr *ngFor="let c of s.charges"><td>{{c.createdAt|date:'dd/MM/yyyy'}}</td><td>{{c.conceptName}}</td><td>{{c.description}}</td><td>{{c.totalAmount|planAmount}}</td><td>{{c.paidAmount|planAmount}}</td><td>{{c.balance|planAmount}}</td><td>{{chargeStates[c.status]}}</td><td>{{chargeStates[c.effectiveStatus]}}</td><td>{{c.dueDate||'Sin fecha'}}</td><td><button mat-button (click)="charge(c.id)">Ver</button></td></tr></tbody></table></div><p *ngIf="!s.charges.length">Sin cargos.</p>
<h3>Pagos</h3><div class="overflow-x-auto"><table class="w-full text-left"><thead><tr><th>Fecha</th><th>Monto</th><th>Asignado</th><th>Medio</th><th>Estado</th><th>Referencia</th><th></th></tr></thead><tbody><tr *ngFor="let p of s.payments"><td>{{p.paidAt|date:'dd/MM/yyyy HH:mm'}}</td><td>{{p.amount|planAmount}}</td><td>{{p.allocatedAmount|planAmount}}</td><td>{{methods[p.paymentMethod||'OTHER']}}</td><td>{{states[p.status]}}</td><td>{{p.transactionReference}}</td><td><button mat-button (click)="payment(p.id)">Ver</button></td></tr></tbody></table></div><p *ngIf="!s.payments.length">Sin pagos.</p><p>Los cargos anulados y los pagos reembolsados se conservan como historial. Solo las asignaciones de pagos confirmados cuentan como pagado.</p></ng-container></section>`,styles:[`.summary{display:flex;gap:1.5rem;flex-wrap:wrap}.summary strong{display:block;font-size:1.4rem}th,td{padding:.6rem;border-bottom:1px solid #ddd}`]})
export class BillingAccountStatementComponent implements OnInit {
 @Input({required:true}) studentId!:number;private api=inject(BillingManagementService);private destroy=inject(DestroyRef);private revision=0;private dialog=inject(MatDialog);
 statement?:AccountStatement;loading=false;error='';states=paymentStatuses;methods=paymentMethods;chargeStates=chargeEffectiveStatuses;
 ngOnInit():void{this.api.financialUpdates.pipe(takeUntilDestroyed(this.destroy)).subscribe(update=>{if(update.accountStatement?.studentId===this.studentId){this.revision++;this.statement=update.accountStatement;}});this.load();}load():void{if(this.loading)return;this.loading=true;this.error='';const revision=this.revision;this.api.accountStatement(this.studentId).pipe(finalize(()=>this.loading=false)).subscribe({next:s=>{if(revision===this.revision)this.statement=s;},error:e=>this.error=e.error?.message||'No fue posible cargar el estado de cuenta.'});}
 payment(id:number):void{this.dialog.open(BillingPaymentDetailComponent,{width:'850px',maxWidth:'96vw',data:{id,canManage:false}});}
 charge(id:number):void{this.dialog.open(BillingChargeDetailComponent,{width:'700px',maxWidth:'96vw',data:{id}});}
}
