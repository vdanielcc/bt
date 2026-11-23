import {GradingCapabilities, TechnicalSystemRead, TechnicalLevel, TechnicalOptions, TechnicalPage, TechnicalHistory, TechnicalEvaluation} from '../models/grading.models';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AcademyStyle,
  CreateEntity,
  GradeLevel,
  GradingSystem,
  MartialArtStyle,
  SportsAssociationOption
} from '../models/academy-management.models';
import { unwrapApiResponse } from './api-response.util';

@Injectable({ providedIn: 'root' })
export class GradingManagementService {
  private readonly api = environment.apiBaseUrl;
  constructor(private readonly http: HttpClient) {}
  capabilities():Observable<GradingCapabilities>{return this.http.get<unknown>(`${this.api}/grading/permissions`).pipe(map(unwrapApiResponse<GradingCapabilities>));}
  systems(academy:number):Observable<TechnicalSystemRead[]>{return this.http.get<unknown>(`${this.api}/academies/${academy}/grading-systems`).pipe(map(unwrapApiResponse<TechnicalSystemRead[]>));}
  options(academy:number):Observable<TechnicalOptions>{return this.http.get<unknown>(`${this.api}/academies/${academy}/grading/options`).pipe(map(unwrapApiResponse<TechnicalOptions>));}
  levels(system:number):Observable<TechnicalLevel[]>{return this.http.get<unknown>(`${this.api}/grading-systems/${system}/levels`).pipe(map(unwrapApiResponse<TechnicalLevel[]>));}
  students(academy:number,student?:number,filters:Record<string,string|number|boolean>={}):Observable<TechnicalPage>{return this.http.get<unknown>(student?`${this.api}/students/${student}/grading`:`${this.api}/academies/${academy}/grading/students`,{params:{...(academy?{academyId:academy}:{}),...filters}}).pipe(map(unwrapApiResponse<TechnicalPage>));}
  history(profile:number):Observable<TechnicalHistory[]>{return this.http.get<unknown>(`${this.api}/student-grading-profiles/${profile}/history`).pipe(map(unwrapApiResponse<TechnicalHistory[]>));}
  evaluations(profile:number):Observable<TechnicalEvaluation[]>{return this.http.get<unknown>(`${this.api}/student-grading-profiles/${profile}/evaluations`).pipe(map(unwrapApiResponse<TechnicalEvaluation[]>));}
  write(path:string,body:unknown,method:'POST'|'PUT'='POST'):Observable<unknown>{return this.http.request(method,`${this.api}/${path}`,{body}).pipe(map(unwrapApiResponse<unknown>));}
  getSportsAssociations(): Observable<SportsAssociationOption[]> {
    return this.http
      .get<unknown>(`${this.api}/SportsAssociations`)
      .pipe(map(unwrapApiResponse<SportsAssociationOption[]>));
  }
  deleteAcademyStyle(academyId: number, id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.api}/academies/${academyId}/styles/${id}`
    );
  }
  getAcademyStyles(academyId: number): Observable<AcademyStyle[]> {
    return this.http
      .get<unknown>(`${this.api}/academies/${academyId}/styles`)
      .pipe(map(unwrapApiResponse<AcademyStyle[]>));
  }
  createAcademyStyle(
    academyId: number,
    value: CreateEntity<AcademyStyle>
  ): Observable<AcademyStyle> {
    return this.http
      .post<unknown>(`${this.api}/academies/${academyId}/styles`, value)
      .pipe(map(unwrapApiResponse<AcademyStyle>));
  }
  updateAcademyStyle(
    academyId: number,
    id: number,
    value: AcademyStyle
  ): Observable<void> {
    return this.http.put<void>(
      `${this.api}/academies/${academyId}/styles/${id}`,
      value
    );
  }
  getMartialArtStyles(): Observable<MartialArtStyle[]> {
    return this.http
      .get<unknown>(`${this.api}/martial-art-styles`)
      .pipe(map(unwrapApiResponse<MartialArtStyle[]>));
  }
  createMartialArtStyle(
    value: CreateEntity<MartialArtStyle>
  ): Observable<MartialArtStyle> {
    return this.http
      .post<unknown>(`${this.api}/martial-art-styles`, value)
      .pipe(map(unwrapApiResponse<MartialArtStyle>));
  }
  updateMartialArtStyle(id: number, value: MartialArtStyle): Observable<void> {
    return this.http.put<void>(`${this.api}/martial-art-styles/${id}`, value);
  }
  deleteMartialArtStyle(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/martial-art-styles/${id}`);
  }
}
