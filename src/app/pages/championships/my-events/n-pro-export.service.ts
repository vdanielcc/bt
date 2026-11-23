import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { nProCsv } from './n-pro-csv';

@Injectable({ providedIn: 'root' })
export class NProExportService {
  constructor(private readonly http: HttpClient) {}

  async download(eventId: number, categories: any[], all: boolean): Promise<number> {
    const files: Record<string, string> = {};
    let skipped = 0;
    for (const category of categories) {
      const id = Number(category.id ?? category.Id ?? category.categoryId ?? category.CategoryId);
      const base = `${environment.apiBaseUrl}/Events/${eventId}/Categories/${id}/fixtures`;
      try {
        const history = await this.get(`${base}/versions`);
        if (!Array.isArray(history)) throw new Error('Historial de versiones inválido.');
        const version = Math.max(0, ...history.map(item => Number(item.version ?? item.Version) || 0));
        if (!version) {
          if (all) { skipped++; continue; }
          throw new Error('La categoría no tiene una versión de llaves guardada.');
        }
        const [fixture, detail] = await Promise.all([
          this.get(`${base}/versions/${version}`),
          this.get(`${environment.apiBaseUrl}/Categories/${id}`)
        ]);
        if (!(fixture?.rounds ?? fixture?.Rounds)?.length) throw new Error('La versión guardada no contiene rondas.');
        const code = String(fixture.categoryCode ?? fixture.CategoryCode ?? category.code ?? category.Code ?? id)
          .replace(/[^a-zA-Z0-9_-]/g, '_');
        files[`n-pro-${eventId}-${code}-${id}-v${version}.csv`] = nProCsv(fixture, detail);
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'No fue posible consultar la versión guardada.';
        throw new Error(`Categoría ${category.code ?? category.Code ?? id}: ${reason}`);
      }
    }
    const names = Object.keys(files);
    if (!names.length) throw new Error('No hay categorías con versiones guardadas para exportar.');
    if (all) {
      const { zipSync, strToU8 } = await import('fflate');
      const entries: Record<string, Uint8Array> = {};
      for (const name of names) entries[name] = strToU8(files[name]);
      this.save(new Blob([zipSync(entries)], { type: 'application/zip' }), `n-pro-evento-${eventId}.zip`);
    } else {
      this.save(new Blob([files[names[0]]], { type: 'text/csv;charset=utf-8' }), names[0]);
    }
    return skipped;
  }

  private async get(url: string): Promise<any> {
    const response = await firstValueFrom(this.http.get<any>(url));
    return response?.data ?? response?.Data ?? response;
  }

  private save(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = name;
    document.body.appendChild(link);
    link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
