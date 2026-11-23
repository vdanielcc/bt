import { Injectable } from '@angular/core';
import { firstValueFrom, forkJoin, timeout } from 'rxjs';
import { EventInvitationsService } from '../../../pages/championships/invitations/event-invitations.service';
import { ScoreboardApiService } from './scoreboard-api.service';

export interface WkfCategoryOption {
  id: number;
  label: string;
  completed: boolean;
  hasFixture: boolean;
  verified: boolean;
}

@Injectable({ providedIn: 'root' })
export class WkfCategoriesService {
  constructor(private events: EventInvitationsService, private api: ScoreboardApiService) {}

  async load(eventId: number, areaId: number, day = 1): Promise<WkfCategoryOption[]> {
    const { rows, schedule } = await firstValueFrom(forkJoin({
      rows: this.events.getEventCategories(eventId),
      schedule: this.events.getEventSchedule(eventId, day)
    }).pipe(timeout(10000)));
    const areas = schedule?.areas ?? schedule?.Areas ?? schedule?.data?.areas ?? schedule?.Data?.Areas ?? [];
    const area = Array.isArray(areas) ? areas.find((a: any) => Number(a?.areaNumber ?? a?.AreaNumber) === areaId) : undefined;
    const items = area?.items ?? area?.Items ?? [];
    if (!Array.isArray(items)) return [];
    const byId = new Map(rows.map(row => [Number(row.id ?? row.Id ?? row.categoryId ?? row.CategoryId), row]));
    const seen = new Set<number>();
    const options: WkfCategoryOption[] = [];
    for (const item of [...items].sort((a, b) => Number(a.sequence ?? a.Sequence ?? 0) - Number(b.sequence ?? b.Sequence ?? 0))) {
      if (String(item.type ?? item.Type ?? 'category').toLowerCase() !== 'category') continue;
      const id = Number(item.categoryId ?? item.CategoryId), row = byId.get(id);
      if (!row || seen.has(id)) continue;
      const modality = String(row.modalityName ?? row.ModalityName ?? row.modality?.name ?? row.Modality?.Name ?? '').trim().toUpperCase();
      if (!['KATA', 'KUMITE'].includes(modality)) continue;
      seen.add(id);
      options.push({ id, label: [row.code ?? row.Code, row.name ?? row.Name ?? `Categoría ${id}`, modality].filter(Boolean).join(' · '),
        completed: false, hasFixture: Number(row.fixtureVersion ?? row.FixtureVersion ?? 0) > 0, verified: false });
    }
    // Limit concurrent fixture reads. These calls only read saved official fixtures.
    for (let offset = 0; offset < options.length; offset += 3) {
      await Promise.all(options.slice(offset, offset + 3).map(async option => {
        if (!option.hasFixture) return;
        try {
          const context = await firstValueFrom(this.api.getFixtureContext(eventId, areaId, option.id).pipe(timeout(10000)));
          option.completed = context.matches.length > 0 && context.matches.every(match => match.status === 'CONFIRMED');
          option.verified = true;
        } catch { /* An unavailable fixture is never labelled completed. */ }
      }));
    }
    return options;
  }
}
