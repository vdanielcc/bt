import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { StudentGradeHistory, StudentGradingProfile } from '../models/academy-management.models';
import { unwrapApiResponse } from './api-response.util';

@Injectable({ providedIn: 'root' })
export class StudentAcademyProfileService {
  private readonly api = environment.apiBaseUrl;
  constructor(private readonly http: HttpClient) {}
  getStudent(studentId: number): Observable<Record<string, unknown>> { return this.http.get<unknown>(`${this.api}/Students/${studentId}`).pipe(map(unwrapApiResponse<Record<string, unknown>>)); }
}

