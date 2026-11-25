import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { EventInvitation } from './event-invitation.model';
import { SaveFixtureVersion } from './fixture.model';
import { eventPosterUrl } from '../event-poster-url';
import { AuthService } from '../../../core/auth/auth.service';

export interface FixtureCompetitorProfile {
  competitorId: number; studentId: number | null; teamId: number | null; name: string; academy: string;
  country?: string | null; gender?: string | null; birthDate?: string | null;
  weight?: number | null; height?: number | null; level?: string | null;
  documentType?: string | null; documentNumber?: string | null;
  modalities: string[]; members: string[];
}

@Injectable({ providedIn: 'root' })
export class EventInvitationsService {
  private readonly apiUrl = `${environment.apiBaseUrl}/Events`;

  constructor(private readonly http: HttpClient, private readonly auth: AuthService) {}

  getEvents(): Observable<EventInvitation[]> {
    return this.http.get<unknown>(this.apiUrl).pipe(
      map((response: any) => {
        const payload = response?.data ?? response?.Data ?? response;
        const events = Array.isArray(payload)
          ? payload
          : payload?.events ?? payload?.Events ?? [];

        return events.map((event: any) => this.mapEvent(event));
      })
    );
  }

  getUpcomingEvents(): Observable<EventInvitation[]> {
    const headers = new HttpHeaders({
      'X-FRONT': environment.frontAccessKey
    });

    return this.http.get<unknown>(`${this.apiUrl}/upcoming`, { headers }).pipe(
      map((response: any) => {
        const payload = response?.data ?? response?.Data ?? response;
        const events = Array.isArray(payload)
          ? payload
          : payload?.events ?? payload?.Events ?? [];

        return events.map((event: any) => this.mapEvent(event));
      })
    );
  }

  getEvent(id: number): Observable<EventInvitation> {
    return this.http
      .get<any>(`${this.apiUrl}/${id}`)
      .pipe(
        map((response) =>
          this.mapEvent(response?.data ?? response?.Data ?? response)
        )
      );
  }

  getEventSummary(eventId: number, academyId: number): Observable<any> {
    return this.http
      .get<any>(`${environment.apiBaseUrl}/Events/detalle`, {
        params: { eventId, academyId }
      })
      .pipe(map((response) => response?.data ?? response?.Data ?? response));
  }

  getEventCategories(eventId: number): Observable<any[]> {
    return this.http
      .get<any>(
        `${environment.apiBaseUrl}/Categories/by-event-with-fixture-info`,
        { params: { eventId } }
      )
      .pipe(map((response) => this.asArray(response)));
  }

