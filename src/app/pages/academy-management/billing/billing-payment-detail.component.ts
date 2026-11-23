import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { finalize } from 'rxjs';
import { BillingManagementService } from '../services/billing-management.service';
import { BillingPaymentDetail, paymentStatuses, paymentMethods, paymentCents } from '../models/billing-payment.models';
import { PaymentFormDialogComponent } from './payment-form-dialog.component';
import { PaymentAllocationComponent } from './payment-allocation.component';
import { AcademyConfirmDialogComponent } from '../shared/academy-confirm-dialog.component';
import { chargeEffectiveStatuses } from '../models/billing-charge.models';
import { PlanAmountPipe } from './billing-plan.util';

@Component({standalone:true,imports:[CommonModule,MatDialogModule,MatButtonModule,PlanAmountPipe],template:`
<h2 mat-dialog-title>Detalle del pago</h2><mat-dialog-content><p *ngIf="error" role="alert">{{error}}</p><button *ngIf="error" mat-button (click)="load()">Actualizar</button><p *ngIf="loading">Cargando…</p>
<ng-container *ngIf="detail as d"><h3>{{d.payment.studentName}}</h3><p>{{states[d.payment.status]}} · {{methods[d.payment.paymentMethod||'OTHER']}} · {{d.payment.paidAt|date:'dd/MM/yyyy HH:mm'}}</p><p>Pagador: {{d.payment.payerName||'Sin indicar'}} · Referencia: {{d.payment.transactionReference||'Sin referencia'}}</p><p>Monto: <strong>{{d.payment.amount|planAmount}}</strong> · Asignado: {{d.payment.allocatedAmount|planAmount}} · Por asignar: {{d.payment.remainingToAllocate|planAmount}}</p><p>{{d.payment.notes}}</p>
<button *ngIf="d.payment.receiptPath" mat-button (click)="receipt()">Descargar comprobante</button>
<h3>Distribución {{d.payment.status==='PENDING'?'propuesta':'histórica'}}</h3><p *ngIf="!d.allocations.length">Sin asignaciones.</p><div *ngFor="let a of d.allocations">{{a.description}} · {{a.amount|planAmount}}</div><p *ngIf="d.payment.status!=='CONFIRMED'">Estas asignaciones no afectan el saldo actual.</p>
<p *ngIf="d.payment.confirmedAt">Confirmado: {{d.payment.confirmedAt|date:'dd/MM/yyyy HH:mm'}}</p><p *ngIf="d.payment.refundedAt">Reembolsado: {{dateInAcademy(d.payment.refundedAt)}} ({{d.academyTimeZone}})</p>
<p *ngIf="d.payment.refundReason">Motivo: {{d.payment.refundReason}}</p><section *ngIf="d.affectedCharges?.length"><h3>Cargos recalculados</h3><p *ngFor="let c of d.affectedCharges">{{c.description}} · Pagado: {{c.paidAmount|planAmount}} · Saldo: {{c.balance|planAmount}} · {{chargeStates[c.effectiveStatus]}}</p></section><p *ngIf="d.accountStatement as s">Saldo del alumno: {{s.balance|planAmount}} · Total pagado: {{s.totalPaid|planAmount}} · Vencido: {{s.totalOverdue|planAmount}}</p>
<ng-container *ngIf="data.canManage"><ng-container *ngIf="d.payment.status==='PENDING'"><button mat-button [disabled]="busy" (click)="edit()">Editar</button><button mat-button [disabled]="busy" (click)="distribute()">Distribuir</button><button mat-flat-button color="primary" [disabled]="busy||!canConfirm" (click)="transition('confirm')">Confirmar</button><button mat-button [disabled]="busy" (click)="transition('reject')">Rechazar</button><button mat-button [disabled]="busy" (click)="transition('void')">Anular</button><p *ngIf="!canConfirm">Distribuye el monto completo para habilitar Confirmar.</p></ng-container><button *ngIf="d.payment.status==='CONFIRMED'" mat-button [disabled]="busy" (click)="transition('refund')">Reembolsar pago</button></ng-container>
</ng-container></mat-dialog-content><mat-dialog-actions align="end"><button mat-button [disabled]="busy" (click)="close()">Cerrar</button></mat-dialog-actions>`})
export class BillingPaymentDetailComponent implements OnInit {
 detail?:BillingPaymentDetail;chargeStates=chargeEffectiveStatuses;states=paymentStatuses;methods=paymentMethods;loading=false;busy=false;error='';changed=false;confirmDialogOpen=false;
 get canConfirm():boolean{const p=this.detail?.payment;return !!p&&p.status==='PENDING'&&p.allocatedAmount>0&&paymentCents(p.allocatedAmount)===paymentCents(p.amount);}
 constructor(@Inject(MAT_DIALOG_DATA)public data:{id:number;canManage:boolean},private api:BillingManagementService,private dialog:MatDialog,private ref:MatDialogRef<BillingPaymentDetailComponent>){}
 ngOnInit():void{this.load();}
 load():void{this.loading=true;this.api.getPayment(this.data.id).pipe(finalize(()=>this.loading=false)).subscribe({next:d=>this.detail=d,error:e=>this.error=e.error?.message||'No fue posible cargar el pago.'});}
 close():void{this.ref.close(this.changed);}
 edit():void{if(!this.data.canManage||this.detail?.payment.status!=='PENDING'||this.busy)return;this.dialog.open(PaymentFormDialogComponent,{width:'760px',maxWidth:'96vw',data:{academyId:this.detail.payment.academyId,payment:this.detail.payment}}).afterClosed().subscribe(saved=>{if(saved)this.changed=true;this.load();});}
 distribute():void{if(!this.data.canManage||this.detail?.payment.status!=='PENDING'||this.busy)return;this.dialog.open(PaymentAllocationComponent,{width:'900px',maxWidth:'96vw',data:{payment:this.detail.payment}}).afterClosed().subscribe(saved=>{if(saved)this.changed=true;this.load();});}
 transition(action:'confirm'|'reject'|'void'|'refund'):void{
  if(!this.data.canManage||!this.detail||this.busy||this.confirmDialogOpen||action==='confirm'&&!this.canConfirm)return;
  const pending=this.detail.payment.status==='PENDING';if(action==='refund'?this.detail.payment.status!=='CONFIRMED':!pending)return;
  const labels={confirm:'Confirmar pago',reject:'Rechazar pago',void:'Anular pago',refund:'Reembolsar pago'};
  const message=action==='refund'?'El pago dejará de aplicarse a los cargos relacionados y sus saldos serán recalculados. Esta operación conserva el historial financiero. El reembolso es total.':action==='confirm'?'Confirma que recibiste este pago. Su distribución quedará congelada.':'El pago y su distribución quedarán en el historial sin afectar los saldos.';
  this.confirmDialogOpen=true;
  this.dialog.open(AcademyConfirmDialogComponent,{data:{title:labels[action],message,action:labels[action],reasonRequired:action==='refund',reasonMaxLength:500}}).afterClosed().subscribe(answer=>{this.confirmDialogOpen=false;if(!answer)return;
   const reason=action==='refund'&&typeof answer==='object'?answer.reason?.trim():undefined;
   if(action==='refund'&&(!reason||reason.length>500))return;this.busy=true;this.error='';this.ref.disableClose=true;
   this.api.transitionPayment(this.data.id,action,reason).pipe(finalize(()=>{this.busy=false;this.ref.disableClose=false;})).subscribe({next:d=>{this.detail=d;this.changed=true;},error:e=>{this.error=e.error?.message||'No fue posible cambiar el estado del pago.';this.load();}});
  });
 }
 dateInAcademy(value:string):string{return new Intl.DateTimeFormat(undefined,{timeZone:this.detail?.academyTimeZone||'UTC',dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}
 receipt():void{this.api.downloadPaymentReceipt(this.data.id).subscribe({next:blob=>{const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='comprobante';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},error:()=>this.error='No fue posible descargar el comprobante.'});}
}
