// Compare entrants, not their bracket positions or repeated appearances in later rounds.
export function fixtureRosterChanged(fixture: any, competitors: any[]): boolean {
  const slots = new Map<number, any>();
  for (const round of fixture.rounds ?? fixture.Rounds ?? []) {
    for (const match of round.matches ?? round.Matches ?? []) {
      for (const slot of [match.top ?? match.Top, match.bottom ?? match.Bottom]) {
        const id = Number(slot?.competitorId ?? slot?.CompetitorId);
        if (id > 0) slots.set(id, slot);
      }
    }
  }
  const storedCount = Number(fixture.competitorCount ?? fixture.CompetitorCount ?? slots.size);
  if (storedCount !== competitors.length || slots.size !== competitors.length) return true;
  const identity = (item: any): string => {
    const student = Number(item.studentId ?? item.StudentId);
    if (student > 0) return `student:${student}`;
    // The stored fixture DTO does not expose TeamId; use its team name and club.
    return JSON.stringify([
      String(item.fullName ?? item.FullName ?? item.name ?? item.Name ?? '').trim(),
      String(item.academyName ?? item.AcademyName ?? '').trim()
    ]);
  };
  const current = competitors.map(identity).sort();
  const stored = [...slots.values()].map(identity).sort();
  return current.some((id, index) => id !== stored[index]);
}
