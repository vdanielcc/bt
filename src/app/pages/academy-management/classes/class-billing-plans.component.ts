import { Component, Input, OnChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { finalize } from 'rxjs';
import { AcademyClassListItem, BillingPlan } from '../models/academy-management.models';
import { ClassManagementService } from '../services/class-management.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ClassPlanDialogComponent } from './class-plan-dialog.component';
import { AcademyConfirmDialogComponent } from '../shared/academy-confirm-dialog.component';
import { billingCycleLabel, PlanAmountPipe, planAvailable } from '../billing/billing-plan.util';

@Component({standalone:true,selector:'bte-class-billing-plans',imports:[CommonModule,MatButtonModule,MatChipsModule,PlanAmountPipe],
 template:`<section class="p-6"><h2 class="title">Planes / Membresías</h2>
 <button *ngIf="canManage" mat-flat-button color="primary" [disabled]="loading || busy" (click)="associate()">+ Asociar plan</button>
 <p *ngIf="loading">Cargando…</p><p *ngIf="error" role="alert">{{error}} <button mat-button (click)="load()">Reintentar</button></p>
 <div class="overflow-x-auto" *ngIf="!loading"><table class="w-full text-left" *ngIf="plans.length"><thead><tr><th>Plan</th><th>Tipo</th><th>Monto</th><th>Predeterminado</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
 <tr *ngFor="let p of plans"><td>{{p.name}}</td><td>{{label(p.billingCycle)}}</td><td>{{p.amount|planAmount}}</td><td><mat-chip *ngIf="p.isDefault">Predeterminado</mat-chip><span *ngIf="!p.isDefault">—</span></td><td>{{!p.isActive?'Inactivo':available(p)?'Activo':'Fuera de vigencia'}}</td><td><ng-container *ngIf="canManage">
 <button mat-button *ngIf="!p.isDefault && available(p)" [disabled]="busy" (click)="setDefault(p)">Marcar predeterminado</button><button mat-button [disabled]="busy" (click)="remove(p)">Quitar</button>
 </ng-container></td></tr></tbody></table><p *ngIf="!plans.length && !error">Esta clase aún no tiene planes o membresías configurados.</p></div></section>`,styles:[`th,td{padding:.75rem;border-bottom:1px solid var(--vex-divider-color)}`]})
export class ClassBillingPlansComponent implements OnChanges {
 @Input({required:true}) course!:AcademyClassListItem;
 private api=inject(ClassManagementService);private auth=inject(AuthService);private dialog=inject(MatDialog);
 plans:BillingPlan[]=[];loading=false;busy=false;error='';label=billingCycleLabel;available=planAvailable;
 get canManage():boolean{return ['admin','academy_admin'].includes((this.auth.getCurrentUser()?.rol||'').toLowerCase());}
 ngOnChanges():void{this.load();}
 load():void{this.loading=true;this.error='';this.api.getBillingPlans(this.course.id).pipe(finalize(()=>this.loading=false)).subscribe({next:p=>this.plans=p,error:e=>this.error=e.error?.message||'No fue posible cargar los planes.'});}
 associate():void{if(!this.canManage||this.busy)return;this.dialog.open(ClassPlanDialogComponent,{width:'600px',maxWidth:'96vw',data:{academyId:this.course.academyId,classId:this.course.id,current:this.plans}}).afterClosed().subscribe(saved=>{if(saved)this.load();});}
 setDefault(plan:BillingPlan):void{if(!this.canManage||this.busy)return;this.busy=true;this.api.setDefaultBillingPlan(this.course.id,plan.id).pipe(finalize(()=>this.busy=false)).subscribe({next:()=>this.load(),error:e=>this.error=e.error?.message||'No fue posible cambiar el predeterminado.'});}
 remove(plan:BillingPlan):void{
  if(!this.canManage||this.busy)return;
  this.dialog.open(AcademyConfirmDialogComponent,{data:{title:'Quitar plan de la clase',message:`¿Quitar ${plan.name}? Se conservará el plan y las inscripciones históricas.`,action:'Quitar'}}).afterClosed().subscribe(ok=>{
   if(!ok)return;this.busy=true;this.api.removeBillingPlan(this.course.id,plan.id).pipe(finalize(()=>this.busy=false)).subscribe({next:()=>this.load(),error:e=>this.error=e.error?.message||'No fue posible quitar el plan.'});
  });
 }
}
