export type SessionStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export interface ClassSessionInstructor { id: number; academyInstructorId: number; name: string; role: 'HEAD_INSTRUCTOR' | 'INSTRUCTOR' | 'ASSISTANT' | 'SUBSTITUTE'; status: string; isActive: boolean; }
export interface ClassSessionListItem {
  id: number; classId: number; academyId: number; classCode: string | null; className: string; trainingModalityName: string;
  scheduleId: number | null; roomId: number | null; roomName: string | null; sessionDate: string; startTime: string; endTime: string;
  status: SessionStatus; notes: string | null; cancellationReason: string | null; attendanceRecorded?: number; expectedStudentsCount: number; instructors: ClassSessionInstructor[];
  timeZone?: string; localDate?: string;
}
export type ClassSessionDetail = ClassSessionListItem;
export interface GenerateClassSessionsRequest { dateFrom: string; dateTo: string; }
export interface GenerateClassSessionsResult { created: number; existing: number; skipped: number; errors: string[]; }
export interface CreateClassSessionRequest { sessionDate: string; startTime: string; endTime: string; roomId: number; notes: string | null; }
export type UpdateClassSessionRequest = CreateClassSessionRequest;
export interface CancelClassSessionRequest { reason: string; }
export interface ClassSessionFilters { dateFrom: string; dateTo: string; classId?: number | null; trainingModalityId?: number | null; roomId?: number | null; instructorId?: number | null; status?: string; }
export interface ClassSessionAgenda { items: ClassSessionListItem[]; timeZone: string; localDate: string; }
export const sessionStatuses: Record<SessionStatus,string> = { SCHEDULED: 'Programada', IN_PROGRESS: 'En curso', COMPLETED: 'Completada', CANCELLED: 'Cancelada' };
export const sessionRoles = { HEAD_INSTRUCTOR: 'Instructor jefe', INSTRUCTOR: 'Instructor', ASSISTANT: 'Asistente', SUBSTITUTE: 'Sustituto' };
