import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ClassEnrollment, ClassEnrollmentListItem, CreateClassEnrollmentRequest, UpdateClassEnrollmentRequest, EnrollmentCandidate, ClassInstructorAssignment, ClassInstructorRequest, PagedResult } from '../models/academy-management.models';
import { unwrapApiResponse } from './api-response.util';

@Injectable({ providedIn: 'root' })
export class AcademyOperationsService {
  private readonly api = environment.apiBaseUrl;
  constructor(private readonly http: HttpClient) {}

  getEnrollments(classId: number, page = 1, status = '', search = ''): Observable<PagedResult<ClassEnrollmentListItem>> {
    let params = new HttpParams().set('number', page).set('size', 100);
    if (status) params = params.set('status', status);
    if (search) params = params.set('search', search);
    return this.http.get<unknown>(`${this.api}/classes/${classId}/enrollments`, { params }).pipe(map(unwrapApiResponse<PagedResult<ClassEnrollmentListItem>>));
  }
  enroll(classId: number, value: CreateClassEnrollmentRequest): Observable<ClassEnrollment> {
    return this.http.post<unknown>(`${this.api}/classes/${classId}/enrollments`, value).pipe(map(unwrapApiResponse<ClassEnrollment>));
  }
  updateEnrollment(id: number, value: UpdateClassEnrollmentRequest): Observable<ClassEnrollment> {
    return this.http.put<unknown>(`${this.api}/class-enrollments/${id}`, value).pipe(map(unwrapApiResponse<ClassEnrollment>));
  }
  withdrawEnrollment(id: number): Observable<void> { return this.http.delete<void>(`${this.api}/class-enrollments/${id}`); }

  availableStudents(classId: number, search: string): Observable<EnrollmentCandidate[]> {
    return this.http.get<unknown>(`${this.api}/classes/${classId}/available-students`, { params: { search } }).pipe(map(unwrapApiResponse<EnrollmentCandidate[]>));
  }
  getStudentClasses(studentId: number, page = 1): Observable<PagedResult<ClassEnrollmentListItem>> {
    return this.http.get<unknown>(`${this.api}/students/${studentId}/class-enrollments`, { params: { number: page, size: 20 } }).pipe(map(unwrapApiResponse<PagedResult<ClassEnrollmentListItem>>));
  }

  getClassInstructors(classId: number): Observable<ClassInstructorAssignment[]> {
    return this.http.get<unknown>(`${this.api}/classes/${classId}/instructors`).pipe(map(unwrapApiResponse<ClassInstructorAssignment[]>));
  }
  assignInstructor(classId: number, value: ClassInstructorRequest): Observable<ClassInstructorAssignment> {
    return this.http.post<unknown>(`${this.api}/classes/${classId}/instructors`, value).pipe(map(unwrapApiResponse<ClassInstructorAssignment>));
  }
  updateClassInstructor(id: number, value: ClassInstructorRequest): Observable<ClassInstructorAssignment> {
    return this.http.put<unknown>(`${this.api}/class-instructors/${id}`, value).pipe(map(unwrapApiResponse<ClassInstructorAssignment>));
  }
  removeInstructor(id: number): Observable<void> { return this.http.delete<void>(`${this.api}/class-instructors/${id}`); }

  transitionSession(sessionId: number, action: 'start' | 'complete' | 'cancel', reason = ''): Observable<unknown> {
    return this.http.post<unknown>(`${this.api}/class-sessions/${sessionId}/${action}`, action === 'cancel' ? { reason } : {}).pipe(map(unwrapApiResponse<unknown>));
  }
  generatePerClassBilling(sessionId: number): Observable<unknown> {
    return this.http.post<unknown>(`${this.api}/class-sessions/${sessionId}/billing/generate`, {}).pipe(map(unwrapApiResponse<unknown>));
  }
  getAttendance(studentId: number): Observable<PagedResult<Record<string, unknown>>> {
    return this.http.get<unknown>(`${this.api}/students/${studentId}/attendance`, { params: { number: 1, size: 100 } }).pipe(map(unwrapApiResponse<PagedResult<Record<string, unknown>>>));
  }
  getAttendanceSummary(studentId: number): Observable<Record<string, number>> {
    return this.http.get<unknown>(`${this.api}/students/${studentId}/attendance/summary`).pipe(map(unwrapApiResponse<Record<string, number>>));
  }
}
