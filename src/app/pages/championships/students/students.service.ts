import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { AcademyStudent, StudentRequest, StudentDocumentConfiguration, StudentUpdateRequest } from './students.models';

@Injectable({ providedIn: 'root' })
export class StudentsService {
  private readonly apiUrl = environment.apiBaseUrl;

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  get academyId(): number {
    return this.authService.getCurrentUser()?.academieId ?? 0;
  }

  getStudents(): Observable<AcademyStudent[]> {
    return this.http
      .get<unknown>(`${this.apiUrl}/Students/academie/${this.academyId}`)
      .pipe(map((response) => this.mapStudents(this.unwrap(response))));
  }

  getDocumentConfiguration(academyId = this.academyId, studentId?: number): Observable<StudentDocumentConfiguration> {
    return forkJoin({
      configuration: this.http.get<StudentDocumentConfiguration>(
        studentId ? `${this.apiUrl}/admin/students/${studentId}/document-configuration` : `${this.apiUrl}/Academies/${academyId}/student-document`),
      countries: this.authService.getCountries().pipe(catchError(() => of([])))
    }).pipe(map(({ configuration, countries }) => ({
      ...configuration,
      countryName: countries.find(country => country.id === configuration.countryId)?.name
        || configuration.countryName || configuration.countryCode
    })));
  }

  createStudent(request: Omit<StudentRequest, 'academiId'>, academyId = this.academyId, systemAdmin = false): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/${systemAdmin ? 'admin/students' : 'Students'}`, {
      ...request,
      academiId: academyId
    });
  }

  updateStudent(id: number, request: StudentUpdateRequest, systemAdmin = false): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/${systemAdmin ? 'admin/students' : 'Students'}/${id}`, request);
  }

  getStudent(id: number, systemAdmin = false): Observable<AcademyStudent> {
    return this.http.get<unknown>(`${this.apiUrl}/${systemAdmin ? 'admin/students' : 'Students'}/${id}`).pipe(
      map(response => this.mapStudents([this.unwrap(response)])[0])
    );
  }

  deleteStudent(id: number): Observable<unknown> {
    return this.http.request('DELETE', `${this.apiUrl}/Students/${id}`, {
      body: { rol: 'Other', academy_id: this.academyId }
    });
  }

  createTeam(modality: string, studentIds: number[]): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/Teams`, {
      academyId: this.academyId,
      modality,
      teamName: '',
      academyName: '',
      studentIds
    });
  }

  createAttorney(request: Record<string, unknown>): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/Attorneys`, {
      ...request,
      academiId: this.academyId
    });
  }

  private unwrap(response: any): any {
    return response?.data ?? response?.Data ?? response;
  }

  private mapStudents(payload: any): AcademyStudent[] {
    const rows = Array.isArray(payload) ? payload : [];
    return rows.map((item: any) => ({
      id: Number(item.id ?? item.Id ?? item.studentId ?? item.StudentId),
      firstName: item.nombres ?? item.firstName ?? item.FirstName ?? '',
      lastName: item.apellidos ?? item.lastName ?? item.LastName ?? '',
      role: item.rol ?? item.role ?? item.Rol ?? '',
      birthDate: item.fechaNacimiento ?? item.birthDate ?? item.BirthDate ?? '',
      documentNumber: item.documentNumber ?? item.DocumentNumber,
      gender: item.genero ?? item.Genero ?? item.gender ?? item.Gender,
      weight: Number(item.weight ?? item.Weight ?? 0),
      height: Number(item.height ?? item.Height ?? 0),
      level: item.level ?? item.Level,
      modalities: item.modalities ?? item.Modalities,
      phone: item.phone ?? item.Phone,
      address: item.address ?? item.Address,
      bloodType: item.bloodType ?? item.BloodType
    }));
  }
}
