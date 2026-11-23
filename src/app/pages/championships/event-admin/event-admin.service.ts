import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { unwrapApiResponse } from '../../academy-management/services/api-response.util';

export interface EventUpdate {
  name: string; eventDateStart: string; eventDateEnd: string;
  eventDateCheckin: string | null; presaleEndAt: string | null; eventDateSendBracket: string | null;
  eventAddress: string; eventLocation: string | null; eventLinkWaze: string | null;
  eventLinkGmaps: string | null; eventLinkWhatsapp: string | null;
  coOrganizerAcademyIds?: number[]; academyId: number; typeId: number; communeId: number; feeTicket: number | null;
  exponent: string | null; asociationType: string | null; eventType: string;
  examiner: string | null; exhibitor: string | null; rulesDocument: string | null;
  days?: number;
  maxCategoriesPerRegistration?: number;
  poster: string | null; posterBase64?: string;
  rulesDocumentBase64?: string;
}
export interface AdminEvent extends EventUpdate {
  id: number; status: string; isActive: boolean; numberOfAreas: number;
  numberOfCompetitors: number; descriptions: string | null;
}
export interface EventOption { id: number; name: string; }

@Injectable({ providedIn: 'root' })
export class EventAdminService {
  private readonly api = environment.apiBaseUrl;
  constructor(private readonly http: HttpClient) {}
  list() { return this.http.get<unknown>(`${this.api}/Events`).pipe(map(unwrapApiResponse<EventOption[]>)); }
  get(id: number) { return this.http.get<unknown>(`${this.api}/Events/${id}`).pipe(map(unwrapApiResponse<AdminEvent>)); }
  update(id: number, value: EventUpdate) {
    return this.http.put<void>(`${this.api}/Events/${id}`, value).pipe(
      switchMap(() => value.rulesDocumentBase64 ? this.get(id).pipe(map(saved => {
        if (!saved.rulesDocument || saved.rulesDocument === value.rulesDocument) {
          throw new HttpErrorResponse({ status: 502, error: {
            message: 'La API respondió al guardado, pero no confirmó las bases del evento. El PDF seleccionado se conserva para reintentar.'
          } });
        }
        return undefined;
      })) : of(undefined))
    );
  }
  options() {
    const get = (path: string) => this.http.get<unknown>(`${this.api}/${path}`).pipe(map(unwrapApiResponse<EventOption[]>));
    return forkJoin({ academies: get('Academies'), types: get('Types'), communes: get('Communes') });
  }
}
