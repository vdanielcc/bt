import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AcademyDashboard,
  AcademyInstructor,
  AcademyRoom,
  CreateEntity,
  PersonOption,
  TrainingModality
} from '../models/academy-management.models';
import { unwrapApiResponse } from './api-response.util';

@Injectable({ providedIn: 'root' })
export class AcademyManagementService {
  private readonly api = environment.apiBaseUrl;
  constructor(private readonly http: HttpClient) {}

  getDashboard(academyId: number): Observable<AcademyDashboard> {
    return this.http
      .get<unknown>(`${this.api}/academies/${academyId}/dashboard`)
      .pipe(map(unwrapApiResponse<AcademyDashboard>));
  }
  getTrainingModalities(academyId: number): Observable<TrainingModality[]> {
    return this.http
      .get<unknown>(`${this.api}/academies/${academyId}/training-modalities`)
      .pipe(map(unwrapApiResponse<TrainingModality[]>));
  }
  createTrainingModality(
    academyId: number,
    value: CreateEntity<TrainingModality>
  ): Observable<TrainingModality> {
    return this.http
      .post<unknown>(
        `${this.api}/academies/${academyId}/training-modalities`,
        value
      )
      .pipe(map(unwrapApiResponse<TrainingModality>));
  }
  updateTrainingModality(
    id: number,
    value: TrainingModality
  ): Observable<void> {
    return this.http.put<void>(`${this.api}/training-modalities/${id}`, value);
  }
  deleteTrainingModality(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/training-modalities/${id}`);
  }
  getRooms(academyId: number): Observable<AcademyRoom[]> {
    return this.http
      .get<unknown>(`${this.api}/academies/${academyId}/rooms`)
      .pipe(map(unwrapApiResponse<AcademyRoom[]>));
  }
  createRoom(
    academyId: number,
    value: CreateEntity<AcademyRoom>
  ): Observable<AcademyRoom> {
    return this.http
      .post<unknown>(`${this.api}/academies/${academyId}/rooms`, value)
      .pipe(map(unwrapApiResponse<AcademyRoom>));
  }
  updateRoom(id: number, value: AcademyRoom): Observable<void> {
    return this.http.put<void>(`${this.api}/rooms/${id}`, value);
  }
  deleteRoom(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/rooms/${id}`);
  }
  getInstructors(academyId: number): Observable<AcademyInstructor[]> {
    return this.http
      .get<unknown>(`${this.api}/academies/${academyId}/instructors`)
      .pipe(map(unwrapApiResponse<AcademyInstructor[]>));
  }
  createInstructor(
    academyId: number,
    value: CreateEntity<AcademyInstructor>
  ): Observable<AcademyInstructor> {
    return this.http
      .post<unknown>(`${this.api}/academies/${academyId}/instructors`, value)
      .pipe(map(unwrapApiResponse<AcademyInstructor>));
  }
  updateInstructor(id: number, value: AcademyInstructor): Observable<void> {
    return this.http.put<void>(`${this.api}/instructors/${id}`, value);
  }
  getPersons(): Observable<PersonOption[]> {
    return this.http
      .get<unknown>(`${this.api}/persons`)
      .pipe(map(unwrapApiResponse<PersonOption[]>));
  }
  getInstructorCandidates(
    academyId: number,
    query: string
  ): Observable<PersonOption[]> {
    const params = new HttpParams().set('query', query).set('limit', 25);
    return this.http
      .get<unknown>(
        `${this.api}/academies/${academyId}/instructor-candidates`,
        { params }
      )
      .pipe(map(unwrapApiResponse<PersonOption[]>));
  }
  getInstructor(id: number): Observable<AcademyInstructor> {
    return this.http
      .get<unknown>(`${this.api}/instructors/${id}`)
      .pipe(map(unwrapApiResponse<AcademyInstructor>));
  }
}
