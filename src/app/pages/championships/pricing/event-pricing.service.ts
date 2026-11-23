import { Injectable } from '@angular/core';
import { TariffHistory, TariffBatch } from './event-pricing.models';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { unwrapApiResponse } from '../../academy-management/services/api-response.util';
import { CompetitorCharge, EnrollmentPriceResult, EventCategoryPricing, EventModalityPricing, EventPriceGroup, EventPriceRule, EventPricingConfiguration, PricingCalculationRequest, PricingSummary } from './event-pricing.models';

@Injectable({ providedIn: 'root' })
export class EventPricingService {
  constructor(private readonly http: HttpClient) {}
  history(id: number, competitorId: number) { return this.http.get<unknown>(`${this.url(id)}/competitors/${competitorId}/history`).pipe(map(unwrapApiResponse<TariffHistory[]>)); }
  recalculate(id: number, reason: string, operationId: string) { return this.http.post<unknown>(`${this.url(id)}/recalculate`, { reason, operationId }).pipe(map(unwrapApiResponse<{ calculated: number; pending: number }>)); }
  recalculateCompetitor(id: number, competitorId: number, reason: string, operationId: string) { return this.http.post<unknown>(`${this.url(id)}/competitors/${competitorId}/recalculate`, { reason, operationId }); }
  batches(id: number, academyId: number) { return this.http.get<unknown>(`${this.url(id)}/batches`, { params: { academyId } }).pipe(map(unwrapApiResponse<TariffBatch[]>)); }
  cancelBatch(id: number, batchId: number) { return this.http.post<unknown>(`${this.url(id)}/batches/${batchId}/cancel`, {}); }
  createBatch(id: number, academyId: number, competitorIds: number[], requestId: string) { return this.http.post<unknown>(`${this.url(id)}/batches`, { academyId, competitorIds, requestId }).pipe(map(unwrapApiResponse<{ id: number; total: number; period: string }>)); }
  private url(eventId: number) { return `${environment.apiBaseUrl}/events/${eventId}/pricing`; }
  getPricing(id: number) { return this.http.get<unknown>(this.url(id)).pipe(map(unwrapApiResponse<EventPricingConfiguration>)); }
  createPricing(id: number, request: EventPriceRule) { return this.http.post<unknown>(this.url(id), request).pipe(map(unwrapApiResponse<EventPriceRule>)); }
  updatePricing(id: number, ruleId: number, request: EventPriceRule) { return this.http.put<unknown>(`${this.url(id)}/${ruleId}`, request).pipe(map(unwrapApiResponse<EventPriceRule>)); }
  deactivatePricing(id: number, ruleId: number) { return this.http.delete<unknown>(`${this.url(id)}/${ruleId}`).pipe(map(unwrapApiResponse<EventPriceRule>)); }
  getGroups(id: number) { return this.http.get<unknown>(`${this.url(id)}/groups`).pipe(map(unwrapApiResponse<EventPriceGroup[]>)); }
  createGroup(id: number, request: EventPriceGroup) { return this.http.post<unknown>(`${this.url(id)}/groups`, request).pipe(map(unwrapApiResponse<EventPriceRule>)); }
  updateGroup(id: number, groupId: number, request: EventPriceGroup) { return this.http.put<unknown>(`${this.url(id)}/groups/${groupId}`, request).pipe(map(unwrapApiResponse<EventPriceRule>)); }
  deleteGroup(id: number, groupId: number) { return this.http.delete<unknown>(`${this.url(id)}/groups/${groupId}`).pipe(map(unwrapApiResponse<EventPriceRule>)); }
  getCategoryPricing(id: number) { return this.http.get<unknown>(`${this.url(id)}/categories`).pipe(map(unwrapApiResponse<EventCategoryPricing[]>)); }
  updateCategoryPricing(id: number, request: EventCategoryPricing[]) { return this.http.put<unknown>(`${this.url(id)}/categories`, request).pipe(map(unwrapApiResponse<EventPriceRule>)); }
  getModalityPricing(id: number) { return this.http.get<unknown>(`${this.url(id)}/modalities`).pipe(map(unwrapApiResponse<EventModalityPricing[]>)); }
  updateModalityPricing(id: number, request: EventModalityPricing[]) { return this.http.put<unknown>(`${this.url(id)}/modalities`, request).pipe(map(unwrapApiResponse<EventPriceRule>)); }
  calculate(id: number, categoryIds: number[], options: Omit<PricingCalculationRequest, 'categoryIds'> = {}) { return this.http.post<unknown>(`${this.url(id)}/calculate`, { ...options, categoryIds }).pipe(map(unwrapApiResponse<EnrollmentPriceResult>)); }
  getCompetitorCharge(id: number, competitorId: number) { return this.http.get<unknown>(`${environment.apiBaseUrl}/events/${id}/competitors/${competitorId}/charge`).pipe(map(unwrapApiResponse<CompetitorCharge>)); }
  summary(id: number) { return this.http.get<unknown>(`${this.url(id)}/summary`).pipe(map(unwrapApiResponse<PricingSummary>)); }
}
