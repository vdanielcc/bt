import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule,HttpTestingController } from '@angular/common/http/testing';
import { ClassAttendanceService } from '../services/class-attendance.service';
import { SessionAttendance } from '../models/class-attendance.models';
describe('Attendance bulk API contract',()=>{
 let api:ClassAttendanceService;let http:HttpTestingController;
 beforeEach(()=>{TestBed.configureTestingModule({imports:[HttpClientTestingModule]});api=TestBed.inject(ClassAttendanceService);http=TestBed.inject(HttpTestingController);});afterEach(()=>http.verify());
 it('sends a single versioned bulk with academy local times and no actor field',()=>{
  const snapshot={version:'original',students:[{studentId:1,status:'LATE',checkInTime:'17:05',checkOutTime:'18:00',notes:'Local',expected:true},{studentId:2,status:'PRESENT',expected:false},{studentId:3,status:null,expected:true}]} as SessionAttendance;
  api.saveBulk(5,snapshot).subscribe();const req=http.expectOne(r=>r.url.endsWith('/class-sessions/5/attendance'));
  expect(req.request.method).toBe('PUT');expect(req.request.body).toEqual({version:'original',attendance:[{studentId:1,status:'LATE',checkInTime:'17:05:00',checkOutTime:'18:00:00',notes:'Local'}]});req.flush({data:snapshot});
 });
 it('passes history filters and page without per-student calls',()=>{api.getStudentHistory(9,{classId:2,dateFrom:'2026-10-01',status:'LATE',number:2,size:20}).subscribe();const req=http.expectOne(r=>r.url.endsWith('/students/9/attendance'));expect(req.request.params.get('classId')).toBe('2');expect(req.request.params.get('number')).toBe('2');expect(req.request.params.get('status')).toBe('LATE');req.flush({data:{items:[],total:0,page:2,pageSize:20,totalPages:0}});});
});
