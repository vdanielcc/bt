import {Component,Inject,OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {MAT_DIALOG_DATA,MatDialogModule,MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {finalize} from 'rxjs';
import {GradingManagementService} from '../services/grading-management.service';
import {TechnicalSystem,TechnicalLevel,TechnicalOptions,TechnicalProfile,TechnicalSystemRead} from '../models/grading.models';
export interface GradingEditData {kind:'system'|'level'|'profile'|'promote'|'evaluation'|'certificate'|'initial';academyId:number;permissions:string[];system?:TechnicalSystem;level?:TechnicalLevel;profile?:TechnicalProfile;studentId?:number;systems?:TechnicalSystemRead[];options?:TechnicalOptions;}
@Component({selector:'bte-grading-edit',standalone:true,imports:[CommonModule,FormsModule,MatDialogModule,MatButtonModule,MatFormFieldModule,MatInputModule,MatSelectModule,MatCheckboxModule],templateUrl:'./grading-edit-dialog.component.html',styles:[`.fields{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding-top:12px}p,mat-checkbox{grid-column:1/-1}p[role=alert]{color:#b91c1c}@media(max-width:600px){.fields{grid-template-columns:1fr}}`]})
export class GradingEditDialogComponent implements OnInit {
 v:any={code:'',name:'',styleId:null,sportsAssociationId:null,description:null,sortOrder:1,rankType:'OTHER',rankNumber:null,beltName:null,beltColorHex:null,stripeColorHex:null,minimumMonthsInPreviousGrade:0,minimumClasses:0,minimumAge:null};
 levels:TechnicalLevel[]=[];systemId=0;academyStyleId=0;studentId=0;initialLevel:number|null=null;date=new Date().toLocaleDateString('en-CA');evaluationDate='';score:number|null=null;certificate='';notes='';override=false;reason='';error='';saving=false;
 constructor(@Inject(MAT_DIALOG_DATA)public data:GradingEditData,private service:GradingManagementService,private ref:MatDialogRef<GradingEditDialogComponent>){}
 get title():string{return {system:'Sistema de graduación',level:'Nivel de progresión',profile:'Crear perfil técnico',promote:'Promover estudiante',evaluation:'Registrar evaluación',certificate:'Registrar certificado',initial:'Asignar grado inicial'}[this.data.kind];}
 has(p:string):boolean{return this.data.permissions.includes(p);}
 get availableSystems():TechnicalSystemRead[]{const style=this.data.options?.styles.find(s=>s.academyStyleId===this.academyStyleId);return(this.data.systems||[]).filter(s=>s.system.isActive&&s.system.styleId===style?.styleId);}
 ngOnInit():void{this.studentId=this.data.studentId||0;if(this.data.kind==='system'&&this.data.system)this.v={...this.v,...this.data.system};if(this.data.level){this.v={...this.v,...this.data.level};this.notes=this.data.level.description||'';}if(this.data.kind==='initial'&&this.data.profile){this.systemId=this.data.profile.gradingSystemId;this.loadLevels();}if(this.data.kind==='evaluation')this.evaluationDate=this.date;}
 loadLevels():void{this.initialLevel=null;if(this.systemId)this.service.levels(this.systemId).subscribe({next:r=>this.levels=r.filter(l=>l.isActive),error:()=>this.error='No se pudieron cargar los niveles.'});}
 save(valid:boolean):void{if(!valid)return;let path='',body:unknown;let method:'POST'|'PUT'='POST';const p=this.data.profile;const kind=this.data.kind;
 if(kind==='system'){const {code,name,description,styleId,sportsAssociationId}=this.v;body={academyId:this.data.academyId,code,name,description,styleId,sportsAssociationId};path=this.data.system?`grading-systems/${this.data.system.id}`:`academies/${this.data.academyId}/grading-systems`;if(this.data.system)method='PUT';}
 else if(kind==='level'){const {code,name,sortOrder,rankType,rankNumber,beltName,beltColorHex,stripeColorHex,minimumMonthsInPreviousGrade,minimumClasses,minimumAge}=this.v;body={code,name,sortOrder,rankType,rankNumber,beltName,beltColorHex:beltColorHex||null,stripeColorHex:stripeColorHex||null,minimumMonthsInPreviousGrade,minimumClasses,minimumAge,description:this.notes||null};path=this.data.level?`grade-levels/${this.data.level.id}`:`grading-systems/${this.data.system!.id}/levels`;if(this.data.level)method='PUT';}
 else if(kind==='profile'){if(!this.studentId||!this.academyStyleId||!this.systemId){this.error='Selecciona alumno, estilo y sistema.';return;}body={academyId:this.data.academyId,academyStyleId:this.academyStyleId,gradingSystemId:this.systemId,currentGradeLevelId:this.initialLevel,startDate:this.date,notes:this.notes||null};path=`students/${this.studentId}/grading-profiles`;}
 else if(kind==='initial'){body={gradeLevelId:this.initialLevel,date:this.date,notes:this.notes||null};path=`student-grading-profiles/${p!.id}/initial-grade`;}
 else if(kind==='promote'){body={targetGradeLevelId:p!.nextGrade!.id,expectedCurrentGradeLevelId:p!.currentGradeLevelId,promotionDate:this.date,evaluationDate:this.evaluationDate||null,score:this.score,certificateNumber:this.certificate||null,notes:this.notes||null,override:this.override,overrideReason:this.override?this.reason:null};path=`student-grading-profiles/${p!.id}/promote`;}
 else{body={evaluationDate:this.evaluationDate||null,score:this.score,certificateNumber:this.certificate||null,notes:this.notes||null};path=`student-grading-profiles/${p!.id}/${kind==='certificate'?'certificates':'evaluations'}`;}
 this.saving=true;this.error='';this.service.write(path,body,method).pipe(finalize(()=>this.saving=false)).subscribe({next:()=>this.ref.close(true),error:e=>this.error=e?.error?.message||'No fue posible guardar. Actualiza el perfil y vuelve a intentar.'});
 }
}
