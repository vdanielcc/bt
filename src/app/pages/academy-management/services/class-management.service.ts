import { ClassSessionAgenda, ClassSessionDetail, ClassSessionFilters, CreateClassSessionRequest, GenerateClassSessionsRequest, GenerateClassSessionsResult } from '../models/class-session.models';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AcademyClass, AcademyClassListItem, AcademyClassRequest, AcademyClassFilters, AcademyClassSummary, ClassStatus, AttendanceItemRequest, BillingPlan, ClassAttendance, ClassBillingPlan, ClassSchedule, ClassSession, CreateEntity } from '../models/academy-management.models';
import { unwrapApiResponse } from './api-response.util';

@Injectable({ providedIn: 'root' })
export class ClassManagementService {
  private readonly api = environment.apiBaseUrl;
  constructor(private readonly http: HttpClient) {}
  getClasses(academyId: number, filters: AcademyClassFilters = {}): Observable<AcademyClassListItem[]> {
    const params: Record<string, string> = {};
    if (filters.search?.trim()) params['search'] = filters.search.trim();
    if (filters.status) params['status'] = filters.status;
    if (filters.trainingModalityId) params['trainingModalityId'] = String(filters.trainingModalityId);
    if (filters.roomId) params['roomId'] = String(filters.roomId);
    return this.http.get<unknown>(`${this.api}/academies/${academyId}/classes`, { params }).pipe(map(unwrapApiResponse<AcademyClassListItem[]>));
  }
  getClassesSummary(academyId: number): Observable<AcademyClassSummary> { return this.http.get<unknown>(`${this.api}/academies/${academyId}/classes/summary`).pipe(map(unwrapApiResponse<AcademyClassSummary>)); }
  createClass(academyId: number, value: AcademyClassRequest): Observable<AcademyClassListItem> { return this.http.post<unknown>(`${this.api}/academies/${academyId}/classes`, value).pipe(map(unwrapApiResponse<AcademyClassListItem>)); }
  getClass(id: number): Observable<AcademyClassListItem> { return this.http.get<unknown>(`${this.api}/classes/${id}`).pipe(map(unwrapApiResponse<AcademyClassListItem>)); }
  updateClass(id: number, value: AcademyClassRequest): Observable<AcademyClassListItem> { return this.http.put<unknown>(`${this.api}/classes/${id}`, value).pipe(map(unwrapApiResponse<AcademyClassListItem>)); }
  changeClassStatus(id: number, status: ClassStatus): Observable<AcademyClassListItem> { return this.http.put<unknown>(`${this.api}/classes/${id}/status`, { status }).pipe(map(unwrapApiResponse<AcademyClassListItem>)); }
  deleteClass(id: number): Observable<void> { return this.http.delete<void>(`${this.api}/classes/${id}`); }
  getSchedules(classId: number): Observable<ClassSchedule[]> { return this.http.get<unknown>(`${this.api}/classes/${classId}/schedules`).pipe(map(unwrapApiResponse<ClassSchedule[]>)); }
  createSchedule(classId: number, value: CreateEntity<ClassSchedule>): Observable<ClassSchedule> { return this.http.post<ClassSchedule>(`${this.api}/classes/${classId}/schedules`, value); }
  updateSchedule(id: number, value: ClassSchedule): Observable<void> { return this.http.put<void>(`${this.api}/class-schedules/${id}`, value); }
  deleteSchedule(id: number): Observable<void> { return this.http.delete<void>(`${this.api}/class-schedules/${id}`); }
  getSessions(classId: number, filters?: { dateFrom?: string; dateTo?: string; status?: string }): Observable<ClassSession[]> { return this.http.get<unknown>(`${this.api}/classes/${classId}/sessions`, { params: { ...(filters?.dateFrom ? { dateFrom: filters.dateFrom } : {}), ...(filters?.dateTo ? { dateTo: filters.dateTo } : {}), ...(filters?.status ? { status: filters.status } : {}) } }).pipe(map(unwrapApiResponse<ClassSession[]>)); }
  generateSessions(classId: number, dateFrom: string, dateTo: string): Observable<unknown> { return this.http.post(`${this.api}/classes/${classId}/sessions/generate`, { dateFrom, dateTo }); }
  updateSessionNotes(id:number,notes:string|null):Observable<ClassSessionDetail> {return this.http.put<unknown>(`${this.api}/class-sessions/${id}/notes`,{notes}).pipe(map(unwrapApiResponse<ClassSessionDetail>));}
  getSession(id: number): Observable<ClassSessionDetail> { return this.http.get<unknown>(`${this.api}/class-sessions/${id}`).pipe(map(unwrapApiResponse<ClassSessionDetail>)); }
  getSessionsByAcademy(academyId: number, filters?: ClassSessionFilters): Observable<ClassSessionAgenda> {
    const params: Record<string,string> = {};
    if (filters) for (const [key,value] of Object.entries(filters)) if (value != null && value !== '') params[key] = String(value);
    return this.http.get<unknown>(`${this.api}/academies/${academyId}/class-sessions`, { params }).pipe(map(unwrapApiResponse<ClassSessionAgenda>));
  }
  generateClassSessions(classId: number, value: GenerateClassSessionsRequest): Observable<GenerateClassSessionsResult> { return this.http.post<unknown>(`${this.api}/classes/${classId}/sessions/generate`, value).pipe(map(unwrapApiResponse<GenerateClassSessionsResult>)); }
  createManualSession(classId: number, value: CreateClassSessionRequest): Observable<ClassSessionDetail> { return this.http.post<unknown>(`${this.api}/classes/${classId}/sessions`, value).pipe(map(unwrapApiResponse<ClassSessionDetail>)); }
  updateSession(id: number, value: CreateClassSessionRequest): Observable<ClassSessionDetail> { return this.http.put<unknown>(`${this.api}/class-sessions/${id}`, value).pipe(map(unwrapApiResponse<ClassSessionDetail>)); }
  addSessionInstructor(id: number, academyInstructorId: number, role: string): Observable<ClassSessionDetail> { return this.http.post<unknown>(`${this.api}/class-sessions/${id}/instructors`, { academyInstructorId, role }).pipe(map(unwrapApiResponse<ClassSessionDetail>)); }
  removeSessionInstructor(id: number): Observable<void> { return this.http.delete<void>(`${this.api}/class-session-instructors/${id}`); }
  getBillingPlans(classId: number): Observable<BillingPlan[]> { return this.http.get<unknown>(`${this.api}/classes/${classId}/billing-plans`).pipe(map(unwrapApiResponse<BillingPlan[]>)); }
  addBillingPlan(classId: number, plan: ClassBillingPlan): Observable<unknown> { return this.http.post(`${this.api}/classes/${classId}/billing-plans`, plan); }
  setDefaultBillingPlan(classId: number, planId: number): Observable<unknown> { return this.http.post(`${this.api}/classes/${classId}/billing-plans/${planId}/default`, {}); }
  removeBillingPlan(classId: number, planId: number): Observable<void> { return this.http.delete<void>(`${this.api}/classes/${classId}/billing-plans/${planId}`); }
}
