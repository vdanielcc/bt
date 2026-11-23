import {Component,Input,OnInit,OnChanges,SimpleChanges} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import {MatTabsModule} from '@angular/material/tabs';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatDialog,MatDialogModule} from '@angular/material/dialog';
import {MatPaginatorModule,PageEvent} from '@angular/material/paginator';
import {forkJoin,of} from 'rxjs';
import {GradingManagementService} from '../services/grading-management.service';
import {GradingCapabilities,TechnicalProfile,TechnicalSystemRead,TechnicalSystem,TechnicalLevel,TechnicalOptions,TechnicalHistory,TechnicalEvaluation} from '../models/grading.models';
import {GradingEditDialogComponent,GradingEditData} from './grading-edit-dialog.component';
import {BeltBadgeComponent} from './belt-badge.component';
@Component({selector:'bte-grading-page',standalone:true,imports:[CommonModule,FormsModule,MatTabsModule,MatButtonModule,MatFormFieldModule,MatInputModule,MatSelectModule,MatDialogModule,MatPaginatorModule,BeltBadgeComponent],templateUrl:'./grading-page.component.html',styles:[`:host{display:block;padding:24px}.toolbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:16px 0}.scroll{overflow:auto}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:12px;border-bottom:1px solid #d1d5db;vertical-align:top}th{font-weight:600}.card{padding:16px;margin:16px 0}.actions{display:flex;flex-wrap:wrap;gap:4px;min-width:160px}.error{color:#b91c1c}small{display:block}h2{font-size:20px}h1{font-size:26px}button{white-space:nowrap}`]})
export class GradingPageComponent implements OnInit,OnChanges {
 @Input()studentId=0;academyId=0;cap:GradingCapabilities={permissions:[],academyIds:[],studentIds:[]};rows:TechnicalProfile[]=[];systems:TechnicalSystemRead[]=[];options:TechnicalOptions={styles:[],associations:[],students:[]};filterLevels:TechnicalLevel[]=[];levels:TechnicalLevel[]=[];selectedSystem:TechnicalSystem|null=null;
 history:TechnicalHistory[]=[];evaluations:TechnicalEvaluation[]=[];selectedProfile:TechnicalProfile|null=null;loading=false;error='';total=0;page=1;search='';styleFilter:number|null=null;systemFilter:number|null=null;gradeFilter:number|null=null;eligibility='';tab=0;ready=false;
 constructor(private service:GradingManagementService,private route:ActivatedRoute,private dialog:MatDialog){}
 academyName(id:number):string{return this.cap.academies?.find(a=>a.id===id)?.name||'Academia';}
 studentName(id:number):string{return this.cap.students?.find(s=>s.id===id)?.name||'Estudiante';}
 has(p:string):boolean{return this.cap.permissions.includes(p);}
 ngOnInit():void{this.academyId=Number(this.route.snapshot.paramMap.get('academyId')||this.route.parent?.snapshot.paramMap.get('academyId'))||0;this.service.capabilities().subscribe({next:c=>{this.cap=c;if(!this.academyId&&!this.studentId&&!c.studentIds.length)this.academyId=c.academyIds[0]||0;if(!this.studentId&&this.route.snapshot.data['personal'])this.studentId=c.studentIds[0]||0;this.ready=true;this.load();},error:e=>this.fail(e)});}
 ngOnChanges(changes:SimpleChanges):void{if(this.ready&&changes['studentId'])this.load();}
 load():void{this.error='';this.loading=true;const filters:Record<string,string|number|boolean>={page:this.page,pageSize:25};if(this.search)filters['search']=this.search;if(this.styleFilter)filters['styleId']=this.styleFilter;if(this.systemFilter)filters['gradingSystemId']=this.systemFilter;if(this.gradeFilter)filters['gradeLevelId']=this.gradeFilter;if(this.eligibility!=='')filters['eligibility']=this.eligibility==='true';
 forkJoin({students:this.has('grading.student.view')&&(this.academyId||this.studentId)?this.service.students(this.academyId,this.studentId||undefined,filters):of({items:[],total:0,page:1,pageSize:25}),systems:this.has('grading.system.view')&&this.academyId?this.service.systems(this.academyId):of([]),options:this.has('grading.system.view')&&this.academyId?this.service.options(this.academyId):of({styles:[],associations:[],students:[]})}).subscribe({next:r=>{this.rows=r.students.items;this.total=r.students.total;this.systems=r.systems;this.options=r.options;this.loading=false;const id=Number(this.route.snapshot.paramMap.get('systemId'));if(id&&!this.selectedSystem){const s=this.systems.find(x=>x.system.id===id);if(s){this.tab=1;this.showLevels(s.system);}}if(!this.has('grading.student.view'))this.tab=0;},error:e=>this.fail(e)});}
 fail(e:any):void{this.loading=false;this.error=e?.error?.message||'No fue posible cargar los grados. Revisa el alcance autorizado.';}
 selectFilterSystem():void{this.gradeFilter=null;this.filterLevels=[];if(this.systemFilter)this.service.levels(this.systemFilter).subscribe({next:r=>this.filterLevels=r,error:e=>this.fail(e)});}
 apply():void{this.page=1;this.load();}
 paginate(e:PageEvent):void{this.page=e.pageIndex+1;this.load();}
 eligibilityLabel(p:TechnicalProfile):string{if(!this.has('grading.student.view_eligibility'))return 'Sin permiso de elegibilidad';if(!p.isActive)return 'Perfil inactivo';if(!p.currentGrade)return 'Sin grado';if(!p.nextGrade)return 'Último grado';if(!p.nextGrade.isActive)return 'Próximo grado inactivo';if(p.isEligible)return 'Elegible';if(!p.eligibleByTime&&!p.eligibleByClasses)return 'Falta tiempo y clases';return !p.eligibleByTime?'Falta tiempo':'Faltan clases';}
 edit(kind:GradingEditData['kind'],profile?:TechnicalProfile,system?:TechnicalSystem,level?:TechnicalLevel):void{this.dialog.open(GradingEditDialogComponent,{width:'760px',maxWidth:'96vw',data:{kind,academyId:profile?.academyId||this.academyId,permissions:this.cap.permissions,profile,system,level,studentId:this.studentId,systems:this.systems,options:this.options} satisfies GradingEditData}).afterClosed().subscribe(saved=>{if(saved){this.load();if(this.selectedSystem)this.showLevels(this.selectedSystem);if(this.selectedProfile)this.showHistory(this.selectedProfile);}});}
 showLevels(system:TechnicalSystem):void{this.selectedSystem=system;this.service.levels(system.id).subscribe({next:r=>this.levels=r,error:e=>this.fail(e)});}
 toggleSystem(s:TechnicalSystem):void{this.service.write(`grading-systems/${s.id}/active`,{isActive:!s.isActive},'PUT').subscribe({next:()=>this.load(),error:e=>this.fail(e)});}
 toggleLevel(l:TechnicalLevel):void{this.service.write(`grade-levels/${l.id}/active`,{isActive:!l.isActive},'PUT').subscribe({next:()=>this.showLevels(this.selectedSystem!),error:e=>this.fail(e)});}
 move(index:number,direction:number):void{const levels=[...this.levels],target=index+direction;if(target<0||target>=levels.length)return;[levels[index],levels[target]]=[levels[target],levels[index]];this.service.write(`grading-systems/${this.selectedSystem!.id}/levels/order`,{levelIds:levels.map(l=>l.id)},'PUT').subscribe({next:()=>this.showLevels(this.selectedSystem!),error:e=>this.fail(e)});}
 profileActive(p:TechnicalProfile):void{this.service.write(`student-grading-profiles/${p.id}/active`,{isActive:!p.isActive},'PUT').subscribe({next:()=>this.load(),error:e=>this.fail(e)});}
 showHistory(p:TechnicalProfile):void{this.selectedProfile=p;forkJoin({history:this.service.history(p.id),evaluations:this.service.evaluations(p.id)}).subscribe({next:r=>{this.history=r.history;this.evaluations=r.evaluations;},error:e=>this.fail(e)});}
}
