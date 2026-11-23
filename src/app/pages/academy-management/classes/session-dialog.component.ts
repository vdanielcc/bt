import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize, forkJoin, of } from 'rxjs';
import { ClassManagementService } from '../services/class-management.service';
import { AcademyOperationsService } from '../services/academy-operations.service';
import { AcademyManagementService } from '../services/academy-management.service';
import { AcademyClassListItem, AcademyInstructor, AcademyRoom } from '../models/academy-management.models';
import { ClassSessionDetail, GenerateClassSessionsResult, sessionRoles } from '../models/class-session.models';
@Component({ standalone: true, selector: 'bte-session-dialog', imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatProgressSpinnerModule],
 template: `<h2 mat-dialog-title>{{ title }}</h2><mat-dialog-content><form [formGroup]="form" (ngSubmit)="save()" id="session-form" class="flex flex-col gap-3 pt-2">
 <mat-form-field *ngIf="!data.session && !data.classId"><mat-label>Clase</mat-label><mat-select formControlName="classId"><mat-option *ngFor="let c of classes" [value]="c.id">{{ c.name }}</mat-option></mat-select></mat-form-field>
 <ng-container *ngIf="data.mode === 'generate'"><mat-form-field><mat-label>Fecha desde</mat-label><input matInput type="date" formControlName="dateFrom"></mat-form-field><mat-form-field><mat-label>Fecha hasta</mat-label><input matInput type="date" formControlName="dateTo"></mat-form-field><p>Las sesiones existentes conservarán sus datos. No se generan asistencias ni cobros.</p></ng-container>
 <ng-container *ngIf="data.mode === 'edit' || data.mode === 'manual'"><mat-form-field><mat-label>Fecha</mat-label><input matInput type="date" formControlName="sessionDate"></mat-form-field><div class="flex gap-3"><mat-form-field><mat-label>Inicio</mat-label><input matInput type="time" formControlName="startTime"></mat-form-field><mat-form-field><mat-label>Término</mat-label><input matInput type="time" formControlName="endTime"></mat-form-field></div><mat-form-field><mat-label>Sala</mat-label><mat-select formControlName="roomId"><mat-option *ngFor="let r of rooms" [value]="r.id">{{ r.name }}</mat-option></mat-select></mat-form-field><mat-form-field><mat-label>Notas</mat-label><textarea matInput formControlName="notes" maxlength="1000"></textarea></mat-form-field><p *ngIf="data.mode === 'edit'">Este cambio afecta solamente a esta sesión.</p></ng-container>
 <ng-container *ngIf="data.mode === 'instructor'"><mat-form-field><mat-label>Instructor</mat-label><mat-select formControlName="instructorId"><mat-option *ngFor="let i of instructors" [value]="i.id">{{ i.personName || ('Instructor '+i.id) }}</mat-option></mat-select></mat-form-field><mat-form-field><mat-label>Rol</mat-label><mat-select formControlName="role"><mat-option *ngFor="let role of roles | keyvalue" [value]="role.key">{{ role.value }}</mat-option></mat-select></mat-form-field><p>La asignación permanente de la clase se conserva.</p></ng-container>
 <ng-container *ngIf="data.mode === 'cancel'"><p>La sesión quedará registrada como cancelada y no se eliminará del historial.</p><mat-form-field><mat-label>Motivo obligatorio</mat-label><textarea matInput formControlName="reason" maxlength="500"></textarea></mat-form-field></ng-container>
 </form><mat-spinner *ngIf="loading" diameter="24" /><p *ngIf="error" role="alert">{{ error }}</p><button *ngIf="loadError" mat-button (click)="load()">Reintentar</button>
 <div *ngIf="result" role="status"><p>{{ result.created }} sesiones creadas · {{ result.existing }} ya existían · {{ result.skipped }} omitidas</p><p *ngFor="let message of result.errors">{{ message }}</p></div>
 </mat-dialog-content><mat-dialog-actions align="end"><button mat-button [disabled]="saving" (click)="ref.close(!!result)">{{ result ? 'Cerrar' : 'Cancelar' }}</button><button *ngIf="!result" mat-flat-button color="primary" type="submit" form="session-form" [disabled]="saving || loading || loadError">{{ saving ? 'Guardando…' : 'Guardar' }}</button><mat-spinner *ngIf="saving" diameter="22" /></mat-dialog-actions>` })
