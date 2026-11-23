import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { Observable, finalize } from 'rxjs';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { AcademyManagementService } from '../services/academy-management.service';
import { BillingManagementService } from '../services/billing-management.service';
import { ClassManagementService } from '../services/class-management.service';
import { GradingManagementService } from '../services/grading-management.service';

type Feature = 'instructors' | 'classes' | 'billing-plans' | 'charges' | 'payments' | 'styles' | 'grading-systems';
interface Column { key: string; label: string; }

@Component({ selector: 'bte-academy-resource-list', standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule, MatTableModule, VexBreadcrumbsComponent, VexPageLayoutComponent, VexPageLayoutContentDirective, VexPageLayoutHeaderDirective],
  template: `<vex-page-layout><vex-page-layout-header class="pb-16"><div class="px-6"><vex-breadcrumbs [crumbs]="['Academia', title]"></vex-breadcrumbs><h1 class="title mt-2 mb-0">{{ title }}</h1></div></vex-page-layout-header><vex-page-layout-content class="-mt-6"><div class="card overflow-auto"><div *ngIf="loading" class="state"><mat-spinner diameter="42"></mat-spinner></div><table *ngIf="!loading" mat-table [dataSource]="rows" class="w-full"><ng-container *ngFor="let column of columns" [matColumnDef]="column.key"><th mat-header-cell *matHeaderCellDef>{{ column.label }}</th><td mat-cell *matCellDef="let row"><a *ngIf="(feature === 'classes'||feature === 'grading-systems') && column.key === 'name'; else plainValue" class="text-primary-600 font-medium" [routerLink]="feature === 'classes' ? [row['id']] : [row['id'],'levels']">{{ value(row,column.key) }}</a><ng-template #plainValue>{{ value(row, column.key) }}</ng-template></td></ng-container><tr mat-header-row *matHeaderRowDef="keys"></tr><tr mat-row *matRowDef="let row; columns: keys"></tr></table><div *ngIf="!loading && !rows.length" class="state">No hay registros.</div></div></vex-page-layout-content></vex-page-layout>`,
  styles: [`.state{min-height:14rem;display:flex;align-items:center;justify-content:center;color:var(--vex-text-color-secondary)}td,th{white-space:nowrap;padding-right:1rem}`]
})
export class AcademyResourceListComponent implements OnInit {
  feature!: Feature; academyId = 0; rows: Array<Record<string, unknown>> = []; loading = true;
  readonly configs: Record<Feature, { title: string; columns: Column[] }> = {
    instructors: { title: 'Instructores', columns: [{key:'personId',label:'Persona'},{key:'title',label:'Título'},{key:'licenseNumber',label:'Licencia'},{key:'startDate',label:'Fecha ingreso'},{key:'isActive',label:'Estado'}] },
    classes: { title: 'Clases', columns: [{key:'code',label:'Código'},{key:'name',label:'Clase'},{key:'trainingModalityId',label:'Modalidad'},{key:'defaultRoomId',label:'Sala'},{key:'capacity',label:'Capacidad'},{key:'status',label:'Estado'}] },
    'billing-plans': { title: 'Planes / Membresías', columns: [{key:'name',label:'Nombre'},{key:'billingCycle',label:'Tipo'},{key:'amount',label:'Monto'},{key:'dueDay',label:'Día vencimiento'},{key:'graceDays',label:'Gracia'},{key:'isActive',label:'Estado'}] },
    charges: { title: 'Cargos', columns: [{key:'studentId',label:'Alumno'},{key:'description',label:'Concepto'},{key:'referencePeriod',label:'Periodo'},{key:'amount',label:'Monto'},{key:'dueDate',label:'Vencimiento'},{key:'status',label:'Estado'}] },
    payments: { title: 'Pagos', columns: [{key:'paidAt',label:'Fecha'},{key:'studentId',label:'Alumno'},{key:'amount',label:'Monto'},{key:'paymentMethod',label:'Método'},{key:'transactionReference',label:'Referencia'},{key:'status',label:'Estado'}] },
    styles: { title: 'Estilos', columns: [{key:'styleId',label:'Estilo'},{key:'sportsAssociationId',label:'Federación/Asociación'},{key:'isPrimary',label:'Principal'},{key:'isActive',label:'Estado'}] },
    'grading-systems': { title: 'Sistemas de grado', columns: [{key:'name',label:'Sistema'},{key:'styleId',label:'Estilo'},{key:'sportsAssociationId',label:'Federación'},{key:'isActive',label:'Estado'}] }
  };
  get title(): string { return this.configs[this.feature].title; } get columns(): Column[] { return this.configs[this.feature].columns; } get keys(): string[] { return this.columns.map(c => c.key); }
  constructor(private route: ActivatedRoute, private academy: AcademyManagementService, private classes: ClassManagementService, private billing: BillingManagementService, private grading: GradingManagementService, private snack: MatSnackBar) {}
  ngOnInit(): void { this.feature = this.route.snapshot.data['feature']; this.academyId = Number(this.route.snapshot.paramMap.get('academyId')); this.load(); }
  load(): void { let request: Observable<unknown[]>; switch (this.feature) { case 'instructors': request = this.academy.getInstructors(this.academyId); break; case 'classes': request = this.classes.getClasses(this.academyId); break; case 'billing-plans': request = this.billing.getPlans(this.academyId); break; case 'charges': request = this.billing.getCharges(this.academyId); break; case 'payments': request = this.billing.getPayments(this.academyId); break; case 'styles': request = this.grading.getAcademyStyles(this.academyId); break; default: request = this.grading.systems(this.academyId); }
    request.pipe(finalize(() => this.loading = false)).subscribe({ next: rows => this.rows = rows as Array<Record<string, unknown>>, error: e => this.snack.open(e?.error?.message ?? 'No fue posible cargar los datos.', 'Cerrar', {duration:4000}) }); }
  value(row: Record<string, unknown>, key: string): string { const raw = row[key]; if (typeof raw === 'boolean') return raw ? 'Activo' : 'Inactivo'; if (raw == null || raw === '') return '—'; if (key === 'amount' && typeof raw === 'number') return new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP'}).format(raw); return String(raw); }
}
