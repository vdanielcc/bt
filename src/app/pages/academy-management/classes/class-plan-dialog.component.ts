import { PlanAmountPipe, planAvailable } from '../billing/billing-plan.util';
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { BillingPlan } from '../models/academy-management.models';
import { BillingManagementService } from '../services/billing-management.service';
import { ClassManagementService } from '../services/class-management.service';

@Component({selector:'bte-class-plan-dialog',standalone:true,imports:[PlanAmountPipe,CommonModule,ReactiveFormsModule,MatDialogModule,MatButtonModule,MatCheckboxModule,MatFormFieldModule,MatSelectModule],template:`<h2 mat-dialog-title>Asociar plan a clase</h2><mat-dialog-content [formGroup]="form" class="form"><mat-form-field><mat-label>Plan / Membresía</mat-label><mat-select formControlName="billingPlanId"><mat-option *ngFor="let plan of available" [value]="plan.id">{{plan.name}} · {{plan.amount|planAmount}}</mat-option></mat-select></mat-form-field><mat-checkbox formControlName="isDefault">Plan predeterminado</mat-checkbox></mat-dialog-content><mat-dialog-actions align="end"><button mat-button mat-dialog-close>Cancelar</button><button mat-flat-button color="primary" [disabled]="saving" (click)="save()">{{saving?'Asociando...':'Asociar'}}</button></mat-dialog-actions>`,styles:[`.form{display:flex;flex-direction:column;gap:1rem;padding-top:.5rem}`]})
export class ClassPlanDialogComponent implements OnInit{saving=false;plans:BillingPlan[]=[];form=this.fb.group({billingPlanId:[0,[Validators.required,Validators.min(1)]],isDefault:[false]});get available():BillingPlan[]{const ids=new Set(this.data.current.map(plan=>plan.id));return this.plans.filter(plan=>planAvailable(plan)&&!ids.has(plan.id));}constructor(@Inject(MAT_DIALOG_DATA)public data:{academyId:number;classId:number;current:BillingPlan[]},private fb:FormBuilder,private billing:BillingManagementService,private classes:ClassManagementService,private ref:MatDialogRef<ClassPlanDialogComponent>,private snack:MatSnackBar){}ngOnInit():void{this.billing.getPlans(this.data.academyId).subscribe({next:rows=>this.plans=rows,error:()=>this.snack.open('No fue posible cargar los planes. Cierra y vuelve a intentar.','Cerrar',{duration:5000})});}save():void{if(this.form.invalid){this.form.markAllAsTouched();return;}this.saving=true;const value=this.form.getRawValue();this.classes.addBillingPlan(this.data.classId,{classId:this.data.classId,billingPlanId:value.billingPlanId!,isDefault:!!value.isDefault}).pipe(finalize(()=>this.saving=false)).subscribe({next:()=>this.ref.close(true),error:error=>this.snack.open(error?.error?.message??'No fue posible asociar el plan.','Cerrar',{duration:5000})});}}
