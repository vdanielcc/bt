import { Component, Input, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, of, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { BillingManagementService } from '../services/billing-management.service';
import { BillingConcept } from '../models/academy-management.models';
import { BillingChargeRead, ChargePage, ChargeFilters, chargeStatuses, chargeEffectiveStatuses } from '../models/billing-charge.models';
import { ChargeFormDialogComponent } from './charge-form-dialog.component';
import { MonthlyGenerationDialogComponent } from './monthly-generation-dialog.component';
import { BillingChargeDetailComponent } from './billing-charge-detail.component';
import { AcademyConfirmDialogComponent } from '../shared/academy-confirm-dialog.component';
import { PlanAmountPipe } from './billing-plan.util';

@Component({standalone:true,selector:'bte-billing-charge-list',imports:[CommonModule,FormsModule,RouterLink,MatButtonModule,MatFormFieldModule,MatInputModule,MatSelectModule,MatPaginatorModule,MatProgressSpinnerModule,PlanAmountPipe],
template:`<section class="card p-4 md:p-6"><h1 class="title">{{summaryOnly?'Panel financiero':'Cargos'}}</h1><p>Administra mensualidades y otras obligaciones financieras de los alumnos.</p>
 <div *ngIf="!studentId" class="flex flex-wrap gap-3 my-4"><a mat-button [routerLink]="['/academies',academyId,'billing-plans']">Planes / Membresías</a><a mat-button [routerLink]="['/academies',academyId,'charges']">Cargos</a><a mat-button [routerLink]="['/academies',academyId,'payments']">Pagos</a><a mat-button [routerLink]="['/academies',academyId,'overdue']">Morosidad</a><ng-container *ngIf="canManage"><button mat-flat-button color="primary" (click)="edit()">+ Nuevo cargo</button><button mat-stroked-button (click)="monthly()">Generar mensualidades</button></ng-container></div>
 <p *ngIf="message" role="status">{{message}}</p><p *ngIf="actionError" role="alert">{{actionError}}</p>
 <div class="summary" *ngIf="data"><div>Pendientes<strong>{{data.summary.pendingCount}}</strong></div><div>Vencidos<strong>{{data.summary.overdueCount}}</strong></div><div>Monto pendiente<strong>{{data.summary.pendingAmount|planAmount}}</strong></div><div>Monto vencido<strong>{{data.summary.overdueAmount|planAmount}}</strong></div><div>Cargos del mes<strong>{{data.summary.chargesThisMonth}}</strong></div></div>
 <div *ngIf="!summaryOnly" class="filters"><mat-form-field><mat-label>Buscar alumno o descripción</mat-label><input matInput [(ngModel)]="filters.search" (keyup.enter)="load(true)"></mat-form-field>
 <mat-form-field><mat-label>Concepto</mat-label><mat-select [(ngModel)]="filters.conceptId"><mat-option [value]="undefined">Todos</mat-option><mat-option *ngFor="let c of concepts" [value]="c.id">{{c.name}}</mat-option></mat-select></mat-form-field>
 <mat-form-field><mat-label>Estado</mat-label><mat-select [(ngModel)]="filters.status"><mat-option [value]="undefined">Todos</mat-option><mat-option *ngFor="let s of states|keyvalue" [value]="s.key">{{s.value}}</mat-option></mat-select></mat-form-field>
 <mat-form-field><mat-label>Vencimiento</mat-label><mat-select [(ngModel)]="filters.isOverdue"><mat-option [value]="undefined">Todos</mat-option><mat-option [value]="true">Vencidos</mat-option><mat-option [value]="false">No vencidos</mat-option></mat-select></mat-form-field>
 <mat-form-field><mat-label>Período</mat-label><input matInput type="month" [(ngModel)]="filters.referencePeriod"></mat-form-field>
 <mat-form-field><mat-label>Creado desde</mat-label><input matInput type="date" [(ngModel)]="filters.dateFrom"></mat-form-field><mat-form-field><mat-label>Creado hasta</mat-label><input matInput type="date" [(ngModel)]="filters.dateTo"></mat-form-field>
 <mat-form-field><mat-label>Vence desde</mat-label><input matInput type="date" [(ngModel)]="filters.dueDateFrom"></mat-form-field><mat-form-field><mat-label>Vence hasta</mat-label><input matInput type="date" [(ngModel)]="filters.dueDateTo"></mat-form-field><button mat-button (click)="load(true)">Filtrar</button></div>
 <mat-spinner *ngIf="loading" diameter="36"/><p *ngIf="error" role="alert">{{error}} <button mat-button (click)="load()">Reintentar</button></p>
 <div *ngIf="!loading && !error && data && !summaryOnly" class="overflow-x-auto"><table *ngIf="data.items.length" class="w-full text-left"><thead><tr><th>Alumno</th><th>Concepto</th><th>Descripción</th><th>Período</th><th>Monto</th><th>Descuento</th><th>Recargo</th><th>Total</th><th>Saldo</th><th>Vencimiento</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
 <tr *ngFor="let c of data.items"><td>{{c.studentName}}</td><td>{{c.conceptName}}</td><td>{{c.description}}</td><td>{{c.referencePeriod || '—'}}</td><td>{{c.amount|planAmount}}</td><td>{{c.discountAmount|planAmount}}</td><td>{{c.surchargeAmount|planAmount}}</td><td>{{c.totalAmount|planAmount}}</td><td>{{c.balance|planAmount}}</td><td>{{c.dueDate || 'Sin vencimiento'}}</td><td>{{effectiveStates[c.effectiveStatus]}}</td><td><button mat-button (click)="detail(c)">Ver</button><ng-container *ngIf="canManage"><button *ngIf="c.status==='PENDING'" mat-button (click)="edit(c)">Editar</button><button *ngIf="c.status==='PENDING'" mat-button [disabled]="busy" (click)="voidCharge(c)">Anular</button></ng-container></td></tr></tbody></table><p *ngIf="!data.items.length">No hay cargos para estos filtros.</p>
 <mat-paginator [length]="data.total" [pageSize]="25" [pageIndex]="page-1" (page)="paginate($event)" showFirstLastButtons/></div>
</section>`,styles:[`.summary{display:flex;flex-wrap:wrap;gap:1rem;margin:1.5rem 0}.summary div{padding:1rem;background:var(--vex-background-hover);border-radius:8px}.summary strong{display:block;font-size:1.4rem}.filters{display:flex;gap:.75rem;flex-wrap:wrap}th,td{padding:.75rem;border-bottom:1px solid var(--vex-divider-color)}`]})
export class BillingChargeListComponent implements OnInit {
 @Input() studentId?:number;@Input() academyId=0;@Input() summaryOnly=false;
 private route=inject(ActivatedRoute);private api=inject(BillingManagementService);private dialog=inject(MatDialog);private auth=inject(AuthService);private destroyRef=inject(DestroyRef);private reload=new Subject<void>();
 data?:ChargePage;filters:ChargeFilters={};concepts:BillingConcept[]=[];states=chargeStatuses;effectiveStates=chargeEffectiveStatuses;loading=false;busy=false;page=1;error='';actionError='';message='';
 get canManage():boolean{return this.academyId>0&&['admin','academy_admin'].includes((this.auth.getCurrentUser()?.rol||'').toLowerCase());}
 constructor(){this.reload.pipe(switchMap(()=>{this.loading=true;this.error='';const filters={...this.filters,page:this.page,pageSize:25};return (this.studentId?this.api.getStudentChargePage(this.studentId,{...filters,...(this.academyId?{academyId:this.academyId}:{})}):this.api.getChargePage(this.academyId,filters)).pipe(catchError(e=>{this.error=e.error?.message||'No fue posible cargar los cargos.';return of(null);}));}),takeUntilDestroyed(this.destroyRef)).subscribe(p=>{this.loading=false;if(p)this.data=p;});}
 ngOnInit():void{this.academyId=this.academyId||Number(this.route.snapshot.paramMap.get('academyId'));this.api.getConcepts().subscribe({next:c=>this.concepts=c,error:()=>this.actionError='No fue posible cargar los conceptos.'});this.load();}
 load(reset=false):void{if(reset)this.page=1;this.reload.next();}paginate(e:PageEvent):void{this.page=e.pageIndex+1;this.load();}
 edit(charge?:BillingChargeRead):void{if(!this.canManage)return;this.dialog.open(ChargeFormDialogComponent,{width:'800px',maxWidth:'96vw',data:{academyId:charge?.academyId||this.academyId,charge}}).afterClosed().subscribe(saved=>{if(saved)this.load();});}
 detail(c:BillingChargeRead):void{this.dialog.open(BillingChargeDetailComponent,{width:'700px',maxWidth:'96vw',data:{id:c.id}});}
 monthly():void{if(!this.canManage)return;this.dialog.open(MonthlyGenerationDialogComponent,{width:'540px',maxWidth:'96vw',data:{academyId:this.academyId}}).afterClosed().subscribe(r=>{if(r){this.message=`${r.created} creadas · ${r.existing} existentes · ${r.skipped} omitidas`;this.load();}});}
 voidCharge(c:BillingChargeRead):void{if(!this.canManage||this.busy)return;this.dialog.open(AcademyConfirmDialogComponent,{data:{title:'Anular cargo',message:'El cargo quedará anulado y se conservará en el historial.',action:'Anular'}}).afterClosed().subscribe(ok=>{if(!ok)return;this.busy=true;this.actionError='';this.api.voidCharge(c.id).subscribe({next:()=>{this.busy=false;this.load();},error:e=>{this.busy=false;this.actionError=e.error?.message||'No fue posible anular el cargo.';}});});}
}
