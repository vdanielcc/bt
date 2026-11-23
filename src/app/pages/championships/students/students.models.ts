export interface AcademyStudent {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  birthDate: string;
  documentNumber?: string;
  gender?: string;
  weight?: number;
  height?: number;
  level?: string;
  modalities?: string[];
  phone?: string;
  address?: string;
  bloodType?: string;
}

export interface StudentRequest {
  firstName: string;
  lastName: string;
  weight: number;
  height: number | null;
  birthDate: string;
  gender: string;
  rol: string;
  academiId: number;
  level: string;
  modalities: string[];
  countryId: number;
  documentTypeId: number;
  documentNumber: string;
  documentName: string;
  documentMimeType: string;
  documentSize: number | null;
  documentFile: string;
}

export interface StudentDocumentConfiguration {
  countryId: number;
  countryCode: string;
  countryName?: string;
  documentTypeId: number;
  documentLabel: string;
}

export type StudentDialogMode = 'student' | 'team' | 'attorney' | 'edit';

export interface StudentDialogData {
  mode: StudentDialogMode;
  students: AcademyStudent[];
  student?: AcademyStudent;
  academyId?: number;
  academyName?: string;
  systemAdmin?: boolean;
}

export type StudentUpdateRequest = Omit<StudentRequest, "academiId" | "documentName" | "documentMimeType" | "documentSize" | "documentFile">;
