import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, forkJoin, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AcademyDetail {
  id: number; name: string; website: string; address: string; phoneNumber: string;
  logo: string; logoBase64: string; legalRepresentativeId: number;
  sportsAssociationId: number; communeId: number;
}

export interface AcademyOption { id: number; label: string; }

@Injectable({ providedIn: 'root' })
export class AcademyService {
  private readonly api = environment.apiBaseUrl;
  private readonly academyUpdated = new Subject<number>();
  readonly academyUpdated$ = this.academyUpdated.asObservable();
  constructor(private http: HttpClient) {}

  getAcademy(id: number): Observable<AcademyDetail> {
    return this.http.get<any>(`${this.api}/Academies/${id}`).pipe(map((r) => this.mapAcademy(this.unwrap(r))));
  }

  updateAcademy(id: number, academy: AcademyDetail): Observable<unknown> {
    return this.http.put(`${this.api}/Academies/${id}`, academy).pipe(
      tap(() => this.academyUpdated.next(id))
    );
  }

  getOptions(representativeId?: number): Observable<{ representatives: AcademyOption[]; associations: AcademyOption[]; communes: AcademyOption[] }> {
    return forkJoin({
      representatives: this.http.get<unknown>(`${this.api}/LegalRepresentatives${representativeId ? '/' + representativeId : ''}`).pipe(
        map(r => this.options(representativeId ? [this.unwrap(r)] : r, ['fullName', 'FullName', 'name', 'Name']))),
      associations: this.http.get<any>(`${this.api}/SportsAssociations`).pipe(map((r) => this.options(r, ['name', 'Name']))),
      communes: this.http.get<any>(`${this.api}/Communes`).pipe(map((r) => this.options(r, ['name', 'Name'])))
    });
  }

  private unwrap(response: any): any { return response?.data ?? response?.Data ?? response; }
  logoUrl(academy: AcademyDetail): string {
    if (!academy.logo) return '';
    if (/^https?:\/\//i.test(academy.logo)) return academy.logo;
    return this.getLogoUrl(academy.id, academy.logo);
  }
  getLogoUrl(id: number, version: string | number = ''): string {
    return `${this.api}/Academies/${id}/logo?v=${encodeURIComponent(version)}`;
  }
  private rows(response: any): any[] {
    const value = this.unwrap(response);
    return Array.isArray(value) ? value : value?.items ?? value?.Items ?? [];
  }
  private options(response: any, labelKeys: string[]): AcademyOption[] {
    return this.rows(response).map((item) => ({
      id: Number(item.id ?? item.Id),
      label: labelKeys.map((key) => item[key]).find(Boolean) ?? `ID ${item.id ?? item.Id}`
    }));
  }
  private mapAcademy(item: any): AcademyDetail {
    return {
      id: Number(item.id ?? item.Id), name: item.name ?? item.Name ?? '',
      website: item.website ?? item.Website ?? '', address: item.address ?? item.Address ?? '',
      phoneNumber: item.phoneNumber ?? item.PhoneNumber ?? item.phone_number ?? '',
      logo: item.logo ?? item.Logo ?? '', logoBase64: item.logoBase64 ?? item.LogoBase64 ?? '',
      legalRepresentativeId: Number(item.legalRepresentativeId ?? item.LegalRepresentativeId ?? 0),
      sportsAssociationId: Number(item.sportsAssociationId ?? item.SportsAssociationId ?? 0),
      communeId: Number(item.communeId ?? item.CommuneId ?? 0)
    };
  }
}
