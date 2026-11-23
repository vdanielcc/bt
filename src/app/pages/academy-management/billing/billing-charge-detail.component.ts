import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { BillingManagementService } from '../services/billing-management.service';
import { BillingChargeRead, chargeEffectiveStatuses } from '../models/billing-charge.models';
import { PlanAmountPipe } from './billing-plan.util';
@Component({standalone:true,imports:[CommonModule,MatDialogModule,MatButtonModule,PlanAmountPipe],template:`<h2 mat-dialog-title>Detalle del cargo</h2><mat-dialog-content><p *ngIf="error" role="alert">{{error}}</p><p *ngIf="!charge && !error">Cargando…</p><ng-container *ngIf="charge as c"><h3>{{c.studentName}}</h3><p>{{c.conceptName}} · {{c.referencePeriod || 'Sin período'}} · {{states[c.effectiveStatus]}}</p><p *ngIf="c.effectiveStatus!==c.status">Estado financiero: {{states[c.status]}}</p><p>{{c.description}}</p><p>Monto: {{c.amount|planAmount}} · Descuento: {{c.discountAmount|planAmount}} · Recargo: {{c.surchargeAmount|planAmount}}</p><p><strong>Total: {{c.totalAmount|planAmount}} · Saldo: {{c.balance|planAmount}}</strong></p><p>Vence: {{c.dueDate || 'Sin vencimiento'}} · {{c.graceDays}} días de gracia</p><p>{{c.generatedAutomatically?'Generado desde plan':'Cargo manual'}} · Creado: {{c.createdAt|date:'dd/MM/yyyy HH:mm'}}</p><p *ngIf="c.updatedAt">Actualizado: {{c.updatedAt|date:'dd/MM/yyyy HH:mm'}}</p><p *ngIf="c.classSessionId">Sesión: {{c.classSessionId}}</p></ng-container></mat-dialog-content><mat-dialog-actions align="end"><button mat-button mat-dialog-close>Cerrar</button></mat-dialog-actions>`})
export class BillingChargeDetailComponent implements OnInit {
 private data=inject<{id:number}>(MAT_DIALOG_DATA);private api=inject(BillingManagementService);charge?:BillingChargeRead;error='';states=chargeEffectiveStatuses;
 ngOnInit():void{this.api.getCharge(this.data.id).subscribe({next:c=>this.charge=c,error:e=>this.error=e.error?.message||'No fue posible cargar el cargo.'});}
}
