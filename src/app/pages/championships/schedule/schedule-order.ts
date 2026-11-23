// Sort only newly generated schedules; saved schedules retain their explicit sequence.
const normalize = (value: unknown): string => String(value ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase();

function modalityOrder(category: any): number {
  // Resolve through the modality linked by modality_id, never the category name.
  const name = normalize(category.modalityName ?? category.ModalityName ?? category.modality?.name ?? category.Modality?.Name);
  const team = /equipo|team/.test(name);
  if (/para[\s-]*(karate|kata)/.test(name)) return 1;
  if (/\bkata\b/.test(name)) return team ? 2 : 0;
  if (/\bkumite\b/.test(name)) return team ? 4 : 3;
  const id = Number(category.modalityId ?? category.ModalityId ?? category.modality_id ?? category.modality?.id ?? category.Modality?.Id);
  return ({ 1: 0, 2: 3, 3: 1, 4: 2, 5: 2, 6: 4, 7: 4, 8: 0, 9: 0, 10: 3, 11: 3, 17: 2 } as Record<number, number>)[id] ?? 5;
}

function age(category: any, end = false): number {
  const value = end ? category.ageEnd ?? category.AgeEnd ?? category.age_end
    : category.ageStart ?? category.AgeStart ?? category.age_start;
  if (value == null || value === '') return Infinity;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : Infinity;
}

function level(category: any): number {
  const name = normalize(category.name ?? category.Name);
  if (/\bnovici[oa]s?\b/.test(name)) return 0;
  if (/\bintermedi[oa]s?\b/.test(name)) return 1;
  if (/\bavanzad[oa]s?\b/.test(name)) return 2;
  if (/\boficial(?:es)?\b/.test(name)) return 3;
  return 4;
}

export function orderScheduleCategories<T>(categories: readonly T[]): T[] {
  return [...categories].sort((a: any, b: any) => modalityOrder(a) - modalityOrder(b)
    || level(a) - level(b)
    || age(a) - age(b)
    || age(a, true) - age(b, true)
    || String(a.code ?? a.Code ?? '').localeCompare(String(b.code ?? b.Code ?? ''), 'es', { numeric: true })
    || Number(a.id ?? a.Id ?? 0) - Number(b.id ?? b.Id ?? 0));
}

export function isScheduleKumite(category: unknown): boolean {
  return [3, 4].includes(modalityOrder(category));
}
