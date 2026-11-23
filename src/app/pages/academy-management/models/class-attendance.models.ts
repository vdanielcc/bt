import { ClassSessionDetail } from './class-session.models';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
export const attendanceStatuses: {value: AttendanceStatus; label: string}[] = [
  {value:'PRESENT',label:'Presente'}, {value:'ABSENT',label:'Ausente'},
  {value:'LATE',label:'Atrasado'}, {value:'EXCUSED',label:'Justificado'}
];
export const attendanceLabel = (status: string | null): string => attendanceStatuses.find(s => s.value === status)?.label || 'Sin marcar';
export interface SessionAttendanceStudent {
  studentId: number; fullName: string; documentNumber: string | null; attendanceId: number | null;
  status: AttendanceStatus | null; checkInTime: string | null; checkOutTime: string | null; notes: string | null; expected: boolean;
}
export interface SessionAttendance { session: ClassSessionDetail; students: SessionAttendanceStudent[]; version: string; }
export interface AttendanceSummary { completedSessions: number; total: number; present: number; late: number; absent: number; excused: number; attendanceRate: number | null; }
export interface StudentAttendanceHistoryItem { id:number; sessionId:number; classId:number; className:string; sessionDate:string; startTime:string; endTime:string; status:AttendanceStatus; checkInAt:string|null; checkOutAt:string|null; notes:string|null; }
export interface ClassAttendanceHistoryItem { sessionId:number; sessionDate:string; startTime:string; endTime:string; recorded:number; present:number; late:number; absent:number; excused:number; }
export interface AttendancePage<T> {items:T[]; total:number; page:number; pageSize:number; totalPages:number; classes?:{classId:number;className:string}[];}
export interface AttendanceFilters {classId?:number; dateFrom?:string; dateTo?:string; status?:string; number?:number; size?:number;}
