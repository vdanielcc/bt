import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, switchMap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ScoreboardArea,
  ScoreboardEvent,
  ScoreboardMatchState,
  ScoreboardModality,
  ScoreboardRuleSet,
  ScoreboardSyncOperation
} from '../models/scoreboard.models';

export interface ScoreboardFixtureContext {
  fixtureId: number;
  fixtureVersionId: number;
  fixture: unknown;
  matches: ScoreboardMatchState[];
}

@Injectable({ providedIn: 'root' })
export class ScoreboardApiService {
  private readonly url = `${environment.apiBaseUrl}/v1/scoreboard`;
  constructor(private readonly http: HttpClient) {}
  getEvents(): Observable<ScoreboardEvent[]> {
    return this.http
      .get<unknown>(`${this.url}/events`)
      .pipe(map((r) => this.array(r).map((x) => this.event(x))));
  }
  getEvent(eventId: number): Observable<ScoreboardEvent> {
    return this.http
      .get<unknown>(`${this.url}/events/${eventId}`)
      .pipe(map((r) => this.event(this.data(r))));
  }
  getAreas(eventId: number): Observable<ScoreboardArea[]> {
    return this.http
      .get<unknown>(`${this.url}/events/${eventId}/areas`)
      .pipe(map((r) => this.array(r) as ScoreboardArea[]));
  }
  getMatches(eventId: number): Observable<ScoreboardMatchState[]> {
    return this.http
      .get<unknown>(`${this.url}/events/${eventId}/matches`)
      .pipe(map((r) => this.array(r) as ScoreboardMatchState[]));
  }
  getHistory(eventId: number): Observable<unknown[]> {
    return this.http
      .get<unknown>(`${this.url}/events/${eventId}/history`)
      .pipe(map((r) => this.array(r)));
  }
  getCurrentMatch(
    eventId: number,
    areaId: number,
    categoryId?: number
  ): Observable<ScoreboardMatchState> {
    return this.http
      .get<unknown>(
        `${this.url}/events/${eventId}/areas/${areaId}/current-match`,
        categoryId ? { params: { categoryId } } : undefined
      )
      .pipe(map((r) => this.data(r) as ScoreboardMatchState));
  }
  getNextMatch(
    eventId: number,
    areaId: number,
    categoryId?: number
  ): Observable<ScoreboardMatchState> {
    return this.http
      .get<unknown>(`${this.url}/events/${eventId}/areas/${areaId}/next-match`,
        categoryId ? { params: { categoryId } } : undefined)
      .pipe(map((r) => this.data(r) as ScoreboardMatchState));
  }
  getRuleSet(
    eventId: number,
    modality: ScoreboardModality
  ): Observable<ScoreboardRuleSet> {
    return this.http
      .get<unknown>(`${this.url}/events/${eventId}/rule-set`, {
        params: { modality }
      })
      .pipe(map((r) => this.data(r) as ScoreboardRuleSet));
  }
  getFixtureCurrentMatch(
    eventId: number,
    areaId: number,
    categoryId: number
  ): Observable<ScoreboardMatchState> {
    return forkJoin({
      event: this.http.get<any>(`${environment.apiBaseUrl}/Events/${eventId}`),
      category: this.http.get<any>(`${environment.apiBaseUrl}/Categories/${categoryId}`),
      fixture: this.storedFixture(eventId, categoryId)
    }).pipe(
      map(({ event, category, fixture }) => {
        const eventData = this.data(event);
        const categoryData = this.data(category);
        const fixtureData = this.data(fixture);
        const rounds = fixtureData?.rounds ?? fixtureData?.Rounds ?? [];
        const matches = rounds.flatMap((round: any) => round?.matches ?? round?.Matches ?? []);
        const match = matches.find((item: any) =>
          !(item?.winnerCompetitorId ?? item?.WinnerCompetitorId) &&
          !(item?.isBye ?? item?.IsBye) &&
          (item?.top ?? item?.Top)?.competitorId &&
          (item?.bottom ?? item?.Bottom)?.competitorId
        );
        if (!match) throw new Error('La categoría no tiene combates pendientes con ambos competidores definidos.');
        const top = match.top ?? match.Top;
        const bottom = match.bottom ?? match.Bottom;
        const modalityText = String(
          fixtureData?.modality ?? fixtureData?.Modality ??
          categoryData?.modality?.name ?? categoryData?.Modality?.Name ?? ''
        ).toUpperCase();
        const modality = this.modality(modalityText);
        const durationMs = this.durationMs(categoryData?.matchDuration ?? categoryData?.MatchDuration);
        return {
          matchId: String(match.id ?? match.Id),
          fixtureMatchId: Number(match.id ?? match.Id),
          eventId,
          areaId,
          categoryId,
          categoryName: fixtureData?.categoryName ?? fixtureData?.CategoryName ?? categoryData?.name ?? categoryData?.Name,
          matchNumber: String(match.matchNumber ?? match.MatchNumber ?? ''),
          associationCode: this.association(eventData),
          modality,
          ruleSetId: 0,
          aka: this.competitor(top),
          shiro: this.competitor(bottom),
          timer: {
            durationMs,
            remainingMs: durationMs,
            running: false,
            accumulatedElapsedMs: 0,
            finished: false
          },
          status: 'READY',
          sequence: 0,
          syncStatus: 'SYNCED',
          scores: { AKA: 0, SHIRO: 0 }
        };
      })
    );
  }
  getFixtureContext(
    eventId: number,
    areaId: number,
    categoryId: number
  ): Observable<ScoreboardFixtureContext> {
    return forkJoin({
      event: this.http.get<any>(`${environment.apiBaseUrl}/Events/${eventId}`),
      category: this.http.get<any>(`${environment.apiBaseUrl}/Categories/${categoryId}`),
      fixture: this.storedFixture(eventId, categoryId)
    }).pipe(
      map(({ event, category, fixture }) => {
        const eventData = this.data(event);
        const categoryData = this.data(category);
        const fixtureData = this.data(fixture);
        const rounds = fixtureData?.rounds ?? fixtureData?.Rounds ?? [];
        const modalityText =
          fixtureData?.modality ??
          fixtureData?.Modality ??
          categoryData?.modality?.name ??
          categoryData?.Modality?.Name ??
          '';
        const modality = this.modality(modalityText);
        const durationMs = this.durationMs(
          categoryData?.matchDuration ?? categoryData?.MatchDuration
        );
        const fixtureId = Number(fixtureData?.id ?? fixtureData?.Id ?? 0);
        const fixtureVersionId = Number(
          fixtureData?.currentVersionId ??
            fixtureData?.CurrentVersionId ??
            fixtureData?.versionId ??
            fixtureData?.VersionId ??
            fixtureId
        );
        const matches: ScoreboardMatchState[] = rounds.flatMap(
          (round: any, roundIndex: number) =>
            (round?.matches ?? round?.Matches ?? []).map((match: any) => {
              const top = match.top ?? match.Top;
              const bottom = match.bottom ?? match.Bottom;
              const winner = match.winnerCompetitorId ?? match.WinnerCompetitorId;
              const isBye = Boolean(match.isBye ?? match.IsBye);
              return {
                matchId: String(match.id ?? match.Id),
                fixtureMatchId: Number(match.id ?? match.Id),
                fixtureId,
                fixtureVersionId,
                fixtureType: fixtureData?.fixtureType ?? fixtureData?.FixtureType,
                eventId,
                areaId,
                categoryId,
                categoryName:
                  fixtureData?.categoryName ??
                  fixtureData?.CategoryName ??
                  categoryData?.name ??
                  categoryData?.Name,
                matchNumber: String(match.matchNumber ?? match.MatchNumber ?? ''),
                roundNumber: Number(
                  round?.roundNumber ?? round?.RoundNumber ?? roundIndex + 1
                ),
                roundName: String(
                  round?.stage ??
                    round?.Stage ??
                    round?.name ??
                    round?.Name ??
                    `Ronda ${roundIndex + 1}`
                ),
                associationCode: this.association(eventData),
                modality,
                ruleSetId: 0,
                aka:
                  top?.competitorId ?? top?.CompetitorId
                    ? this.competitor(top)
                    : undefined,
                shiro:
                  bottom?.competitorId ?? bottom?.CompetitorId
                    ? this.competitor(bottom)
                    : undefined,
                timer: {
                  durationMs,
                  remainingMs: durationMs,
                  running: false,
                  accumulatedElapsedMs: 0,
                  finished: false
                },
                status: winner || isBye ? 'CONFIRMED' : 'READY',
                sequence: 0,
                syncStatus: 'SYNCED',
                scores: { AKA: 0, SHIRO: 0 }
              } as ScoreboardMatchState;
            })
        );
        return { fixtureId, fixtureVersionId, fixture: fixtureData, matches };
      })
    );
  }

