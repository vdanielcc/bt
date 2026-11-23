import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin, finalize } from 'rxjs';
import { ClassAttendanceService } from '../services/class-attendance.service';
import { AttendanceSummary, AttendanceFilters, ClassAttendanceHistoryItem, StudentAttendanceHistoryItem, attendanceLabel, attendanceStatuses } from '../models/class-attendance.models';
@Component({standalone:true,selector:'bte-attendance-history',imports:[CommonModule,FormsModule,RouterLink,MatButtonModule,MatFormFieldModule,MatInputModule,MatSelectModule,MatPaginatorModule,MatProgressSpinnerModule],template:`<section class="p-4">
 <h2 class="title">Historial de asistencia</h2><p>Solo sesiones finalizadas. Presentes y atrasados cuentan como asistencia; justificados no penalizan el porcentaje.</p>
 <form class="flex flex-wrap gap-3 items-center" (ngSubmit)="apply()">
  <mat-form-field *ngIf="studentId"><mat-label>Clase</mat-label><mat-select [(ngModel)]="filters.classId" name="classId"><mat-option [value]="undefined">Todas</mat-option><mat-option *ngFor="let option of classes" [value]="option.classId">{{option.className}}</mat-option></mat-select></mat-form-field>
  <mat-form-field><mat-label>Desde</mat-label><input matInput type="date" [(ngModel)]="filters.dateFrom" name="from" /></mat-form-field>
  <mat-form-field><mat-label>Hasta</mat-label><input matInput type="date" [(ngModel)]="filters.dateTo" name="to" /></mat-form-field>
  <mat-form-field *ngIf="studentId"><mat-label>Estado</mat-label><mat-select [(ngModel)]="filters.status" name="status"><mat-option value="">Todos</mat-option><mat-option *ngFor="let status of statuses" [value]="status.value">{{status.label}}</mat-option></mat-select></mat-form-field>
  <button mat-stroked-button type="submit" [disabled]="loading">Filtrar</button>
 </form>
 <mat-spinner *ngIf="loading" diameter="32" /><p *ngIf="error" role="alert">{{error}} <button mat-button (click)="load()">Reintentar</button></p>
 <ng-container *ngIf="!loading && !error">
  <div *ngIf="summary as s" class="flex flex-wrap gap-5 my-5"><span>Sesiones realizadas: <strong>{{s.completedSessions}}</strong></span><span>Asistencia: <strong>{{s.attendanceRate==null?'Sin base de cálculo':s.attendanceRate+'%'}}</strong></span><span>Presentes: {{s.present}}</span><span>Atrasados: {{s.late}}</span><span>Ausencias: {{s.absent}}</span><span>Justificados: {{s.excused}}</span></div>
  <div class="overflow-x-auto"><table class="w-full text-left" *ngIf="studentId && students.length"><thead><tr><th>Fecha / hora</th><th>Clase</th><th>Estado</th><th>Llegada</th><th>Salida</th><th>Observación</th></tr></thead><tbody><tr *ngFor="let row of students" class="border-b"><td class="p-3">{{row.sessionDate | date:'dd/MM/yyyy'}} {{row.startTime.slice(0,5)}}</td><td>{{row.className}}</td><td>{{label(row.status)}}</td><td>{{row.checkInAt?.slice(11,16)||'—'}}</td><td>{{row.checkOutAt?.slice(11,16)||'—'}}</td><td>{{row.notes||'—'}}</td></tr></tbody></table>
  <table class="w-full text-left" *ngIf="classId && sessions.length"><thead><tr><th>Fecha / hora</th><th>Registrados</th><th>Presentes</th><th>Atrasados</th><th>Ausentes</th><th>Justificados</th><th></th></tr></thead><tbody><tr *ngFor="let row of sessions" class="border-b"><td class="p-3">{{row.sessionDate | date:'dd/MM/yyyy'}} {{row.startTime.slice(0,5)}}</td><td>{{row.recorded}}</td><td>{{row.present}}</td><td>{{row.late}}</td><td>{{row.absent}}</td><td>{{row.excused}}</td><td><a mat-button [routerLink]="['/academies',academyId,'class-sessions',row.sessionId,'attendance']">Ver asistencia</a></td></tr></tbody></table></div>
  <p *ngIf="!total">Sin asistencias registradas para este período.</p><mat-paginator [length]="total" [pageIndex]="page-1" [pageSize]="20" (page)="paginate($event)" aria-label="Paginación del historial" />
 </ng-container>
</section>`})
export class AttendanceHistoryComponent implements OnInit {
 @Input() studentId?:number;@Input() classId?:number;@Input() academyId=0;
 classes:{classId:number;className:string}[]=[];private api=inject(ClassAttendanceService);filters:AttendanceFilters={};summary?:AttendanceSummary;students:StudentAttendanceHistoryItem[]=[];sessions:ClassAttendanceHistoryItem[]=[];loading=false;error='';total=0;page=1;statuses=attendanceStatuses;label=attendanceLabel;
 ngOnInit():void{this.load();} apply():void{this.page=1;this.load();} paginate(event:PageEvent):void{this.page=event.pageIndex+1;this.load();}
 load():void{if(this.loading)return;this.loading=true;this.error='';const filters={...this.filters,number:this.page,size:20};
  if(this.studentId)forkJoin({history:this.api.getStudentHistory(this.studentId,filters),summary:this.api.getStudentSummary(this.studentId,filters)}).pipe(finalize(()=>this.loading=false)).subscribe({next:r=>{this.classes=r.history.classes||[];this.students=r.history.items;this.total=r.history.total;this.summary=r.summary;},error:e=>this.error=e.error?.message||'No fue posible cargar el historial.'});
  else if(this.classId)forkJoin({history:this.api.getClassHistory(this.classId,filters),summary:this.api.getClassSummary(this.classId,filters)}).pipe(finalize(()=>this.loading=false)).subscribe({next:r=>{this.sessions=r.history.items;this.total=r.history.total;this.summary=r.summary;},error:e=>this.error=e.error?.message||'No fue posible cargar el historial.'});
  else this.loading=false;
 }
}
