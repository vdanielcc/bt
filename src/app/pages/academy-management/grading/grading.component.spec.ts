import {TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ActivatedRoute,convertToParamMap} from '@angular/router';
import {of} from 'rxjs';
import {GradingPageComponent} from './grading-page.component';
import {GradingEditDialogComponent} from './grading-edit-dialog.component';
import {GradingManagementService} from '../services/grading-management.service';
import {TechnicalProfile} from '../models/grading.models';

describe('Progresión técnica y permisos',()=>{
 const profile={id:8,academyId:2,studentId:4,studentName:'Ana',styleName:'Judo',systemName:'Interno',isActive:true,currentGradeLevelId:10,currentGrade:{id:10,name:'Inicial'},nextGrade:{id:11,name:'Siguiente',isActive:true},isEligible:false,eligibleByTime:false,eligibleByClasses:false,attendedClasses:1,minimumClasses:5,monthsInCurrentGrade:1,minimumMonths:3} as TechnicalProfile;
 async function render(permissions:string[]){
  const service=jasmine.createSpyObj('GradingManagementService',['capabilities','students','systems','options','history','evaluations','write']);
  service.capabilities.and.returnValue(of({permissions,academyIds:[2],studentIds:[]}));service.students.and.returnValue(of({items:[profile],total:1,page:1,pageSize:25}));service.systems.and.returnValue(of([]));service.options.and.returnValue(of({styles:[],associations:[],students:[]}));
  await TestBed.configureTestingModule({imports:[GradingPageComponent,NoopAnimationsModule],providers:[{provide:GradingManagementService,useValue:service},{provide:ActivatedRoute,useValue:{snapshot:{paramMap:convertToParamMap({academyId:2}),data:{}}}}]}).compileComponents();
  const fixture=TestBed.createComponent(GradingPageComponent);fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();return fixture;
 }
 it('Instructor sin promote puede consultar pero no ofrece promover',async()=>{
  const f=await render(['grading.student.view','grading.student.view_history','grading.evaluation.record']);const buttons=Array.from(f.nativeElement.querySelectorAll('button')).map((b:any)=>b.textContent.trim());expect(buttons).not.toContain('Promover');expect(buttons).toContain('Evaluar');expect(buttons).not.toContain('Crear perfil');
 });
 it('promote sin override deshabilita promoción si faltan mínimos',async()=>{
  const f=await render(['grading.student.view','grading.student.promote']);const button=Array.from(f.nativeElement.querySelectorAll('button')).find((b:any)=>b.textContent.trim()==='Promover') as HTMLButtonElement;expect(button.disabled).toBeTrue();
 });
 it('override permite abrir la acción excepcional',async()=>{
  const f=await render(['grading.student.view','grading.student.promote','grading.student.promote_override','grading.student.view_eligibility']);const button=Array.from(f.nativeElement.querySelectorAll('button')).find((b:any)=>b.textContent.trim()==='Promover') as HTMLButtonElement;expect(button.disabled).toBeFalse();expect(f.componentInstance.eligibilityLabel(profile)).toBe('Falta tiempo y clases');
 });
 it('lectura de perfil sin view_eligibility no muestra tiempos ni filtro de elegibilidad',async()=>{const f=await render(['grading.student.view']);expect(f.componentInstance.eligibilityLabel(profile)).toBe('Sin permiso de elegibilidad');expect(f.nativeElement.textContent).not.toContain('Falta tiempo y clases');expect(f.nativeElement.querySelector('th:nth-child(4)')?.textContent).toContain('Acciones');});
 it('envía grado esperado y motivo explícito al promover',()=>{
  const service=jasmine.createSpyObj('GradingManagementService',['write']);service.write.and.returnValue(of({}));const ref=jasmine.createSpyObj('MatDialogRef',['close']);
  const d=new GradingEditDialogComponent({kind:'promote',academyId:2,permissions:['grading.student.promote','grading.student.promote_override'],profile},service,ref);d.override=true;d.reason='Reconocimiento';d.date='2026-10-18';d.save(true);
  const [path,body]=service.write.calls.mostRecent().args;expect(path).toBe('student-grading-profiles/8/promote');expect(body.expectedCurrentGradeLevelId).toBe(10);expect(body.targetGradeLevelId).toBe(11);expect(body.overrideReason).toBe('Reconocimiento');
 });
 it('registra evaluación sin llamar promoción y acepta puntaje mayor de 100',()=>{
  const service=jasmine.createSpyObj('GradingManagementService',['write']);service.write.and.returnValue(of({}));const ref=jasmine.createSpyObj('MatDialogRef',['close']);const d=new GradingEditDialogComponent({kind:'evaluation',academyId:2,permissions:['grading.evaluation.record'],profile},service,ref);d.evaluationDate='2026-10-18';d.score=150.125;d.save(true);const [path,body]=service.write.calls.mostRecent().args;expect(path).toBe('student-grading-profiles/8/evaluations');expect(body.score).toBe(150.125);expect(body.targetGradeLevelId).toBeUndefined();
 });
});
