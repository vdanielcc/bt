import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of, switchMap, finalize } from 'rxjs';
import { ClassAttendanceService } from '../services/class-attendance.service';
import { AcademyOperationsService } from '../services/academy-operations.service';
import { SessionAttendance, SessionAttendanceStudent, attendanceStatuses } from '../models/class-attendance.models';
import { sessionStatuses } from '../models/class-session.models';
import { AcademyConfirmDialogComponent } from '../shared/academy-confirm-dialog.component';
@Component({standalone:true,selector:'bte-attendance-register',imports:[CommonModule,FormsModule,RouterLink,MatButtonModule,MatButtonToggleModule,MatFormFieldModule,MatInputModule,MatProgressSpinnerModule],
template:`<section class="card p-4 md:p-6">
 <a mat-button [routerLink]="['/academies',academyId,'class-sessions',sessionId]">Volver a sesión</a>
 <mat-spinner *ngIf="loading" diameter="40" aria-label="Cargando asistencia" />
 <p *ngIf="error" role="alert">{{error}} <button *ngIf="!data" mat-button (click)="load()">Reintentar</button></p>
 <p *ngIf="message" role="status">{{message}}</p>
 <ng-container *ngIf="data && !loading">
  <h1 class="title">{{data.session.className}}</h1>
  <p>{{data.session.sessionDate | date:'EEEE dd/MM/yyyy'}} · {{data.session.startTime.slice(0,5)}}–{{data.session.endTime.slice(0,5)}} · {{data.session.roomName || 'Sin sala'}}</p>
  <p>Instructor: <span *ngFor="let instructor of data.session.instructors;let last=last">{{instructor.name}}{{last?'':', '}}</span><span *ngIf="!data.session.instructors.length">Sin asignar</span></p>
  <p><strong>{{states[data.session.status]}}</strong> · {{data.students.length}} alumnos · Horas locales de la academia</p>
  <button *ngIf="data.session.status==='SCHEDULED'" mat-flat-button color="primary" [disabled]="saving" (click)="start()">Iniciar clase</button>
  <p *ngIf="data.session.status==='SCHEDULED'">Vista previa. Inicia explícitamente la clase para registrar asistencia.</p>
  <p *ngIf="data.session.status==='COMPLETED'">Asistencia histórica de solo lectura.</p>
  <p *ngIf="data.session.status==='CANCELLED'">Sesión cancelada: no genera ausencias ni estadísticas.</p>
  <div class="summary" aria-live="polite"><span *ngFor="let status of statuses">{{status.label}}: <strong>{{count(status.value)}}</strong></span><span>Sin marcar: <strong>{{unmarked}}</strong></span></div>
  <div class="toolbar" *ngIf="editable">
   <button mat-stroked-button [disabled]="saving" (click)="markAllPresent()">Marcar todos presentes</button>
   <button mat-stroked-button [disabled]="saving || !dirty" (click)="clear()">Limpiar cambios</button>
   <button mat-flat-button color="primary" [disabled]="saving || !dirty" (click)="save()">{{saving?'Guardando…':'Guardar asistencia'}}</button>
   <button *ngIf="unmarked===0" mat-flat-button color="primary" [disabled]="saving" (click)="save(true)">Guardar y finalizar clase</button>
   <button *ngIf="error && dirty" mat-button [disabled]="saving" (click)="reloadConfirmed()">Descartar y recargar servidor</button>
  </div>
  <article *ngFor="let student of data.students;trackBy:trackStudent" class="student">
   <div><strong>{{student.fullName}}</strong><p>{{student.documentNumber || 'Sin documento'}}</p><small *ngIf="!student.expected && editable">Registro conservado; inscripción no vigente para nuevas modificaciones.</small></div>
   <mat-button-toggle-group [(ngModel)]="student.status" [disabled]="!editable || !student.expected || saving" [attr.aria-label]="'Asistencia de '+student.fullName" (change)="normalize(student)">
    <mat-button-toggle *ngFor="let status of statuses" [value]="status.value">{{status.label}}</mat-button-toggle>
   </mat-button-toggle-group>
   <div class="details">
    <mat-form-field><mat-label>Hora llegada</mat-label><input matInput type="time" [(ngModel)]="student.checkInTime" [disabled]="!editable || !student.expected || saving || student.status==='ABSENT'" /></mat-form-field>
    <mat-form-field><mat-label>Hora salida</mat-label><input matInput type="time" [(ngModel)]="student.checkOutTime" [disabled]="!editable || !student.expected || saving || student.status==='ABSENT'" /></mat-form-field>
    <mat-form-field><mat-label>Observación</mat-label><input matInput maxlength="500" [(ngModel)]="student.notes" [disabled]="!editable || !student.expected || saving" /></mat-form-field>
   </div>
  </article>
  <p *ngIf="!data.students.length && data.session.status!=='CANCELLED'">No hay alumnos inscritos para esta sesión.</p>
 </ng-container>
</section>`,styles:[`.toolbar,.summary{display:flex;flex-wrap:wrap;gap:12px;margin:20px 0}.summary span{padding:12px;background:var(--vex-background-hover);border-radius:8px}.student{padding:20px 0;border-bottom:1px solid var(--vex-divider-color);display:grid;grid-template-columns:minmax(180px,1fr) auto;gap:12px}.details{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr 2fr;gap:12px}mat-button-toggle{min-height:48px}@media(max-width:850px){.student{grid-template-columns:1fr}.details{grid-template-columns:1fr 1fr}.details mat-form-field:last-child{grid-column:1/-1}}@media(max-width:500px){mat-button-toggle-group{display:grid;grid-template-columns:1fr 1fr}.details{grid-template-columns:1fr}.toolbar button{width:100%}}`]})
export class AttendanceRegisterComponent implements OnInit {
 private route=inject(ActivatedRoute);private api=inject(ClassAttendanceService);private operations=inject(AcademyOperationsService);private dialog=inject(MatDialog);
 data?:SessionAttendance;private original='';sessionId=0;academyId=0;loading=true;saving=false;error='';message='';statuses=attendanceStatuses;states=sessionStatuses;
 ngOnInit():void{this.sessionId=Number(this.route.snapshot.paramMap.get('sessionId'));this.academyId=Number(this.route.snapshot.paramMap.get('academyId'));this.load();}
 get editable():boolean{return this.data?.session.status==='IN_PROGRESS';}
 get dirty():boolean{return !!this.data && JSON.stringify(this.data)!==this.original;}
 get unmarked():number{return this.data?.students.filter(s=>s.expected && !s.status).length||0;}
 count(status:string):number{return this.data?.students.filter(s=>s.status===status).length||0;}
 private accept(data:SessionAttendance):void{this.data=data;this.original=JSON.stringify(data);}
 load():void{if(this.saving)return;this.loading=true;this.error='';this.api.getSessionAttendance(this.sessionId).pipe(finalize(()=>this.loading=false)).subscribe({next:data=>{if(data.session.academyId!==this.academyId){this.error='La sesión no pertenece a esta academia.';return;}this.accept(data);},error:e=>this.error=e.error?.message||'No fue posible cargar la asistencia.'});}
 normalize(student:SessionAttendanceStudent):void{if(student.status==='ABSENT'){student.checkInTime=null;student.checkOutTime=null;}}
 markAllPresent():void{if(!this.editable||this.saving||!this.data)return;this.data.students.filter(s=>s.expected).forEach(s=>s.status='PRESENT');}
 clear():void{if(this.saving)return;this.data=JSON.parse(this.original) as SessionAttendance;this.error='';}
 canDeactivate():Observable<boolean>{if(this.saving)return of(false);if(!this.dirty)return of(true);return this.dialog.open(AcademyConfirmDialogComponent,{data:{title:'Cambios sin guardar',message:'Hay cambios de asistencia sin guardar. ¿Quieres descartarlos y salir?',action:'Descartar y salir'}}).afterClosed();}
 @HostListener('window:beforeunload',['$event']) beforeUnload(event:BeforeUnloadEvent):void{if(this.dirty||this.saving){event.preventDefault();event.returnValue='';}}
 reloadConfirmed():void{this.canDeactivate().subscribe(ok=>{if(ok)this.load();});}
 start():void{if(this.saving||this.data?.session.status!=='SCHEDULED')return;this.saving=true;this.operations.transitionSession(this.sessionId,'start').pipe(finalize(()=>this.saving=false)).subscribe({next:()=>{this.saving=false;this.load();},error:e=>this.error=e.error?.message||'No fue posible iniciar la clase.'});}
 save(complete=false):void{
  if(!this.editable||this.saving||!this.data||(complete&&this.unmarked>0))return;
  this.saving=true;this.error='';this.message='';let saved=false;
  this.api.saveBulk(this.sessionId,this.data).pipe(switchMap(data=>{this.accept(data);saved=true;return complete?this.operations.transitionSession(this.sessionId,'complete'):of(null);}),finalize(()=>this.saving=false)).subscribe({next:()=>{this.message=complete?'Asistencia guardada y clase finalizada.':'Asistencia guardada.';if(complete){this.saving=false;this.load();}},error:e=>{this.error=(saved?'La asistencia quedó guardada, pero no se pudo finalizar la sesión. ':'')+(e.error?.message||'No fue posible guardar la asistencia.');}});
 }
 trackStudent(_:number,student:SessionAttendanceStudent):number{return student.studentId;}
}
