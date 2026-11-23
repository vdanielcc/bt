import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface StudentAcademyOption { id: number; name: string; }
export type StudentSearchCriterion = 'documentNumber' | 'firstName' | 'lastName';
export interface ManagedStudent {
  id: number; firstName: string; lastName: string; documentNumber: string;
  academies: StudentAcademyOption[];
}
export interface StudentSearchResults { items: ManagedStudent[]; total: number; page: number; pageSize: number; }

@Injectable({ providedIn: 'root' })
export class StudentManagementService {
  private readonly url = `${environment.apiBaseUrl}/admin/students`;
  constructor(private readonly http: HttpClient) {}
  getAcademies() { return this.http.get<StudentAcademyOption[]>(`${this.url}/academies`); }
  search(criterion: StudentSearchCriterion, query: string, academyId: number | null, page = 1) {
    let params = new HttpParams().set('criterion', criterion).set('query', query).set('page', page).set('pageSize', 25);
    if (academyId !== null) params = params.set('academyId', academyId);
    return this.http.get<StudentSearchResults>(`${this.url}/search`, { params });
  }
  move(studentId: number, sourceAcademyId: number, destinationAcademyId: number) {
    return this.http.post<{ message: string }>(`${this.url}/${studentId}/move`, { sourceAcademyId, destinationAcademyId });
  }
}
