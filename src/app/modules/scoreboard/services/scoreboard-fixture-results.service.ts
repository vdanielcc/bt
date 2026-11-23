import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { MedalIssue } from '../../medal-table/medal-table.service';

export interface FixtureResultRow {
  id: number; label: string; choices: { id: number; name: string }[];
  competitorId: number; totalScore: number | null; tieOrder: number | null;
  decision: string; version: number; individual: boolean; scores: number[];
  operationId?: string; signature?: string;
}
@Injectable({ providedIn: 'root' })
export class ScoreboardFixtureResultsService {
  constructor(private http: HttpClient) {}
  private async get(path: string): Promise<any> {
    const response = await firstValueFrom(this.http.get<any>(`${environment.apiBaseUrl}/${path}`));
    return response?.data ?? response;
  }
  async load(e: number, c: number): Promise<{ name: string; type: string; association: string; rows: FixtureResultRow[] }> {
    const base = `Events/${e}/Categories/${c}/fixtures`;
    const versions = await this.get(`${base}/versions`);
    const version = Math.max(0, ...versions.map((x: any) => Number(x.version)));
    if (!version) throw new Error('La categoría no tiene una llave oficial guardada.');
    const [fixture, results, event] = await Promise.all([this.get(`${base}/versions/${version}`),
      this.get(`medal-tables/${e}/categories/${c}/fixture-results`), this.get(`Events/${e}`)]);
    const rows: FixtureResultRow[] = fixture.rounds.flatMap((round: any) => round.matches.filter((m: any) => !m.isBye &&
      (fixture.fixtureType !== 'KUDOREPECHAGE' || (m.isActive !== false && m.top?.competitorId && m.bottom?.competitorId))).map((m: any) => {
      const choices = [m.top, m.bottom].filter(x => x?.competitorId).map(x => ({ id: Number(x.competitorId), name: x.name }));
      const saved = results.find((r: any) => Number(r.fixtureMatchId) === Number(m.id));
      const individual = choices.length === 1 && ['SOLOPUNTAJE', 'KATAJKA'].includes(fixture.fixtureType) && !m.nextMatchId;
      return { id: Number(m.id), label: `${round.name} · ${m.matchNumber}`, choices,
        competitorId: saved?.competitorId || (individual ? choices[0]?.id : 0),
        totalScore: saved?.totalScore ?? null, tieOrder: saved?.tieOrder ?? null,
        decision: saved?.decision || 'points', version: saved?.version || 0, individual, scores: [] };
    }));
    return { name: fixture.categoryName, type: fixture.fixtureType, association: String(event.asociationType ?? event.associationType ?? event.AsociationType ?? '').trim().toUpperCase(), rows };
  }
  async save(e: number, c: number, row: FixtureResultRow): Promise<MedalIssue[]> {
    const body = { expectedVersion: row.version, competitorId: row.competitorId,
      totalScore: row.totalScore, tieOrder: row.tieOrder, decision: row.decision, scores: row.scores };
    const signature = JSON.stringify(body);
    if (row.signature !== signature) { row.operationId = crypto.randomUUID(); row.signature = signature; }
    const response = await firstValueFrom(this.http.post<{ data: MedalIssue[] }>(
      `${environment.apiBaseUrl}/medal-tables/${e}/categories/${c}/fixtures/${row.id}/result`,
      { ...body, operationId: row.operationId }));
    return response.data;
  }
}