  sync(
    operations: ScoreboardSyncOperation[]
  ): Observable<{ processedOperationIds: string[] }> {
    return this.http
      .post<unknown>(`${this.url}/sync`, { operations })
      .pipe(map((r) => this.data(r) as { processedOperationIds: string[] }));
  }
  confirmResult(
    eventId: number,
    areaId: number,
    matchId: string,
    result: unknown
  ): Observable<ScoreboardMatchState> {
    return this.http
      .post<unknown>(
        `${this.url}/events/${eventId}/areas/${areaId}/matches/${matchId}/confirm`,
        result
      )
      .pipe(map((r) => this.data(r) as ScoreboardMatchState));
  }
  private data(value: any): any {
    return value?.data ?? value?.Data ?? value;
  }
  private storedFixture(eventId: number, categoryId: number): Observable<any> {
    const base = `${environment.apiBaseUrl}/Events/${eventId}/Categories/${categoryId}/fixtures`;
    return this.http.get<unknown>(`${base}/versions`).pipe(switchMap(response => {
      const versions = this.array(response);
      const version = Math.max(0, ...versions.map(x => Number(x.version ?? x.Version) || 0));
      return version ? this.http.get<unknown>(`${base}/versions/${version}`)
        : throwError(() => new Error('La categoría no tiene una llave oficial guardada.'));
    }));
  }
  private array(value: any): any[] {
    const data = this.data(value);
    return Array.isArray(data) ? data : data?.items ?? data?.Items ?? [];
  }
  private event(x: any): ScoreboardEvent {
    return {
      ...x,
      id: Number(x.id ?? x.Id),
      name: x.name ?? x.Name ?? '',
      poster: x.poster ?? x.Poster ?? '',
      eventDateCheckin: x.eventDateCheckin ?? x.EventDateCheckin ?? '',
      eventDateStart: x.eventDateStart ?? x.EventDateStart,
      associationCode: String(
        x.associationCode ??
          x.AssociationCode ??
          x.associationType ??
          x.AssociationType ??
          x.asociationType ??
          x.AsociationType ??
          ''
      ).toUpperCase(),
      numberOfAreas: Number(x.numberOfAreas ?? x.NumberOfAreas ?? 0),
      status: x.status ?? x.Status,
      areas: x.areas ?? x.Areas ?? []
    };
  }
  private competitor(value: any) {
    return {
      id: Number(value?.competitorId ?? value?.CompetitorId),
      name: value?.name ?? value?.Name ?? '',
      academy: value?.academyName ?? value?.AcademyName ?? ''
    };
  }
  private durationMs(value: unknown): number {
    if (typeof value === 'number') return Math.max(0, value * 1000);
    const parts = String(value ?? '00:03:00').split(':').map(Number);
    if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return 180000;
    return ((parts[0] * 60 + parts[1]) * 60 + parts[2]) * 1000;
  }

  private association(value: any): string {
    return String(
      value?.associationCode ??
        value?.AssociationCode ??
        value?.associationType ??
        value?.AssociationType ??
        value?.asociationType ??
        value?.AsociationType ??
        ''
    )
      .trim()
      .toUpperCase();
  }

  private modality(value: unknown): ScoreboardModality {
    const normalized = String(value ?? '').trim().toUpperCase();
    if (normalized.includes('KUMITE') || normalized === 'KUDO') return 'KUMITE';
    if (normalized.includes('KATA')) return 'KATA';
    throw new Error(`Modalidad Scoreboard no soportada: ${value ?? 'sin modalidad'}`);
  }
}
