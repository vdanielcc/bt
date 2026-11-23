import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { finalize } from 'rxjs';
import { BillingManagementService } from '../services/billing-management.service';
import { OverduePage } from '../models/billing-charge.models';
import { PlanAmountPipe } from './billing-plan.util';
@Component({standalone:true,imports:[CommonModule,FormsModule,RouterLink,MatButtonModule,MatInputModule,MatFormFieldModule,MatPaginatorModule,PlanAmountPipe],template:`<section class="card p-6"><h1 class="title">Morosidad</h1><p>Cargos vencidos después de los días de gracia.</p><a mat-button [routerLink]="['/academies',academyId,'charges']">Volver a cargos</a><div><mat-form-field><mat-label>Buscar alumno o descripción</mat-label><input matInput [(ngModel)]="search" (keyup.enter)="load(true)"></mat-form-field><button mat-button (click)="load(true)">Buscar</button></div><p *ngIf="loading">Cargando…</p><p *ngIf="error" role="alert">{{error}}</p><div *ngIf="data && !loading" class="overflow-x-auto"><table class="w-full text-left"><thead><tr><th>Alumno</th><th>Cargos vencidos</th><th>Monto vencido</th><th>Días de atraso</th></tr></thead><tbody><tr *ngFor="let s of data.items"><td><a mat-button [routerLink]="['/students',s.studentId]">{{s.studentName}}</a></td><td>{{s.overdueCharges}}</td><td>{{s.overdueAmount|planAmount}}</td><td>{{s.daysOverdue}}</td></tr></tbody></table><p *ngIf="!data.items.length">No hay alumnos con cargos vencidos para estos filtros.</p><mat-paginator [length]="data.total" [pageSize]="25" [pageIndex]="page-1" (page)="paginate($event)"/></div></section>`,styles:[`th,td{padding:.75rem;border-bottom:1px solid var(--vex-divider-color)}`]})
export class BillingOverdueComponent implements OnInit {
 private route=inject(ActivatedRoute);private api=inject(BillingManagementService);academyId=0;search='';page=1;loading=false;error='';data?:OverduePage;
 ngOnInit():void{this.academyId=Number(this.route.snapshot.paramMap.get('academyId'));this.load();}
 load(reset=false):void{if(reset)this.page=1;this.loading=true;this.error='';this.api.getOverdue(this.academyId,{search:this.search,page:this.page}).pipe(finalize(()=>this.loading=false)).subscribe({next:d=>this.data=d,error:e=>this.error=e.error?.message||'No fue posible cargar morosidad.'});}
 paginate(e:PageEvent):void{this.page=e.pageIndex+1;this.load();}
}
