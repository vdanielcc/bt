import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatAutocompleteHarness } from '@angular/material/autocomplete/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { EventCategoriesComponent,filterEventCategories } from './event-categories.component';
import { AdminCategory,EventCategoriesService } from './event-categories.service';
const category:AdminCategory={id:10,name:'Kata Femenino',code:'K1',gender:'Female',fixtureType:'ELIMINACION',ageStart:12,ageEnd:14,isOpen:null,weightStart:null,weightEnd:0,typeId:1,modalityId:1,isFree:false,sort:0,maxCompetitors:0,matchDuration:'00:02:00',sharedEventCount:1};
describe('Event category administrator',()=>{
  let api:jasmine.SpyObj<EventCategoriesService>;
  beforeEach(()=>{
    api=jasmine.createSpyObj('EventCategoriesService',['get','update']);
    api.get.and.returnValue(of({eventName:'Campeonato',categories:[category,{...category,id:11,code:'K2',name:'Kata Masculino'}],types:[{id:1,name:'Karate'}],modalities:[{id:1,name:'Kata'}]}));api.update.and.returnValue(of(undefined));
    TestBed.configureTestingModule({imports:[EventCategoriesComponent],providers:[provideRouter([]),provideNoopAnimations(),{provide:ActivatedRoute,useValue:{snapshot:{paramMap:convertToParamMap({eventId:'1'})}}},{provide:EventCategoriesService,useValue:api}]});
  });
  it('searches code and name predictively and opens every category field',async()=>{
    const fixture=TestBed.createComponent(EventCategoriesComponent);fixture.detectChanges();
    const search=await TestbedHarnessEnvironment.loader(fixture).getHarness(MatAutocompleteHarness);
    await search.enterText('k1 fem');expect((await search.getOptions()).length).toBe(1);
    await search.selectOption({text:'K1 — Kata Femenino'});
    expect(fixture.componentInstance.selected?.id).toBe(10);
    expect(fixture.nativeElement.querySelector('input[formControlName="code"]').value).toBe('K1');
    expect(fixture.componentInstance.form.getRawValue().matchDuration).toBe('00:02:00');fixture.destroy();
  });
  it('matches accents and retains edits after a failed save',()=>{
    expect(filterEventCategories([{...category,name:'Categoría Femenino'}],'categoria K1').length).toBe(1);
    const component=TestBed.runInInjectionContext(()=>new EventCategoriesComponent());component.select(category);
    component.form.patchValue({name:'Nuevo nombre',isFree:true});
    api.update.and.returnValue(throwError(()=>new HttpErrorResponse({status:500,error:{message:'No se pudo guardar'}})));
    component.save();expect(api.update.calls.mostRecent().args[2].isFree).toBeTrue();
    expect(component.form.controls.name.value).toBe('Nuevo nombre');expect(component.form.enabled).toBeTrue();expect(component.error).toBe('No se pudo guardar');component.ngOnDestroy();
  });
  it('requires confirmation for shared categories and rejects inverted ranges',()=>{
    const component=TestBed.runInInjectionContext(()=>new EventCategoriesComponent());component.select({...category,sharedEventCount:2});
    component.form.patchValue({ageEnd:1});component.save();expect(api.update).not.toHaveBeenCalled();
    component.form.patchValue({ageEnd:14});const confirm=spyOn(window,'confirm').and.returnValue(false);component.save();expect(api.update).not.toHaveBeenCalled();
    confirm.and.returnValue(true);component.save();expect(api.update.calls.mostRecent().args[2].confirmSharedUpdate).toBeTrue();component.ngOnDestroy();
  });
  it('loads and saves the third-place PDF option in both states',()=>{
    const component=TestBed.runInInjectionContext(()=>new EventCategoriesComponent());
    component.select({...category,thirdPlacePlayoff:true});
    expect(component.form.controls.thirdPlacePlayoff.value).toBeTrue();
    component.save();expect(api.update.calls.mostRecent().args[2].thirdPlacePlayoff).toBeTrue();
    component.form.patchValue({thirdPlacePlayoff:false});component.save();
    expect(api.update.calls.mostRecent().args[2].thirdPlacePlayoff).toBeFalse();component.ngOnDestroy();
  });
});
