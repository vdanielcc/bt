import { Component, Inject, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, finalize, of, switchMap } from 'rxjs';
import { BillingConcept } from '../models/academy-management.models';
import { BillingChargeRead, ChargeReferences, conceptLabels } from '../models/billing-charge.models';
import { BillingManagementService } from '../services/billing-management.service';
import { PlanAmountPipe } from './billing-plan.util';

@Component({selector:'bte-charge-form-dialog',standalone:true,imports:[CommonModule,ReactiveFormsModule,MatDialogModule,MatAutocompleteModule,MatButtonModule,MatFormFieldModule,MatInputModule,MatSelectModule,PlanAmountPipe],
template:`<h2 mat-dialog-title>{{data.charge?'Editar cargo':'Nuevo cargo'}}</h2><mat-dialog-content [formGroup]="form" class="grid">
 <mat-form-field *ngIf="!data.charge" class="wide"><mat-label>Alumno</mat-label><input matInput [formControl]="student" [matAutocomplete]="auto"><mat-autocomplete #auto="matAutocomplete" [displayWith]="studentLabel"><mat-option *ngFor="let s of students" [value]="s">{{s.name}}</mat-option></mat-autocomplete><mat-hint>Busca por nombre (mínimo 2 caracteres).</mat-hint></mat-form-field>
 <p *ngIf="data.charge" class="wide">{{data.charge.studentName}} · {{data.charge.conceptName}}</p>
 <mat-form-field *ngIf="!data.charge"><mat-label>Concepto</mat-label><mat-select formControlName="billingConceptId"><mat-option *ngFor="let c of concepts" [value]="c.id">{{labels[c.code||'']||c.name}}</mat-option></mat-select></mat-form-field>
 <mat-form-field><mat-label>Monto</mat-label><input matInput type="number" min="0" step="0.01" formControlName="amount" [readonly]="!!data.charge?.generatedAutomatically"><mat-hint *ngIf="data.charge?.generatedAutomatically">Monto base del cargo original.</mat-hint></mat-form-field>
 <mat-form-field><mat-label>Descuento</mat-label><input matInput type="number" min="0" step="0.01" formControlName="discountAmount"></mat-form-field>
 <mat-form-field><mat-label>Recargo</mat-label><input matInput type="number" min="0" step="0.01" formControlName="surchargeAmount"></mat-form-field>
 <mat-form-field><mat-label>Vencimiento</mat-label><input matInput type="date" formControlName="dueDate"></mat-form-field>
 <mat-form-field *ngIf="!data.charge"><mat-label>Días de gracia</mat-label><input matInput type="number" min="0" step="1" formControlName="graceDays"></mat-form-field>
 <mat-form-field *ngIf="!data.charge"><mat-label>Período (opcional)</mat-label><input matInput type="month" formControlName="referencePeriod"></mat-form-field>
 <mat-form-field *ngIf="!data.charge && conceptCode==='ENROLLMENT_FEE'"><mat-label>Inscripción asociada (opcional)</mat-label><mat-select formControlName="classEnrollmentId"><mat-option [value]="null">Sin asociación</mat-option><mat-option *ngFor="let e of references.enrollments" [value]="e.id">{{e.name}} · {{e.status}}</mat-option></mat-select></mat-form-field>
 <mat-form-field *ngIf="!data.charge && conceptCode==='EVENT_FEE'"><mat-label>Evento asociado (opcional)</mat-label><mat-select formControlName="eventId"><mat-option [value]="null">Sin asociación</mat-option><mat-option *ngFor="let e of references.events" [value]="e.id">{{e.name}}</mat-option></mat-select></mat-form-field>
 <mat-form-field *ngIf="!data.charge && conceptCode==='EXAM_FEE'"><mat-label>Examen asociado (opcional)</mat-label><mat-select formControlName="gradeHistoryId"><mat-option [value]="null">Sin asociación</mat-option><mat-option *ngFor="let e of references.examinations" [value]="e.id">{{e.effectiveDate}} · {{e.result}}</mat-option></mat-select></mat-form-field>
 <mat-form-field class="wide"><mat-label>Descripción</mat-label><textarea matInput maxlength="255" formControlName="description"></textarea><mat-error>Descripción obligatoria.</mat-error></mat-form-field>
 <p class="wide">Total: <strong>{{total|planAmount}}</strong></p><p class="wide" *ngIf="form.hasError('negativeTotal')" role="alert">El descuento no puede superar el monto y los recargos.</p><p *ngIf="error" role="alert" class="wide">{{error}}</p>
</mat-dialog-content><mat-dialog-actions align="end"><button mat-button [disabled]="saving" mat-dialog-close>Cancelar</button><button mat-flat-button color="primary" [disabled]="saving" (click)="save()">{{saving?'Guardando…':'Guardar'}}</button></mat-dialog-actions>`,styles:[`.grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;padding-top:.5rem}.wide{grid-column:1/-1}@media(max-width:600px){.grid{grid-template-columns:1fr}}`]})
export class ChargeFormDialogComponent implements OnInit {
 private destroyRef=inject(DestroyRef);saving=false;error='';concepts:BillingConcept[]=[];students:{id:number;name:string}[]=[];references:ChargeReferences={events:[],enrollments:[],examinations:[]};labels=conceptLabels;
 student=new FormControl<string|{id:number;name:string}>('');
 private money=[Validators.required,Validators.min(0),Validators.max(9999999999.99),Validators.pattern(/^\d+(\.\d{1,2})?$/)];
 form=this.fb.group({billingConceptId:[0,[Validators.required,Validators.min(1)]],amount:[0,this.money],discountAmount:[0,this.money],surchargeAmount:[0,this.money],dueDate:[''],referencePeriod:['',Validators.pattern(/^\d{4}-(0[1-9]|1[0-2])$/)],description:['',[Validators.required,Validators.maxLength(255),Validators.pattern(/.*\S.*/)]],graceDays:[0,[Validators.min(0),Validators.max(65535),Validators.pattern(/^\d+$/)]],classEnrollmentId:[null as number|null],eventId:[null as number|null],gradeHistoryId:[null as number|null]}, {validators:c=>(Math.round(Number(c.get('amount')?.value)*100)-Math.round(Number(c.get('discountAmount')?.value)*100)+Math.round(Number(c.get('surchargeAmount')?.value)*100))<0?{negativeTotal:true}:null});
 get total():number{const v=this.form.getRawValue();return (Math.round(Number(v.amount)*100)-Math.round(Number(v.discountAmount)*100)+Math.round(Number(v.surchargeAmount)*100))/100;}
 get conceptCode():string{return this.concepts.find(c=>c.id===this.form.controls.billingConceptId.value)?.code||'';}
 studentLabel(s:string|{id:number;name:string}|null):string{return typeof s==='object'?s?.name||'':s||'';}
 constructor(@Inject(MAT_DIALOG_DATA)public data:{academyId:number;charge?:BillingChargeRead},private fb:FormBuilder,private service:BillingManagementService,private ref:MatDialogRef<ChargeFormDialogComponent>){if(data.charge)this.form.patchValue(data.charge);}
 ngOnInit():void{
  this.service.getConcepts().subscribe({next:c=>this.concepts=c,error:()=>this.error='No fue posible cargar los conceptos.'});
  this.student.valueChanges.pipe(debounceTime(250),distinctUntilChanged(),switchMap(s=>{
   if(typeof s==='object'&&s){this.loadReferences(s.id);return of([]);}
   return typeof s==='string'&&s.trim().length>=2?this.service.billingStudents(this.data.academyId,s).pipe(catchError(()=>{this.error='No fue posible buscar alumnos.';return of([]);})):of([]);
  }),takeUntilDestroyed(this.destroyRef)).subscribe(s=>this.students=s);
 }
 private loadReferences(studentId:number):void{this.form.patchValue({classEnrollmentId:null,eventId:null,gradeHistoryId:null});this.service.billingReferences(this.data.academyId,studentId).subscribe({next:r=>this.references=r,error:()=>this.error='No fue posible cargar asociaciones; puedes crear el cargo sin asociación.'});}
 save():void{
  if(this.saving)return;const selected=typeof this.student.value==='object'?this.student.value:null;
  if(this.form.invalid||(!this.data.charge&&!selected)){this.form.markAllAsTouched();this.error='Completa alumno, concepto e importes válidos.';return;}
  this.saving=true;this.error='';this.ref.disableClose=true;const v=this.form.getRawValue();
  const common={description:v.description!.trim(),amount:v.amount!,discountAmount:v.discountAmount!,surchargeAmount:v.surchargeAmount!,dueDate:v.dueDate||null};
  const request=this.data.charge?this.service.updateCharge(this.data.charge.id,common):this.service.createManualCharge(this.data.academyId,{...common,studentId:selected!.id,billingConceptId:v.billingConceptId!,referencePeriod:v.referencePeriod||null,graceDays:v.graceDays!,classEnrollmentId:this.conceptCode==='ENROLLMENT_FEE'?v.classEnrollmentId:null,eventId:this.conceptCode==='EVENT_FEE'?v.eventId:null,gradeHistoryId:this.conceptCode==='EXAM_FEE'?v.gradeHistoryId:null});
  request.pipe(finalize(()=>{this.saving=false;this.ref.disableClose=false;})).subscribe({next:c=>this.ref.close(c),error:e=>this.error=e.error?.message||'No fue posible guardar el cargo.'});
 }
}
