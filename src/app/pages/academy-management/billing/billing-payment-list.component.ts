import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, of, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { BillingManagementService } from '../services/billing-management.service';
import { BillingPaymentRead, PaymentPage, PaymentFilters, paymentMethods, paymentStatuses } from '../models/billing-payment.models';
import { PaymentFormDialogComponent } from './payment-form-dialog.component';
import { BillingPaymentDetailComponent } from './billing-payment-detail.component';
import { PlanAmountPipe } from './billing-plan.util';
@Component({standalone:true,imports:[CommonModule,FormsModule,RouterLink,MatButtonModule,MatFormFieldModule,MatInputModule,MatSelectModule,MatPaginatorModule,PlanAmountPipe],template:`
<section class="card p-4 md:p-6"><h1 class="title">Pagos</h1><p>Registra y administra los pagos recibidos de los alumnos de la academia.</p>
<nav><a mat-button [routerLink]="['/academies',academyId,'billing']">Panel financiero</a><a mat-button [routerLink]="['/academies',academyId,'billing-plans']">Planes / Membresías</a><a mat-button [routerLink]="['/academies',academyId,'charges']">Cargos</a><a mat-button [routerLink]="['/academies',academyId,'overdue']">Morosidad</a><button *ngIf="canManage" mat-flat-button color="primary" (click)="register()">+ Registrar pago</button></nav>
<div class="filters"><mat-form-field><mat-label>Alumno o referencia</mat-label><input matInput [(ngModel)]="filters.search" (keyup.enter)="load(true)"></mat-form-field><mat-form-field><mat-label>Estado</mat-label><mat-select [(ngModel)]="filters.status"><mat-option [value]="undefined">Todos</mat-option><mat-option *ngFor="let s of states|keyvalue" [value]="s.key">{{s.value}}</mat-option></mat-select></mat-form-field><mat-form-field><mat-label>Medio</mat-label><mat-select [(ngModel)]="filters.paymentMethod"><mat-option [value]="undefined">Todos</mat-option><mat-option *ngFor="let m of methods|keyvalue" [value]="m.key">{{m.value}}</mat-option></mat-select></mat-form-field><mat-form-field><mat-label>Desde</mat-label><input matInput type="date" [(ngModel)]="filters.dateFrom"></mat-form-field><mat-form-field><mat-label>Hasta</mat-label><input matInput type="date" [(ngModel)]="filters.dateTo"></mat-form-field><button mat-button (click)="load(true)">Filtrar</button></div>
<p *ngIf="loading">Cargando pagos…</p><p *ngIf="error" role="alert">{{error}} <button mat-button (click)="load()">Reintentar</button></p><div *ngIf="data&&!loading&&!error" class="overflow-x-auto"><table class="w-full text-left"><thead><tr><th>Fecha</th><th>Alumno</th><th>Monto</th><th>Asignado</th><th>Por asignar</th><th>Medio</th><th>Referencia</th><th>Estado</th><th>Acciones</th></tr></thead><tbody><tr *ngFor="let p of data.items"><td>{{p.paidAt|date:'dd/MM/yyyy HH:mm'}}</td><td>{{p.studentName}}</td><td>{{p.amount|planAmount}}</td><td>{{p.allocatedAmount|planAmount}}</td><td>{{p.remainingToAllocate|planAmount}}</td><td>{{methods[p.paymentMethod||'OTHER']}}</td><td>{{p.transactionReference||'—'}}</td><td>{{states[p.status]}}</td><td><button mat-button (click)="detail(p)">Ver</button></td></tr></tbody></table><p *ngIf="!data.items.length">Sin pagos para estos filtros.</p><mat-paginator [length]="data.total" [pageSize]="25" [pageIndex]="page-1" (page)="paginate($event)"/></div></section>`,styles:[`.filters{display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1rem}th,td{padding:.75rem;border-bottom:1px solid #ddd}`]})
export class BillingPaymentListComponent implements OnInit {
 private route=inject(ActivatedRoute);private api=inject(BillingManagementService);private dialog=inject(MatDialog);private auth=inject(AuthService);private destroy=inject(DestroyRef);private reload=new Subject<void>();
 academyId=Number(this.route.snapshot.paramMap.get('academyId'));filters:PaymentFilters={};data?:PaymentPage;page=1;loading=false;error='';states=paymentStatuses;methods=paymentMethods;
 get canManage():boolean{return ['admin','academy_admin'].includes((this.auth.getCurrentUser()?.rol||'').toLowerCase());}
 constructor(){this.reload.pipe(switchMap(()=>{this.loading=true;this.error='';return this.api.getPaymentPage(this.academyId,{...this.filters,page:this.page,pageSize:25}).pipe(catchError(e=>{this.error=e.error?.message||'No fue posible cargar los pagos.';return of(null);}));}),takeUntilDestroyed(this.destroy)).subscribe(p=>{this.loading=false;if(p)this.data=p;});}
 ngOnInit():void{this.api.financialUpdates.pipe(takeUntilDestroyed(this.destroy)).subscribe(d=>{if(this.data&&d.payment.academyId===this.academyId)this.data={...this.data,items:this.data.items.map(p=>p.id===d.payment.id?d.payment:p)};});this.load();}load(reset=false):void{if(reset)this.page=1;this.reload.next();}paginate(e:PageEvent):void{this.page=e.pageIndex+1;this.load();}
 register():void{if(!this.canManage)return;this.dialog.open(PaymentFormDialogComponent,{width:'760px',maxWidth:'96vw',data:{academyId:this.academyId}}).afterClosed().subscribe(saved=>{this.load();if(saved){const id=saved.payment?.id||saved.id;if(id)this.dialog.open(BillingPaymentDetailComponent,{width:'850px',maxWidth:'96vw',data:{id,canManage:this.canManage}}).afterClosed().subscribe(()=>this.load());}});}
 detail(p:BillingPaymentRead):void{this.dialog.open(BillingPaymentDetailComponent,{width:'850px',maxWidth:'96vw',data:{id:p.id,canManage:this.canManage}}).afterClosed().subscribe(()=>this.load());}
}
