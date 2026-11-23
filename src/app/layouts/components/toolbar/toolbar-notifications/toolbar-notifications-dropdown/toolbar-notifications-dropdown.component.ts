import {Component,OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterLink} from '@angular/router';
import {MatButtonModule} from '@angular/material/button';
import {NotificationManagementService,NotificationInbox} from '../../../../../pages/academy-management/services/notification-management.service';
@Component({selector:'vex-toolbar-notifications-dropdown',standalone:true,imports:[CommonModule,RouterLink,MatButtonModule],template:`<section style="padding:20px;max-width:420px;max-height:70vh;overflow:auto"><h3>Notificaciones</h3><p>{{inbox.unreadCount}} sin leer</p><p *ngIf="error">{{error}}</p><article *ngFor="let n of inbox.items" style="padding:12px 0;border-bottom:1px solid #ddd"><small>{{n.academyName||'BTE'}}</small><strong>{{n.title}}</strong><p>{{n.message}}</p><small>{{n.createdAt|date:'short'}}</small><button mat-button *ngIf="!n.readAt" (click)="read(n.id)">Marcar como leída</button></article><p *ngIf="!inbox.items.length">No tienes notificaciones.</p><a mat-button routerLink="/mi-cuenta/notifications">Ver todas y preferencias</a></section>`})
export class ToolbarNotificationsDropdownComponent implements OnInit {
 inbox:NotificationInbox={items:[],total:0,unreadCount:0,page:1,pageSize:25};error='';constructor(private service:NotificationManagementService){}ngOnInit():void{this.load();}load():void{this.service.mine().subscribe({next:r=>this.inbox={...r,items:r.items.slice(0,8)},error:()=>this.error='No fue posible cargar las notificaciones.'});}read(id:number):void{this.service.apiWrite(`notifications/${id}/read`,{}).subscribe({next:()=>this.load(),error:()=>this.error='No fue posible actualizar la notificación.'});}
}
