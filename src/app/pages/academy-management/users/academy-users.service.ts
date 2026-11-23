import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export const ACADEMY_USER_ROLES = [
  { value: 'instructor', label: 'Instructor' },
  { value: 'apoderado', label: 'Apoderado' },
  { value: 'alumno', label: 'Alumno' }
] as const;
export const ADMIN_USER_ROLES = [
  { value: 'admin', label: 'Administrador del sistema' },
  { value: 'academy_admin', label: 'Administrador de academia' },
  ...ACADEMY_USER_ROLES
] as const;
export type AcademyUserRole = typeof ADMIN_USER_ROLES[number]['value'];
export interface UserAcademyOption { id: number; name: string; }
export interface AcademyUser {
  id: number;
  personId: number;
  firstName: string;
  lastName: string;
  email: string;
  role: AcademyUserRole;
  isActive: boolean;
}
export interface UserPersonOption {
  id: number;
  firstName: string;
  lastName: string;
  documentNumber: string;
}
export interface NewUserPerson {
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  documentTypeId: number;
  documentNumber: string;
}
export interface CreateAcademyUser {
  personId?: number;
  person?: NewUserPerson;
  email: string;
  password: string;
  role: AcademyUserRole;
}
export interface AcademyUserOptions {
  countryId: number;
  countryName: string;
  documentTypes: { id: number; name: string; code?: string }[];
}
export function userManagementError(error: any): string {
  return error?.error?.message ?? error?.error?.mensaje ??
    (error?.status === 403 ? 'No tienes permiso para administrar los usuarios de esta academia.' :
      'No se pudo completar la operación. Intenta nuevamente.');
}

@Injectable({ providedIn: 'root' })
export class AcademyUsersService {
  constructor(private readonly http: HttpClient) {}
  academies() { return this.http.get<UserAcademyOption[]>(`${environment.apiBaseUrl}/admin/user-academies`); }
  private url(academyId: number): string {
    return `${environment.apiBaseUrl}/academies/${academyId}/users`;
  }
  list(academyId: number) { return this.http.get<AcademyUser[]>(this.url(academyId)); }
  people(academyId: number, search = '') {
    return this.http.get<UserPersonOption[]>(`${this.url(academyId)}/people`, { params: { search } });
  }
  options(academyId: number) {
    return this.http.get<AcademyUserOptions>(`${this.url(academyId)}/options`);
  }
  create(academyId: number, value: CreateAcademyUser) {
    return this.http.post<AcademyUser>(this.url(academyId), value);
  }
  update(academyId: number, userId: number, value: Pick<AcademyUser, 'email' | 'role' | 'isActive'>) {
    return this.http.put<AcademyUser>(`${this.url(academyId)}/${userId}`, value);
  }
}
