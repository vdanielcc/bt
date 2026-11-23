import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';

export interface MedalAward { competitorId: number; medal: string; academyId?: number; name?: string; }
export interface MedalPodium { categoryId: number; source: string | null; awards: MedalAward[]; published?: boolean; }
export interface MedalRow { academyId: number; name: string; logo?: string; gold: number; silver: number; bronze: number; total: number; }
export interface MedalIssue { categoryId: number; status: string; message: string; }
export interface MedalState {
  event: { id: number; name: string; eventDateStart: string; eventDateEnd: string; };
  revision: number; isPublic: boolean; bronzeCount: number; ranking: MedalRow[]; podiums: MedalPodium[];
  categories: { categoryId: number; name: string; }[] | null;
  entrants: { categoryId: number; competitorId: number; name: string; academyId: number; academyName: string; communeId: number; }[] | null;
  issues?: MedalIssue[]; serverConfirmedAt: string;
}
export interface MedalBackup {
  formatVersion: number; eventId: number; exportedAt: string; revision: number;
  isPublic: boolean; bronzeCount: number; podiums: { categoryId: number; awards: MedalAward[]; }[];
}

@Injectable({ providedIn: 'root' })
export class MedalTableService {
  readonly url = `${environment.apiBaseUrl}/medal-tables`;
  constructor(private http: HttpClient, private auth: AuthService) {}
  async get<T>(path: string): Promise<T> {
    const response = await firstValueFrom(this.http.get<{ data: T }>(`${this.url}/${path}`));
    return response.data;
  }
  async write<T>(eventId: number, path: string, revision: number, payload: object = {}, method = 'POST'): Promise<T> {
    const response = await firstValueFrom(this.http.request<{ data: T }>(method, `${this.url}/${eventId}/${path}`, {
      body: { ...payload, expectedRevision: revision, operationId: crypto.randomUUID() }
    }));
    return response.data;
  }
  async cache(eventId: number, state: MedalState): Promise<void> {
    const user = this.auth.getCurrentUser();
    if (!user) return;
    const backup = await this.get<MedalBackup>(`${eventId}/backup`);
    if (backup.revision !== state.revision) throw new Error('El medallero cambió durante el respaldo. Actualice para obtener una copia consistente.');
    // Offline management is disabled; the enrollment catalog is not necessary
    // for displaying or exporting a backup and can otherwise exhaust storage.
    try { localStorage.setItem(this.key(eventId), JSON.stringify({ state: { ...state, entrants: [] }, backup })); }
    catch { throw new Error('No hay espacio local para conservar el respaldo sin conexión.'); }
  }
  local(eventId: number): { state: MedalState; backup: MedalBackup } | null {
    if (!this.auth.getCurrentUser()) return null;
    try {
      const value = JSON.parse(localStorage.getItem(this.key(eventId)) || 'null');
      return value?.backup?.eventId === eventId && value?.state?.event?.id === eventId ? value : null;
    } catch { return null; }
  }
  purge(eventId: number): void { localStorage.removeItem(this.key(eventId)); }
  logo(academyId: number, version: string): string { return `${environment.apiBaseUrl}/Academies/${academyId}/logo?v=${encodeURIComponent(version)}`; }
  token(): string { return this.auth.getCurrentUser()?.token || ''; }
  async communes(): Promise<{ id: number; name: string }[]> {
    const response = await firstValueFrom(this.http.get<any>(`${environment.apiBaseUrl}/Communes`));
    return Array.isArray(response) ? response : response.data || [];
  }
  download(value: Blob, name: string): void {
    const url = URL.createObjectURL(value); const a = document.createElement('a');
    a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  private key(id: number): string {
    return `bte.medals.v1.${this.auth.getCurrentUser()?.id}.${id}`;
  }
}
