import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { AuthService } from '../../../core/auth/auth.service';
import { BillingPlan } from '../models/academy-management.models';
import { BillingManagementService } from '../services/billing-management.service';
import { AcademyConfirmDialogComponent } from '../shared/academy-confirm-dialog.component';
import { BillingPlanDialogComponent } from './billing-plan-dialog.component';
import { BillingPlanDetailComponent } from './billing-plan-detail.component';
import { billingCycles, billingCycleLabel, PlanAmountPipe } from './billing-plan.util';

@Component({standalone:true,selector:'bte-billing-plan-list',
 imports:[CommonModule,FormsModule,MatButtonModule,MatDialogModule,MatFormFieldModule,MatInputModule,MatSelectModule,MatProgressSpinnerModule,PlanAmountPipe,VexBreadcrumbsComponent,VexPageLayoutComponent,VexPageLayoutContentDirective,VexPageLayoutHeaderDirective],
 template:`<vex-page-layout><vex-page-layout-header class="pb-16"><div class="px-6">
  <vex-breadcrumbs [crumbs]="['Academia','Finanzas','Planes / Membresías']" />
  <h1 class="title mt-2">Planes / Membresías</h1><p>Configura las modalidades de cobro que pueden utilizar los alumnos de la academia.</p>
  <button *ngIf="canManage" mat-flat-button color="primary" (click)="open()">+ Nuevo plan</button>
 </div></vex-page-layout-header><vex-page-layout-content class="-mt-6"><section class="card p-6">
  <p>Planes activos: {{activeCount}} <span *ngFor="let c of cycles"> · {{c.label}}: {{count(c.value)}}</span></p>
  <div class="flex flex-wrap gap-4"><mat-form-field><mat-label>Buscar código o plan</mat-label><input matInput [(ngModel)]="search"></mat-form-field>
   <mat-form-field><mat-label>Tipo</mat-label><mat-select [(ngModel)]="cycle"><mat-option value="">Todos</mat-option><mat-option *ngFor="let c of cycles" [value]="c.value">{{c.label}}</mat-option></mat-select></mat-form-field>
   <mat-form-field><mat-label>Estado</mat-label><mat-select [(ngModel)]="status"><mat-option value="">Todos</mat-option><mat-option value="active">Activo</mat-option><mat-option value="inactive">Inactivo</mat-option></mat-select></mat-form-field></div>
  <mat-spinner *ngIf="loading" diameter="40" />
  <p *ngIf="error" role="alert">{{error}} <button mat-button (click)="load()">Reintentar</button></p>
  <div *ngIf="!loading && !error" class="overflow-x-auto"><table class="w-full text-left" *ngIf="filtered.length"><thead><tr><th>Código</th><th>Plan</th><th>Tipo</th><th>Monto</th><th>Vencimiento</th><th>Clases</th><th>Vigencia</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
   <tr *ngFor="let plan of filtered"><td>{{plan.code || '—'}}</td><td>{{plan.name}}</td><td>{{label(plan.billingCycle)}}</td><td>{{plan.amount|planAmount}}</td><td>{{plan.billingCycle==='MONTHLY' ? 'Día '+plan.dueDay+' · '+plan.graceDays+' días de gracia' : '—'}}</td><td>{{plan.assignedClassesCount || 0}}</td><td>{{plan.validFrom || 'Sin inicio'}} — {{plan.validTo || 'Sin término'}}</td><td>{{plan.isActive?'Activo':'Inactivo'}}</td><td>
    <button mat-button (click)="detail(plan)">Detalle</button><ng-container *ngIf="canManage"><button mat-button (click)="open(plan)">Editar</button><button *ngIf="plan.isActive" mat-button [disabled]="busy" (click)="deactivate(plan)">Desactivar</button></ng-container>
   </td></tr></tbody></table><p *ngIf="!filtered.length">No hay planes para estos filtros.</p></div>
 </section></vex-page-layout-content></vex-page-layout>`,styles:[`th,td{padding:.75rem;border-bottom:1px solid var(--vex-divider-color)}`]})
export class BillingPlanListComponent implements OnInit {
 private route=inject(ActivatedRoute);private api=inject(BillingManagementService);private dialog=inject(MatDialog);private auth=inject(AuthService);
 academyId=0;plans:BillingPlan[]=[];loading=false;busy=false;error='';search='';cycle='';status='';cycles=billingCycles;label=billingCycleLabel;
 get canManage():boolean{return ['admin','academy_admin'].includes((this.auth.getCurrentUser()?.rol||'').toLowerCase());}
 get activeCount():number{return this.plans.filter(p=>p.isActive).length;}
 count(cycle:string):number{return this.plans.filter(p=>p.billingCycle===cycle).length;}
 get filtered():BillingPlan[]{const term=this.search.trim().toLocaleLowerCase();return this.plans.filter(p=>(!term||`${p.code} ${p.name}`.toLocaleLowerCase().includes(term))&&(!this.cycle||p.billingCycle===this.cycle)&&(!this.status||p.isActive===(this.status==='active')));}
 ngOnInit():void{this.academyId=Number(this.route.snapshot.paramMap.get('academyId'));this.load();}
 load():void{this.loading=true;this.error='';this.api.getPlans(this.academyId).pipe(finalize(()=>this.loading=false)).subscribe({next:p=>this.plans=p,error:e=>this.error=e.error?.message||'No fue posible cargar los planes.'});}
 open(plan?:BillingPlan):void{if(!this.canManage)return;this.dialog.open(BillingPlanDialogComponent,{width:'800px',maxWidth:'96vw',data:{academyId:this.academyId,plan}}).afterClosed().subscribe(saved=>{if(saved)this.load();});}
 detail(plan:BillingPlan):void{this.dialog.open(BillingPlanDetailComponent,{width:'700px',maxWidth:'96vw',data:{id:plan.id}});}
 deactivate(plan:BillingPlan):void{
  if(!this.canManage||this.busy)return;
  this.dialog.open(AcademyConfirmDialogComponent,{data:{title:'Desactivar plan',message:`${plan.name} dejará de estar disponible para nuevas asignaciones. Se conservará en el historial.`,action:'Desactivar'}}).afterClosed().subscribe(ok=>{
   if(!ok)return;this.busy=true;this.api.deletePlan(plan.id).pipe(finalize(()=>this.busy=false)).subscribe({next:()=>this.load(),error:e=>this.error=e.error?.message||'No fue posible desactivar el plan.'});
  });
 }
}
