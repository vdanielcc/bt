import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { unwrapApiResponse } from '../../academy-management/services/api-response.util';

export interface EventAssociation { code: string; description: string; }

@Injectable({ providedIn: 'root' })
export class EventAssociationsService {
  private readonly api = `${environment.apiBaseUrl}/EventAssociations`;
  constructor(private readonly http: HttpClient) {}
  list() { return this.http.get<unknown>(this.api).pipe(map(unwrapApiResponse<EventAssociation[]>)); }
  create(value: EventAssociation) { return this.http.post<void>(this.api, value); }
  update(code: string, value: EventAssociation) { return this.http.put<void>(`${this.api}/${encodeURIComponent(code)}`, value); }
}
