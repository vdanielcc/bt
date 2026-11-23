import { billingCycles } from './billing-plan.util';
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize, Observable } from 'rxjs';
import { BillingPlan } from '../models/academy-management.models';
import { BillingManagementService } from '../services/billing-management.service';

@Component({selector:'bte-billing-plan-dialog',standalone:true,
imports:[CommonModule,ReactiveFormsModule,MatDialogModule,MatButtonModule,MatFormFieldModule,MatInputModule,MatSelectModule,MatSlideToggleModule],
template:`<h2 mat-dialog-title>{{data.plan?'Editar':'Crear'}} plan / membresía</h2>
<mat-dialog-content [formGroup]="form" class="grid">
 <mat-form-field><mat-label>Código</mat-label><input matInput formControlName="code" maxlength="30"><mat-error>Código obligatorio (máximo 30 caracteres).</mat-error></mat-form-field>
 <mat-form-field><mat-label>Nombre</mat-label><input matInput formControlName="name" maxlength="120"><mat-error>Nombre obligatorio (máximo 120 caracteres).</mat-error></mat-form-field>
 <mat-form-field><mat-label>Tipo de cobro</mat-label><mat-select formControlName="billingCycle"><mat-option *ngFor="let cycle of cycles" [value]="cycle.value">{{cycle.label}}</mat-option></mat-select></mat-form-field>
 <mat-form-field><mat-label>{{form.controls.billingCycle.value==='MONTHLY'?'Monto mensual':form.controls.billingCycle.value==='PER_CLASS'?'Valor por clase':'Monto'}}</mat-label><input matInput type="number" min="0.01" step="0.01" formControlName="amount"><mat-error>Monto positivo con hasta dos decimales.</mat-error></mat-form-field>
 <mat-form-field *ngIf="monthly"><mat-label>Día de vencimiento</mat-label><input matInput type="number" min="1" max="28" step="1" formControlName="dueDay"><mat-error>Indica un día entre 1 y 28.</mat-error></mat-form-field>
 <mat-form-field *ngIf="monthly"><mat-label>Días de gracia</mat-label><input matInput type="number" min="0" step="1" formControlName="graceDays"><mat-error>Indica días enteros no negativos.</mat-error></mat-form-field>
 <mat-form-field><mat-label>Vigente desde</mat-label><input matInput type="date" formControlName="validFrom"></mat-form-field>
 <mat-form-field><mat-label>Vigente hasta</mat-label><input matInput type="date" formControlName="validTo"></mat-form-field>
 <p *ngIf="form.hasError('dateRange')" class="wide" role="alert">La fecha de inicio no puede ser posterior a la fecha de término.</p>
 <mat-form-field class="wide"><mat-label>Descripción</mat-label><textarea matInput maxlength="500" formControlName="description"></textarea></mat-form-field>
 <mat-slide-toggle formControlName="isActive">Activo</mat-slide-toggle>
</mat-dialog-content><mat-dialog-actions align="end"><button mat-button [disabled]="saving" mat-dialog-close>Cancelar</button><button mat-flat-button color="primary" [disabled]="saving" (click)="save()">{{saving?'Guardando…':'Guardar'}}</button></mat-dialog-actions>`,
styles:[`.grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;padding-top:.5rem}.wide{grid-column:1/-1}@media(max-width:600px){.grid{grid-template-columns:1fr}}`]})
export class BillingPlanDialogComponent {
 saving=false;cycles=billingCycles;
 form=this.fb.group({
  code:['',[Validators.required,Validators.maxLength(30),Validators.pattern(/.*\S.*/)]],name:['',[Validators.required,Validators.maxLength(120),Validators.pattern(/.*\S.*/)]],description:['',Validators.maxLength(500)],
  billingCycle:['MONTHLY',Validators.required],amount:[0,[Validators.required,Validators.min(.01),Validators.max(9999999999.99),Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
  dueDay:[null as number|null],graceDays:[0,[Validators.required,Validators.min(0),Validators.max(65535),Validators.pattern(/^\d+$/)]],validFrom:[''],validTo:[''],isActive:[true]
 },{validators:control=>{const a=control.get('validFrom')?.value,b=control.get('validTo')?.value;return a&&b&&a>b?{dateRange:true}:null;}});
 get monthly():boolean{return this.form.controls.billingCycle.value==='MONTHLY';}
 constructor(@Inject(MAT_DIALOG_DATA)public data:{academyId:number;plan?:BillingPlan},private fb:FormBuilder,private service:BillingManagementService,private ref:MatDialogRef<BillingPlanDialogComponent>,private snack:MatSnackBar){
  if(data.plan)this.form.patchValue(data.plan);
  this.configureCycle();
  this.form.controls.billingCycle.valueChanges.subscribe(()=>this.configureCycle());
 }
 private configureCycle():void{
  const day=this.form.controls.dueDay;
  day.setValidators(this.monthly?[Validators.required,Validators.min(1),Validators.max(28),Validators.pattern(/^\d+$/)]:[]);
  if(!this.monthly){day.setValue(null);this.form.controls.graceDays.setValue(0);}
  day.updateValueAndValidity();
 }
 save():void{
  if(this.saving)return;
  if(this.form.invalid){this.form.markAllAsTouched();return;}
  this.saving=true;this.ref.disableClose=true;
  const value=this.form.getRawValue();
  const payload={academyId:this.data.academyId,code:value.code!.trim(),name:value.name!.trim(),description:value.description?.trim()||null,billingCycle:value.billingCycle,
   amount:value.amount!,dueDay:this.monthly?value.dueDay:null,graceDays:this.monthly?value.graceDays!:0,isActive:!!value.isActive,validFrom:value.validFrom||null,validTo:value.validTo||null};
  const request:Observable<unknown>=this.data.plan?this.service.updatePlan(this.data.plan.id,{...this.data.plan,...payload}):this.service.createPlan(this.data.academyId,payload);
  request.pipe(finalize(()=>{this.saving=false;this.ref.disableClose=false;})).subscribe({next:result=>this.ref.close(result||true),error:e=>this.snack.open(e?.error?.message??'No fue posible guardar el plan.','Cerrar',{duration:5000})});
 }
}
