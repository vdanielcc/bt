import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { NotificationDashboard, NotificationRule, NotificationTemplate, PagedResult } from '../models/academy-management.models';
import { unwrapApiResponse } from './api-response.util';

@Injectable({ providedIn: 'root' })
export class NotificationManagementService {
  private readonly api = environment.apiBaseUrl;
  constructor(private readonly http: HttpClient) {}
  capabilities():Observable<NotificationCapabilities>{return this.apiGet<NotificationCapabilities>('notifications/permissions');}
  mine(page=1):Observable<NotificationInbox>{return this.apiGet<NotificationInbox>(`me/notifications?page=${page}&pageSize=25`);}
  apiGet<T>(path:string):Observable<T>{return this.get<T>(`${this.api}/${path}`);}
  apiWrite<T=unknown>(path:string,body:unknown,method:'POST'|'PUT'='POST'):Observable<T>{return this.http.request<unknown>(method,`${this.api}/${path}`,{body}).pipe(map(unwrapApiResponse<T>));}
  rules(academyId: number): Observable<NotificationRule[]> { return this.get(`${this.api}/academies/${academyId}/notification-rules`); }
  saveRule(academyId: number, value: NotificationRule): Observable<NotificationRule> {
    const body = { notificationType:value.notificationType, triggerType:value.triggerType, offsetValue:value.offsetValue, offsetUnit:value.offsetUnit, sendEmail:value.sendEmail, sendWhatsapp:value.sendWhatsapp, sendPush:value.sendPush,sendInApp:value.sendInApp??false,includeGuardians:value.includeGuardians??false,isActive:value.isActive };
    return value.id ? this.put(`${this.api}/notification-rules/${value.id}`, body) : this.post(`${this.api}/academies/${academyId}/notification-rules`, body);
  }
  deleteRule(id: number): Observable<void> { return this.http.delete<void>(`${this.api}/notification-rules/${id}`); }
  templates(academyId: number): Observable<NotificationTemplate[]> { return this.get(`${this.api}/academies/${academyId}/notification-templates`); }
  saveTemplate(academyId: number, value: NotificationTemplate): Observable<NotificationTemplate> {
    const body = { notificationType:value.notificationType, channel:value.channel, name:value.name, subjectTemplate:value.subjectTemplate, bodyTemplate:value.bodyTemplate, isActive:value.isActive };
    return value.id ? this.put(`${this.api}/notification-templates/${value.id}`, body) : this.post(`${this.api}/academies/${academyId}/notification-templates`, body);
  }
  deleteTemplate(id: number): Observable<void> { return this.http.delete<void>(`${this.api}/notification-templates/${id}`); }
  dashboard(academyId: number): Observable<NotificationDashboard> { return this.get(`${this.api}/academies/${academyId}/notifications/dashboard`); }
  queue(academyId: number, history = false): Observable<PagedResult<Record<string, unknown>>> { return this.get(`${this.api}/academies/${academyId}/notifications${history ? '/history' : ''}?number=1&size=100`); }
  retry(deliveryId: number): Observable<unknown> { return this.post(`${this.api}/notification-deliveries/${deliveryId}/retry`, {}); }
  private get<T>(url:string):Observable<T>{return this.http.get<unknown>(url).pipe(map(unwrapApiResponse<T>));}
  private post<T>(url:string,body:unknown):Observable<T>{return this.http.post<unknown>(url,body).pipe(map(unwrapApiResponse<T>));}
  private put<T>(url:string,body:unknown):Observable<T>{return this.http.put<unknown>(url,body).pipe(map(unwrapApiResponse<T>));}
}

export interface NotificationCapabilities {permissions:string[];academies:{id:number;name:string}[];events:string[];channels:{channel:string;configured:boolean}[];variables:string[];canManageGlobal?:boolean;maxAttempts?:number;}
export interface InboxItem {id:number;title:string;message:string;notificationType:string;academyId:number|null;academyName?:string|null;createdAt:string;readAt:string|null;}
export interface NotificationInbox {items:InboxItem[];total:number;unreadCount:number;page:number;pageSize:number;}
