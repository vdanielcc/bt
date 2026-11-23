export const N_PRO_HEADER = 'Number;Name;Club;Length;Weight;Age;Grade;Gender;Category nr.;Category name';

function field(value: unknown): string {
  const text = value == null || value === '' ? '0' : String(value);
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function nProCsv(fixture: any, category: any): string {
  const rows = [N_PRO_HEADER];
  const seen = new Set<number>();
  const gender = String(category.gender ?? category.Gender ?? fixture.gender ?? fixture.Gender ?? '').toLowerCase();
  const categoryNumber = fixture.categoryCode ?? fixture.CategoryCode ?? category.code ?? category.Code ?? 0;
  const categoryName = fixture.categoryName ?? fixture.CategoryName ?? category.name ?? category.Name ?? 0;
  const rounds = [...(fixture.rounds ?? fixture.Rounds ?? [])]
    .sort((a, b) => Number(a.number ?? a.Number) - Number(b.number ?? b.Number));
  for (const round of rounds) {
    const matches = [...(round.matches ?? round.Matches ?? [])]
      .sort((a, b) => Number(a.position ?? a.Position) - Number(b.position ?? b.Position));
    for (const match of matches) {
      for (const slot of [match.top ?? match.Top, match.bottom ?? match.Bottom]) {
        const id = Number(slot?.competitorId ?? slot?.CompetitorId);
        const name = slot?.name ?? slot?.Name;
        if (!Number.isFinite(id) || id <= 0 || seen.has(id) || /^(bye|bay)$/i.test(String(name ?? '').trim())) continue;
        seen.add(id);
        rows.push([
          match.matchNumber ?? match.MatchNumber ?? 0,
          name,
          slot.academyName ?? slot.AcademyName,
          slot.length ?? slot.Length ?? slot.height ?? slot.Height ?? 0,
          slot.weight ?? slot.Weight ?? 0,
          slot.age ?? slot.Age ?? 0,
          slot.grade ?? slot.Grade ?? 0,
          gender === 'male' ? 'M' : gender === 'female' ? 'F' : 0,
          categoryNumber, categoryName
        ].map(field).join(';'));
      }
    }
  }
  return rows.join('\r\n') + '\r\n';
}
