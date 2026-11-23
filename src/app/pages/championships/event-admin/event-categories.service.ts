import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { unwrapApiResponse } from '../../academy-management/services/api-response.util';
export interface AdminCategoryUpdate {
  name: string; code: string; gender: string; fixtureType: string; ageStart: number; ageEnd: number;
  isOpen: boolean | null; weightStart: number | null; weightEnd: number | null; typeId: number;
  modalityId: number; isFree: boolean; sort: number; maxCompetitors: number; matchDuration: string;
  confirmSharedUpdate?: boolean;
  thirdPlacePlayoff?: boolean;
}
export interface AdminCategory extends AdminCategoryUpdate { id: number; sharedEventCount: number; }
export interface CategoryOption { id: number; name: string; }
export interface CategoryConfiguration { eventName: string; categories: AdminCategory[]; types: CategoryOption[]; modalities: CategoryOption[]; }
@Injectable({providedIn:'root'})
export class EventCategoriesService {
  private readonly http=inject(HttpClient);
  private url(eventId:number) { return `${environment.apiBaseUrl}/admin/events/${eventId}/categories`; }
  get(eventId:number) { return this.http.get<unknown>(this.url(eventId)).pipe(map(unwrapApiResponse<CategoryConfiguration>)); }
  update(eventId:number,categoryId:number,value:AdminCategoryUpdate) { return this.http.put<void>(`${this.url(eventId)}/${categoryId}`,value); }
}