  getEventSchedule(eventId: number, day = 1): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/${eventId}/schedule`, { params: { day } })
      .pipe(map((response) => response?.data ?? response?.Data ?? response));
  }

  saveEventSchedule(eventId: number, schedule: any): Observable<any> {
    return this.http
      .put<any>(`${this.apiUrl}/${eventId}/schedule`, schedule)
      .pipe(map((response) => response?.data ?? response?.Data ?? response));
  }

  getCategory(id: number): Observable<any> {
    return this.http
      .get<any>(`${environment.apiBaseUrl}/Categories/${id}`)
      .pipe(map((response) => response?.data ?? response?.Data ?? response));
  }

  getCategoryWithCompetitors(
    eventId: number,
    categoryId: number
  ): Observable<any> {
    return this.http
      .get<any>(
        `${environment.apiBaseUrl}/Categories/${eventId}/${categoryId}/categoria-con-deportistas`
      )
      .pipe(map((response) => response?.data ?? response?.Data ?? response));
  }

  generateFixture(eventId: number, categoryId: number): Observable<any> {
    return this.getLatestFixture(eventId, categoryId);
  }

  changeFixtureType(eventId: number, categoryId: number, fixtureType: string, expectedType: string): Observable<any> {
    return this.http.put<any>(`${environment.apiBaseUrl}/Events/${eventId}/Categories/${categoryId}/fixtures/type`, { fixtureType, expectedType })
      .pipe(map(response => response?.data ?? response?.Data ?? response));
  }

  refreshFixture(eventId: number, categoryId: number): Observable<any> {
    return this.http.post<any>(
      `${environment.apiBaseUrl}/Events/${eventId}/Categories/${categoryId}/fixtures/generate`, {}
    ).pipe(map(response => response?.data ?? response?.Data ?? response));
  }

  getLatestFixture(eventId: number, categoryId: number): Observable<any> {
    const fixtureUrl = `${environment.apiBaseUrl}/Events/${eventId}/Categories/${categoryId}/fixtures`;
    return this.http
      .get<any>(`${fixtureUrl}/latest`)
      .pipe(map((response) => response?.data ?? response?.Data ?? response));
  }

  getStoredFixtureVersion(eventId: number, categoryId: number, version: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${eventId}/Categories/${categoryId}/fixtures/versions/${version}`)
      .pipe(map(response => response?.data ?? response?.Data ?? response));
  }

  saveFixtureVersion(
    eventId: number,
    categoryId: number,
    version: SaveFixtureVersion
  ): Observable<any> {
    return this.http
      .post<any>(
        `${environment.apiBaseUrl}/Events/${eventId}/Categories/${categoryId}/fixtures/versions`,
        version
      )
      .pipe(map((response) => response?.data ?? response?.Data ?? response));
  }

  getAcademies(eventId?: number): Observable<any[]> {
    return this.http.get<any>(eventId
      ? `${environment.apiBaseUrl}/Events/${eventId}/fixture-participants/academies`
      : `${environment.apiBaseUrl}/Academies`)
      .pipe(map(response => this.asArray(response)));
  }

  getAcademyStudents(academyId: number, eventId?: number): Observable<any[]> {
    return this.http
      .get<any>(eventId
        ? `${environment.apiBaseUrl}/Events/${eventId}/fixture-participants/academies/${academyId}/students`
        : `${environment.apiBaseUrl}/Students/academie/${academyId}`)
      .pipe(map((response) => this.asArray(response)));
  }

  getEligibleCategories(
    eventId: number,
    studentId: number,
    role: string
  ): Observable<any[]> {
    return this.http
      .get<any>(`${environment.apiBaseUrl}/Categories/available-categories`, {
        params: {
          studentId,
          eventId,
          rol: role
        }
      })
      .pipe(map((response) => this.asArray(response)));
  }

  getCompetitor(id: number): Observable<any> {
    return this.http.get<any>(`${environment.apiBaseUrl}/Competitors/${id}`)
      .pipe(map(response => response?.data ?? response?.Data ?? response));
  }

  getFixtureCompetitorProfile(eventId: number, competitorId: number): Observable<FixtureCompetitorProfile> {
    return this.http.get<any>(`${this.apiUrl}/${eventId}/fixture-participants/competitors/${competitorId}/profile`)
      .pipe(map(response => response?.data ?? response?.Data ?? response));
  }

  getEventEnrollmentCategories(eventId: number): Observable<any[]> {
    return this.http.get<any>(`${environment.apiBaseUrl}/Categories/${eventId}/categorias-con-deportistas`)
      .pipe(map(response => this.asArray(response)));
  }

  moveCompetitorCategory(eventId: number, competitorId: number, sourceCategoryId: number, targetCategoryId: number): Observable<unknown> {
    return this.http.post(`${environment.apiBaseUrl}/Competitors/${competitorId}/move-category`, {
      eventId, sourceCategoryId, targetCategoryId
    });
  }

  enroll(
    eventId: number,
    studentId: number,
    categoryIds: number[],
    academyId = this.auth.getCurrentUser()?.academieId || undefined,
    closureOverrideReason?: string
  ): Observable<unknown> {
    return this.http.post(`${environment.apiBaseUrl}/Competitors/enroll`, {
      eventId,
      studentId,
      academyId,
      categoryIds, ...(closureOverrideReason ? { closureOverrideReason } : {})
    });
  }

  enrollTeam(eventId: number, teamId: number, categoryIds: number[], closureOverrideReason?: string): Observable<unknown> {
    return this.http.post(`${environment.apiBaseUrl}/Competitors/enroll-team`, {
      eventId, teamId, categoryIds, ...(closureOverrideReason ? { closureOverrideReason } : {})
    });
  }

  getCategoriesWithCompetitors(eventId: number): Observable<any[]> {
    return this.http.get<any>(`${environment.apiBaseUrl}/Categories/by-event`, {
      params: { eventId }
    }).pipe(
      map(response => this.asArray(response)),
      switchMap(categories => categories.length ? forkJoin(categories.map(category => {
        const categoryId = Number(category.id ?? category.Id ?? category.categoryId ?? category.CategoryId);
        return this.http.get<any>(`${environment.apiBaseUrl}/Categories/by-category`, {
          params: { eventId, categoryId }
        }).pipe(
          map(response => {
            const details = response?.data ?? response?.Data ?? response;
            const competitors = this.asArray(details?.competitors ?? details?.Competitors ?? []).map(item => ({
              ...item,
              fullName: item.fullName ?? item.FullName ?? item.nombre ?? item.Nombre ?? '',
              academyName: item.academyName ?? item.AcademyName ?? item.academia ?? item.Academia ?? ''
            }));
            return { ...category, competitors, competitorsError: false };
          }),
          catchError(() => of({ ...category, competitors: [], competitorsError: true }))
        );
      })) : of([]))
    );
  }

  private asArray(response: any): any[] {
    const payload = response?.data ?? response?.Data ?? response;
    return Array.isArray(payload)
      ? payload
      : payload?.items ??
          payload?.Items ??
          payload?.categories ??
          payload?.Categories ??
          [];
  }

  private mapEvent(event: any): EventInvitation {
    return {
      id: Number(event.id ?? event.Id),
      name: event.name ?? event.Name ?? '',
      poster: eventPosterUrl(event.poster ?? event.Poster),
      eventDateCheckin: event.eventDateCheckin ?? event.EventDateCheckin ?? '',
      registrationClosesAtUtc: event.registrationClosesAtUtc ?? event.RegistrationClosesAtUtc,
      presaleEndsAtUtc: event.presaleEndsAtUtc ?? event.PresaleEndsAtUtc,
      canOverrideRegistrationClose: event.canOverrideRegistrationClose ?? event.CanOverrideRegistrationClose ?? false,
      eventDateStart: event.eventDateStart ?? event.EventDateStart,
      eventDateEnd: event.eventDateEnd ?? event.EventDateEnd,
      eventLocation: event.eventLocation ?? event.EventLocation,
      eventAddress: event.eventAddress ?? event.EventAddress,
      eventLinkWaze: event.eventLinkWaze ?? event.EventLinkWaze,
      eventLinkGmaps: event.eventLinkGmaps ?? event.EventLinkGmaps,
      eventLinkOsmaps: event.eventLinkOsmaps ?? event.EventLinkOsmaps,
      eventLinkSrcOsmaps: event.eventLinkSrcOsmaps ?? event.EventLinkSrcOsmaps,
      eventLinkWhatsapp: event.eventLinkWhatsapp ?? event.EventLinkWhatsapp,
      coOrganizerAcademyIds: event.coOrganizerAcademyIds ?? event.CoOrganizerAcademyIds ?? [],
      academyId: Number(
        event.academyId ?? event.AcademyId ?? event.academy?.id ?? 0
      ),
      academyName:
        event.academyName ?? event.AcademyName ?? event.academy?.name ?? '',
      feeTicket: event.feeTicket ?? event.FeeTicket,
      descriptions: event.descriptions ?? event.Descriptions,
      rulesDocument: eventPosterUrl(event.rulesDocument ?? event.RulesDocument),
      eventType:
        event.eventType?.name ??
        event.EventType?.Name ??
        event.eventType ??
        event.EventType ??
        event.type?.name ??
        event.Type?.Name ??
        event.typeEvent ??
        event.TypeEvent,
      associationType:
        event.associationType ??
        event.AssociationType ??
        event.asociationType ??
        event.AsociationType ?? event.asociation_type,
      days: Number(event.days ?? event.Days ?? 1),
      numberOfAreas: Number(event.numberOfAreas ?? event.NumberOfAreas ?? 0),
      maxCategoriesPerRegistration:
        event.maxCategoriesPerRegistration ??
        event.MaxCategoriesPerRegistration,
      factorList: (
        event.factorList ??
        event.FactorList ??
        event.ticketFactors ??
        []
      ).map((factor: any) => ({
        type: factor.type ?? factor.Type ?? '',
        description: factor.description ?? factor.Description ?? '',
        totalCategories: Number(
          factor.totalCategories ?? factor.TotalCategories ?? 0
        ),
        ticketValue: Number(factor.ticketValue ?? factor.TicketValue ?? 0)
      }))
    };
  }
}
