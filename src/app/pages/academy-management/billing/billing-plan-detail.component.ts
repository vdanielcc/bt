import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { BillingManagementService } from '../services/billing-management.service';
import { BillingPlan } from '../models/academy-management.models';
import { billingCycleLabel, PlanAmountPipe } from './billing-plan.util';
@Component({standalone:true,imports:[CommonModule,MatDialogModule,MatButtonModule,RouterLink,PlanAmountPipe],template:`
 <h2 mat-dialog-title>{{plan?.name || 'Detalle del plan'}}</h2><mat-dialog-content>
 <p *ngIf="error" role="alert">{{error}}</p><p *ngIf="!plan && !error">Cargando…</p>
 <ng-container *ngIf="plan"><p>{{plan.code}} · {{label(plan.billingCycle)}} · {{plan.amount|planAmount}} · {{plan.isActive?'Activo':'Inactivo'}}</p>
 <p>{{plan.description}}</p><p>Vigencia: {{plan.validFrom || 'Sin inicio'}} — {{plan.validTo || 'Sin término'}}</p>
 <p *ngIf="plan.billingCycle==='MONTHLY'">Vence el día {{plan.dueDay}} · {{plan.graceDays}} días de gracia.</p>
 <h3>Clases asociadas</h3><p *ngIf="!plan.classes?.length">Sin clases asociadas.</p>
 <p *ngFor="let course of plan.classes"><a mat-button [routerLink]="['/academies',plan.academyId,'classes',course.classId]" mat-dialog-close>{{course.className}}</a> <strong *ngIf="course.isDefault">Predeterminado</strong></p>
 </ng-container></mat-dialog-content><mat-dialog-actions align="end"><button mat-button mat-dialog-close>Cerrar</button></mat-dialog-actions>`})
export class BillingPlanDetailComponent implements OnInit {
 private data=inject<{id:number}>(MAT_DIALOG_DATA);private api=inject(BillingManagementService);
 plan?:BillingPlan;error='';label=billingCycleLabel;
 ngOnInit():void{this.api.getPlan(this.data.id).subscribe({next:p=>this.plan=p,error:e=>this.error=e.error?.message||'No fue posible cargar el plan.'});}
}