export class SessionDialogComponent {
 data=inject<{mode:'generate'|'manual'|'edit'|'instructor'|'cancel';academyId:number;classId?:number;session?:ClassSessionDetail;today:string}>(MAT_DIALOG_DATA);
 ref=inject(MatDialogRef<SessionDialogComponent>);private fb=inject(FormBuilder);private api=inject(ClassManagementService);private operations=inject(AcademyOperationsService);private academy=inject(AcademyManagementService);private destroyRef=inject(DestroyRef);
 rooms:AcademyRoom[]=[];instructors:AcademyInstructor[]=[];classes:AcademyClassListItem[]=[];loading=false;loadError=false;saving=false;error='';result?:GenerateClassSessionsResult;roles=sessionRoles;
 form=this.fb.group({classId:[this.data.classId??this.data.session?.classId??0],dateFrom:[this.data.today],dateTo:[this.data.today],sessionDate:[this.data.session?.sessionDate??this.data.today],startTime:[this.data.session?.startTime.slice(0,5)??'18:00'],endTime:[this.data.session?.endTime.slice(0,5)??'19:00'],roomId:[this.data.session?.roomId??0],notes:[this.data.session?.notes??''],instructorId:[0],role:['SUBSTITUTE'],reason:['']});
 get title():string{return {generate:'Generar sesiones',manual:'Crear sesión extraordinaria',edit:'Editar sesión',instructor:'Agregar instructor a esta sesión',cancel:'Cancelar sesión'}[this.data.mode];}
 constructor(){this.load();}
 load():void {
   this.error='';this.loadError=false;this.loading=true;
   forkJoin({
     classes: !this.data.session&&!this.data.classId ? this.api.getClasses(this.data.academyId) : of([] as AcademyClassListItem[]),
     rooms: this.data.mode==='manual'||this.data.mode==='edit' ? this.academy.getRooms(this.data.academyId) : of([] as AcademyRoom[]),
     instructors: this.data.mode==='instructor' ? this.academy.getInstructors(this.data.academyId) : of([] as AcademyInstructor[])
   }).pipe(takeUntilDestroyed(this.destroyRef),finalize(()=>this.loading=false)).subscribe({next:result=>{
     this.classes=result.classes.filter(c=>c.status==='ACTIVE');this.rooms=result.rooms.filter(r=>r.isActive);
     this.instructors=result.instructors.filter(i=>i.isActive&&!this.data.session?.instructors.some(a=>a.academyInstructorId===i.id));
   },error:error=>{this.loadError=true;this.error=error.error?.message||'No fue posible cargar las opciones.';}});
 }
 save():void {
   if(this.saving||this.loading||this.loadError)return;this.error='';const v=this.form.getRawValue();const id=this.data.classId??this.data.session?.classId??v.classId!;
   let request:Observable<unknown>;
   if(this.data.mode==='generate'){
     if(!id||!v.dateFrom||!v.dateTo||v.dateFrom>v.dateTo){this.error='Selecciona clase y rango de fechas válidos.';return;}
     request=this.api.generateClassSessions(id,{dateFrom:v.dateFrom,dateTo:v.dateTo});
   }else if(this.data.mode==='cancel'){
     if(!v.reason?.trim()){this.error='El motivo de cancelación es obligatorio.';return;}request=this.operations.transitionSession(this.data.session!.id,'cancel',v.reason.trim());
   }else if(this.data.mode==='instructor'){
     if(!this.instructors.some(i=>i.id===v.instructorId)){this.error='Selecciona un instructor activo disponible.';return;}request=this.api.addSessionInstructor(this.data.session!.id,v.instructorId!,v.role!);
   }else{
     if(!id||!v.sessionDate||!v.startTime||!v.endTime||v.startTime>=v.endTime||!this.rooms.some(r=>r.id===v.roomId)){this.error='Selecciona una fecha, horas y sala válidas.';return;}
     const body={sessionDate:v.sessionDate,startTime:v.startTime+':00',endTime:v.endTime+':00',roomId:v.roomId!,notes:v.notes||null};request=this.data.session?this.api.updateSession(this.data.session.id,body):this.api.createManualSession(id,body);
   }
   this.saving=true;this.form.disable();this.ref.disableClose=true;
   request.pipe(takeUntilDestroyed(this.destroyRef),finalize(()=>{this.saving=false;this.form.enable();this.ref.disableClose=!!this.result;})).subscribe({next:response=>{if(this.data.mode==='generate')this.result=response as GenerateClassSessionsResult;else this.ref.close(true);},error:error=>this.error=error.error?.message||'No fue posible guardar la sesión.'});
 }
}
