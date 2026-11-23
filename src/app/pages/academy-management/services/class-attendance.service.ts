import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { unwrapApiResponse } from './api-response.util';
import { AttendanceFilters, AttendancePage, AttendanceSummary, ClassAttendanceHistoryItem, SessionAttendance, StudentAttendanceHistoryItem } from '../models/class-attendance.models';

@Injectable({providedIn:'root'})
export class ClassAttendanceService {
  private http=inject(HttpClient); private api=environment.apiBaseUrl;
  getSessionAttendance(id:number) {return this.http.get<unknown>(`${this.api}/class-sessions/${id}/attendance`).pipe(map(unwrapApiResponse<SessionAttendance>));}
  initialize(id:number) {return this.http.post<unknown>(`${this.api}/class-sessions/${id}/attendance/initialize`,{}).pipe(map(unwrapApiResponse<SessionAttendance>));}
  saveBulk(id:number,snapshot:SessionAttendance) {
    const localTime=(value:string|null):string|null=>value ? (/^\d{2}:\d{2}$/.test(value) ? value+':00' : value) : null;
    const attendance=snapshot.students.filter(s=>s.expected && s.status).map(({studentId,status,checkInTime,checkOutTime,notes})=>({studentId,status,checkInTime:localTime(checkInTime),checkOutTime:localTime(checkOutTime),notes}));
    return this.http.put<unknown>(`${this.api}/class-sessions/${id}/attendance`,{attendance,version:snapshot.version}).pipe(map(unwrapApiResponse<SessionAttendance>));
  }
  private params(filters:AttendanceFilters) {return Object.fromEntries(Object.entries(filters).filter(([,v])=>v!=null && v!=='').map(([k,v])=>[k,String(v)]));}
  getStudentHistory(id:number,filters:AttendanceFilters={}) {return this.http.get<unknown>(`${this.api}/students/${id}/attendance`,{params:this.params(filters)}).pipe(map(unwrapApiResponse<AttendancePage<StudentAttendanceHistoryItem>>));}
  getStudentSummary(id:number,filters:AttendanceFilters={}) {return this.http.get<unknown>(`${this.api}/students/${id}/attendance/summary`,{params:this.params(filters)}).pipe(map(unwrapApiResponse<AttendanceSummary>));}
  getClassHistory(id:number,filters:AttendanceFilters={}) {return this.http.get<unknown>(`${this.api}/classes/${id}/attendance`,{params:this.params(filters)}).pipe(map(unwrapApiResponse<AttendancePage<ClassAttendanceHistoryItem>>));}
  getClassSummary(id:number,filters:AttendanceFilters={}) {return this.http.get<unknown>(`${this.api}/classes/${id}/attendance-summary`,{params:this.params(filters)}).pipe(map(unwrapApiResponse<AttendanceSummary>));}
}
