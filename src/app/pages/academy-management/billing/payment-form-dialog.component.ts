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
import { catchError, debounceTime, finalize, of, switchMap } from 'rxjs';
import { BillingManagementService } from '../services/billing-management.service';
import { BillingPaymentRead, paymentMethods } from '../models/billing-payment.models';
@Component({selector:'bte-payment-form-dialog',standalone:true,imports:[CommonModule,ReactiveFormsModule,MatDialogModule,MatAutocompleteModule,MatButtonModule,MatFormFieldModule,MatInputModule,MatSelectModule],
template:`<h2 mat-dialog-title>{{data.payment?'Editar pago pendiente':'Registrar pago'}}</h2><mat-dialog-content [formGroup]="form" class="grid">
<p *ngIf="error" role="alert">{{error}}</p><p *ngIf="savedPaymentId">El pago quedó guardado pendiente. Reintenta el comprobante o cierra para continuar después.</p>
<mat-form-field *ngIf="!data.payment"><mat-label>Alumno</mat-label><input matInput [formControl]="student" [matAutocomplete]="auto"><mat-autocomplete #auto="matAutocomplete" [displayWith]="studentLabel"><mat-option *ngFor="let s of students" [value]="s">{{s.name}}</mat-option></mat-autocomplete></mat-form-field><p *ngIf="data.payment">{{data.payment.studentName}}</p>
<mat-form-field *ngIf="!data.payment"><mat-label>Pagador opcional</mat-label><mat-select formControlName="payerPersonId"><mat-option [value]="null">Sin indicar</mat-option><mat-option *ngFor="let p of payers" [value]="p.id">{{p.name}}</mat-option></mat-select></mat-form-field>
<mat-form-field><mat-label>Monto</mat-label><input matInput type="number" min="0.01" step="0.01" formControlName="amount"></mat-form-field>
<mat-form-field><mat-label>Medio de pago</mat-label><mat-select formControlName="paymentMethod"><mat-option *ngFor="let m of methods|keyvalue" [value]="m.key">{{m.value}}</mat-option></mat-select></mat-form-field>
<mat-form-field><mat-label>Fecha y hora</mat-label><input matInput type="datetime-local" formControlName="paidAt"><mat-hint>Hora local de este equipo.</mat-hint></mat-form-field>
<mat-form-field><mat-label>Referencia</mat-label><input matInput maxlength="150" formControlName="transactionReference"></mat-form-field>
<label>Comprobante (PDF, JPG o PNG, hasta 5 MB)<input type="file" accept="application/pdf,image/jpeg,image/png" (change)="selectFile($event)"></label>
<mat-form-field><mat-label>Notas</mat-label><textarea matInput maxlength="500" formControlName="notes"></textarea></mat-form-field>
</mat-dialog-content><mat-dialog-actions align="end"><button mat-button [disabled]="saving" (click)="close()">Cerrar</button><button mat-flat-button color="primary" [disabled]="saving||form.invalid" (click)="save()">{{saving?'Guardando…':savedPaymentId?'Reintentar comprobante':'Guardar pendiente'}}</button></mat-dialog-actions>`,styles:[`.grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}p{grid-column:1/-1}@media(max-width:600px){.grid{grid-template-columns:1fr}}`]})
export class PaymentFormDialogComponent implements OnInit {
 saving=false;error='';file?:File;savedPaymentId?:number;methods=paymentMethods;students:{id:number;name:string}[]=[];payers:{id:number;name:string}[]=[];
 student=new FormControl<string|{id:number;name:string}>('');private destroyRef=inject(DestroyRef);
 form=this.fb.group({studentId:[null as number|null,Validators.required],payerPersonId:[null as number|null],amount:[0,[Validators.required,Validators.min(.01)]],paymentMethod:['TRANSFER',Validators.required],paidAt:['',Validators.required],transactionReference:[''],notes:['']});
 constructor(@Inject(MAT_DIALOG_DATA)public data:{academyId:number;payment?:BillingPaymentRead},private fb:FormBuilder,private service:BillingManagementService,private ref:MatDialogRef<PaymentFormDialogComponent>){
  const p=data.payment;const date=p?new Date(p.paidAt):new Date();date.setMinutes(date.getMinutes()-date.getTimezoneOffset());
  this.form.patchValue({studentId:p?.studentId??null,payerPersonId:p?.payerPersonId??null,amount:p?.amount??0,paymentMethod:p?.paymentMethod??'TRANSFER',paidAt:date.toISOString().slice(0,16),transactionReference:p?.transactionReference??'',notes:p?.notes??''});
 }
 studentLabel=(s:any)=>s?.name||'';
 ngOnInit():void{this.student.valueChanges.pipe(debounceTime(250),switchMap(v=>{const chosen=typeof v==='object'&&v!=null?v:null;this.form.controls.studentId.setValue(chosen?.id??null);this.form.controls.payerPersonId.setValue(null);this.payers=[];if(chosen)this.service.billingReferences(this.data.academyId,chosen.id).subscribe({next:r=>this.payers=r.payers??[],error:()=>this.error='No fue posible cargar los pagadores.'});return typeof v==='string'&&v.trim().length>=2?this.service.billingStudents(this.data.academyId,v).pipe(catchError(()=>of([]))):of([]);}),takeUntilDestroyed(this.destroyRef)).subscribe(s=>this.students=s);}
 selectFile(event:Event):void{this.file=(event.target as HTMLInputElement).files?.[0];}
 close():void{this.ref.close(this.savedPaymentId?{id:this.savedPaymentId}:undefined);}
 save():void{
  if(this.saving||this.form.invalid)return;const v=this.form.getRawValue();
  if(!Number.isFinite(v.amount)||Math.abs(v.amount!*100-Math.round(v.amount!*100))>1e-6){this.error='Usa un monto positivo con hasta dos decimales.';return;}
  this.saving=true;this.error='';this.ref.disableClose=true;
  const common={amount:v.amount!,paymentMethod:v.paymentMethod!,paidAt:new Date(v.paidAt!).toISOString(),transactionReference:v.transactionReference||null,notes:v.notes||null};
  const save=this.savedPaymentId?of({payment:{id:this.savedPaymentId}}):this.data.payment?this.service.updatePayment(this.data.payment.id,common):this.service.createPayment({...common,academyId:this.data.academyId,studentId:v.studentId!,payerPersonId:v.payerPersonId});
  save.pipe(switchMap(r=>{this.savedPaymentId=r.payment.id;if(this.file){this.form.disable();this.student.disable();}return this.file?this.service.uploadPaymentReceipt(r.payment.id,this.file):of(r);}),finalize(()=>{this.saving=false;this.ref.disableClose=false;})).subscribe({next:r=>this.ref.close(r),error:e=>this.error=e.error?.message||'No fue posible guardar el pago o su comprobante.'});
 }
}
