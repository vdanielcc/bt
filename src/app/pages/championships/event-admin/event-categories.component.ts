import { Component, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Subscription, finalize } from 'rxjs';
import { AdminCategory, AdminCategoryUpdate, CategoryConfiguration, EventCategoriesService } from './event-categories.service';

export function filterEventCategories(categories:AdminCategory[],query:string):AdminCategory[] {
  const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const terms=normalize(query).trim().split(/\s+/).filter(Boolean);
  return categories.filter(category=>terms.every(term=>normalize(`${category.code} ${category.name}`).includes(term)));
}
@Component({standalone:true,selector:'bte-event-categories',templateUrl:'./event-categories.component.html',
  imports:[CommonModule,ReactiveFormsModule,RouterLink,MatAutocompleteModule,MatFormFieldModule,MatInputModule,MatSelectModule,MatButtonModule,MatCheckboxModule]})
export class EventCategoriesComponent implements OnDestroy {
  private readonly api=inject(EventCategoriesService);
  private readonly fb=inject(FormBuilder);
  private readonly subscriptions=new Subscription();
  readonly eventId=Number(inject(ActivatedRoute).snapshot.paramMap.get('eventId'));
  readonly search=new FormControl<string|AdminCategory>('');
  readonly query=signal('');
  config:CategoryConfiguration|null=null; selected:AdminCategory|null=null;
  loading=false; saving=false; error=''; message='';
  private readonly integer=[Validators.required,Validators.min(0),Validators.max(2147483647),Validators.pattern(/^\d+$/)];
  readonly form=this.fb.nonNullable.group({
    code:['',[Validators.required,Validators.maxLength(6)]],name:['',[Validators.required,Validators.maxLength(100)]],
    gender:['Mixto',Validators.required],fixtureType:['ELIMINACION',Validators.required],
    ageStart:[0,this.integer],ageEnd:[99,this.integer],isOpen:this.fb.control<boolean|null>(false),
    weightStart:this.fb.control<number|null>(null,[Validators.min(0),Validators.max(999.99)]),
    weightEnd:this.fb.control<number|null>(null,[Validators.min(0),Validators.max(999.99)]),
    typeId:[0,[Validators.required,Validators.min(1)]],modalityId:[0,[Validators.required,Validators.min(1)]],
    isFree:[false],thirdPlacePlayoff:[false],sort:[0,this.integer],maxCompetitors:[0,this.integer],
    matchDuration:['00:00:00',[Validators.required,Validators.pattern(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)]]
  });
  readonly integerFields=[{key:'ageStart',label:'Edad inicial'},{key:'ageEnd',label:'Edad final'},{key:'sort',label:'Orden'},{key:'maxCompetitors',label:'Máximo de competidores'}];
  readonly weightFields=[{key:'weightStart',label:'Peso inicial (kg)'},{key:'weightEnd',label:'Peso final (kg)'}];
  readonly displayCategory=(value:AdminCategory|string|null)=>typeof value==='object'&&value?`${value.code} — ${value.name}`:value??'';
  get filteredCategories() { return filterEventCategories(this.config?.categories??[],this.query()); }
  constructor() {
    this.subscriptions.add(this.search.valueChanges.subscribe(value=>this.query.set(typeof value==='string'?value:'')));
    this.load();
  }
  ngOnDestroy() { this.subscriptions.unsubscribe(); }
  load(selectedId?:number) {
    this.loading=true;this.error='';
    this.subscriptions.add(this.api.get(this.eventId).pipe(finalize(()=>this.loading=false)).subscribe({
      next:config=>{this.config=config;if(selectedId) { const category=config.categories.find(c=>c.id===selectedId);if(category)this.select(category,true); }},
      error:e=>this.error=this.errorMessage(e)
    }));
  }
  select(category:AdminCategory,force=false) {
    if(this.saving)return;
    if(!force&&this.form.dirty&&!window.confirm('Hay cambios sin guardar. ¿Deseas cambiar de categoría?')) {this.search.setValue(this.selected);return;}
    this.selected=category;this.form.reset({...category,thirdPlacePlayoff:category.thirdPlacePlayoff??false});this.search.setValue(category);this.error='';if(!force)this.message='';
  }
  save() {
    if(!this.selected||this.saving)return;
    this.form.markAllAsTouched();this.error='';if(this.form.invalid)return;
    const value=this.form.getRawValue();
    if(value.ageEnd<value.ageStart){this.error='La edad final no puede ser menor que la inicial.';return;}
    if(value.weightEnd!=null&&value.weightEnd>0&&value.weightStart!=null&&value.weightStart>value.weightEnd){this.error='El peso final no puede ser menor que el inicial.';return;}
    if([value.weightStart,value.weightEnd].some(v=>v!=null&&Math.abs(v*100-Math.round(v*100))>0.00001)){this.error='Los pesos admiten hasta dos decimales.';return;}
    const shared=this.selected.sharedEventCount>1;
    if(shared&&!window.confirm(`Esta categoría se utiliza en ${this.selected.sharedEventCount} eventos. ¿Confirmas actualizarla en todos ellos?`))return;
    const request:AdminCategoryUpdate={...value,name:value.name.trim(),code:value.code.trim(),matchDuration:value.matchDuration.length===5?value.matchDuration+':00':value.matchDuration,confirmSharedUpdate:shared};
    const id=this.selected.id;this.saving=true;this.form.disable();this.search.disable();
    this.subscriptions.add(this.api.update(this.eventId,id,request).pipe(finalize(()=>{this.saving=false;this.form.enable();this.search.enable();})).subscribe({
      next:()=>{this.saving=false;this.message='Categoría actualizada correctamente.';this.load(id);},error:e=>this.error=this.errorMessage(e)
    }));
  }
  private errorMessage(error:unknown) {
    if(error instanceof HttpErrorResponse) return error.error?.message||(error.error?.errors?Object.values(error.error.errors).flat().join(' '):'No se pudo completar la operación.');
    return 'No se pudo completar la operación.';
  }
}
