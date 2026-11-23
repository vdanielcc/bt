import {Component,OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import {MatTabsModule} from '@angular/material/tabs';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatPaginatorModule} from '@angular/material/paginator';
import {NotificationManagementService,NotificationCapabilities} from '../services/notification-management.service';
import {NotificationRule,NotificationTemplate} from '../models/academy-management.models';
import {notificationEventLabels} from './notification-inbox.component';
@Component({selector:'bte-notification-management',standalone:true,imports:[CommonModule,FormsModule,MatTabsModule,MatButtonModule,MatFormFieldModule,MatInputModule,MatSelectModule,MatCheckboxModule,MatPaginatorModule],templateUrl:'./notification-management.component.html',styles:[`:host{display:block;padding:24px}h1{font-size:26px}.toolbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:16px 0}.editor{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px;border:1px solid #d1d5db;margin:16px 0}.wide{grid-column:1/-1}.scroll{overflow:auto}table{width:100%;border-collapse:collapse}th,td{padding:12px;text-align:left;border-bottom:1px solid #d1d5db}small{display:block}.error{color:#b91c1c}pre{white-space:pre-wrap}@media(max-width:650px){.editor{grid-template-columns:1fr}}`]})
export class NotificationManagementComponent implements OnInit {
 academyId=0;cap:NotificationCapabilities|null=null;rules:NotificationRule[]=[];templates:NotificationTemplate[]=[];deliveries:any[]=[];summary:any={};total=0;page=1;channel='';status='';type='';from='';to='';error='';saved='';preview:{subject:string;body:string}|null=null;
 template:any=null;rule:any=null;saving=false;
 constructor(private service:NotificationManagementService,private route:ActivatedRoute){}
 has(p:string):boolean{return this.cap?.permissions.includes(p)??false;}
 label(e:string):string{return notificationEventLabels[e]||e;}
 ngOnInit():void{this.academyId=Number(this.route.snapshot.paramMap.get('academyId')||this.route.parent?.snapshot.paramMap.get('academyId'));this.service.capabilities().subscribe({next:c=>{this.cap=c;this.load();},error:e=>this.fail(e)});}
 load():void{this.error='';if(this.has('notification.rule.view'))this.service.rules(this.academyId).subscribe({next:r=>this.rules=r,error:e=>this.fail(e)});if(this.has('notification.template.view'))this.service.templates(this.academyId).subscribe({next:t=>this.templates=t,error:e=>this.fail(e)});if(this.has('notification.delivery.view')){this.service.dashboard(this.academyId).subscribe({next:s=>this.summary=s,error:e=>this.fail(e)});this.loadDeliveries();}}
 loadDeliveries():void{const p=new URLSearchParams({page:String(this.page),pageSize:'25'});if(this.channel)p.set('channel',this.channel);if(this.status)p.set('status',this.status);if(this.type)p.set('type',this.type);if(this.from)p.set('dateFrom',this.from+'T00:00:00Z');if(this.to)p.set('dateTo',this.to+'T23:59:59Z');this.service.apiGet<any>(`academies/${this.academyId}/notification-deliveries?${p}`).subscribe({next:r=>{this.deliveries=r.items;this.total=r.total;},error:e=>this.fail(e)});}
 fail(e:any):void{this.saving=false;this.error=e?.error?.message||'No fue posible completar la operación.';}
 editTemplate(t?:NotificationTemplate):void{this.template=t?{...t}:{id:0,academyId:this.academyId,notificationType:'PAYMENT_CONFIRMED',channel:'IN_APP',name:'',subjectTemplate:'',bodyTemplate:'',isActive:true};this.preview=null;}
 templateBody():any{const t=this.template;return{notificationType:t.notificationType,channel:t.channel,name:t.name,subjectTemplate:t.subjectTemplate||null,bodyTemplate:t.bodyTemplate,isActive:t.isActive};}
 previewTemplate():void{this.service.apiWrite<{subject:string;body:string}>(`academies/${this.academyId}/notification-templates/preview`,this.templateBody()).subscribe({next:p=>this.preview=p,error:e=>this.fail(e)});}
 saveTemplate():void{if(!this.template)return;const t=this.template;this.saving=true;this.service.apiWrite(t.id?`notification-templates/${t.id}`:`academies/${this.academyId}/notification-templates`,this.templateBody(),t.id?'PUT':'POST').subscribe({next:()=>{this.saving=false;this.template=null;this.load();},error:e=>this.fail(e)});}
 editRule(r?:NotificationRule):void{this.rule=r?{...r}:{id:0,academyId:this.academyId,notificationType:'PAYMENT_CONFIRMED',triggerType:'PAYMENT_CONFIRMED',offsetValue:0,offsetUnit:'MINUTES',sendEmail:false,sendWhatsapp:false,sendPush:false,sendInApp:true,includeGuardians:false,isActive:true};}
 setEvent():void{this.rule.notificationType=this.rule.triggerType;if(this.rule.triggerType==='CLASS_REMINDER'&&!this.rule.offsetValue){this.rule.offsetValue=60;this.rule.offsetUnit='MINUTES';}}
 saveRule():void{this.saving=true;this.service.saveRule(this.academyId,this.rule).subscribe({next:()=>{this.saving=false;this.rule=null;this.load();},error:e=>this.fail(e)});}
 retry(id:number):void{this.service.retry(id).subscribe({next:()=>this.loadDeliveries(),error:e=>this.fail(e)});}
 configured(c:string):boolean{return this.cap?.channels.some(x=>x.channel===c&&x.configured)??false;}
}
