import { RegistrationCounts } from './registration-counts.component';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { unwrapApiResponse } from '../../academy-management/services/api-response.util';

export interface RegistrationEntry {
  competitorId: number; name: string; isTeam: boolean;
  categories: { id: number; name: string; modalityId?: number; modalityName?: string | null; isCoach?: boolean }[]; amount: number | null;
  isCoach?: boolean; isAthlete?: boolean; sportingRegistrations?: number; coachRegistrations?: number;
  paidAmount?: number | null; balance?: number | null;
}
export interface TransferReceipt { id: number; fileName: string; }
export interface RegistrationTransfer {
  reference: string; amount: number; approved: boolean; createdAt: string; receipts: TransferReceipt[];
  status?: 'PENDING' | 'APPROVED' | 'REJECTED'; reviewReason?: string | null; reviewedAt?: string | null;
  tariffBatchId?: number | null;
}
export interface PaymentAcademy { id: number; name: string; }
export function transferStatus(transfer: RegistrationTransfer): string {
  return transfer.approved ? 'Aprobado' : transfer.status === 'REJECTED' ? 'Rechazado' : 'Pendiente de aprobación';
}
export interface RegistrationSummary extends Partial<RegistrationCounts> {
  eventId: number; eventName: string; academyId: number; academyName: string;
  methodOfPayment: string | null; entries: RegistrationEntry[];
  total: number; pricingComplete: boolean; approvedAmount: number; pendingAmount: number;
  balance: number; transfers: RegistrationTransfer[];
  creditAmount?: number;
  registrationClosesAtUtc?: string | null;
  canOverrideRegistrationClose?: boolean;
}

@Injectable({ providedIn: 'root' })
export class RegistrationSummaryService {
  private readonly url = `${environment.apiBaseUrl}/Payments`;
  constructor(private http: HttpClient) {}
  getOrganizerAcademies(eventId: number) {
    return this.http.get<unknown>(`${this.url}/events/${eventId}/academies`)
      .pipe(map(response => unwrapApiResponse<PaymentAcademy[]>(response)));
  }
  getOrganizerSummary(eventId: number, academyId: number) {
    return this.http.get<unknown>(`${this.url}/events/${eventId}/academies/${academyId}/registration-summary`)
      .pipe(map(response => unwrapApiResponse<RegistrationSummary>(response)));
  }
  review(eventId: number, academyId: number, reference: string, status: 'APPROVED' | 'REJECTED', reason?: string) {
    return this.http.post<unknown>(`${this.url}/events/${eventId}/academies/${academyId}/transfers/${encodeURIComponent(reference)}/review`, { status, reason })
      .pipe(map(response => unwrapApiResponse<RegistrationSummary>(response)));
  }
  getSummary(eventId: number, academyId: number) {
    return this.http.get<unknown>(`${this.url}/registration-summary`, { params: { eventId, academyId } })
      .pipe(map(response => unwrapApiResponse<RegistrationSummary>(response)));
  }
  removeRegistration(eventId: number, competitorId: number, closureOverrideReason?: string) {
    return this.http.delete<unknown>(`${environment.apiBaseUrl}/Competitors/remove`, {
      params: { eventId, competitorId, ...(closureOverrideReason ? { closureOverrideReason } : {}) }
    });
  }
  upload(eventId: number, academyId: number, amount: number, requestId: string, files: File[], tariffBatchId?: number | null) {
    const body = new FormData();
    body.append('eventId', String(eventId)); body.append('academyId', String(academyId));
    body.append('amount', String(amount)); body.append('requestId', requestId);
    if (tariffBatchId) body.append('tariffBatchId', String(tariffBatchId));
    files.forEach(file => body.append('files', file, file.name));
    return this.http.post<unknown>(`${this.url}/transfer`, body);
  }
  download(id: number) { return this.http.get(`${this.url}/${id}/receipt`, { responseType: 'blob' }); }
}
