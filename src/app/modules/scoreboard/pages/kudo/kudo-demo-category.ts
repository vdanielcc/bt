export interface KudoDemoMatch {
  id: number; label: string; choices: { id: number; name: string }[];
  competitorId?: number; nextId?: number; nextSide?: number;
}

// A fixed demonstration fixture; never used for official competitors or fixtures.
export function kudoDemoCategory(): KudoDemoMatch[] {
  return [
    { id: 1, label: 'Semifinal 1', choices: [{ id: 1, name: 'Deportista 1' }, { id: 2, name: 'Deportista 2' }], nextId: 3, nextSide: 0 },
    { id: 2, label: 'Semifinal 2', choices: [{ id: 3, name: 'Deportista 3' }, { id: 4, name: 'Deportista 4' }], nextId: 3, nextSide: 1 },
    { id: 3, label: 'Final', choices: [] }
  ];
}

export function confirmKudoDemo(matches: KudoDemoMatch[], id: number, winner: number): KudoDemoMatch[] {
  const source = matches.find(m => m.id === id);
  if (!source || source.choices.filter(Boolean).length !== 2 || !source.choices.some(c => c?.id === winner)) throw new Error('Seleccione un ganador del encuentro demo.');
  const target = matches.find(m => m.id === source.nextId);
  if (source.competitorId && source.competitorId !== winner && target?.competitorId) throw new Error('La final ya está confirmada. Reinicie la demo para cambiar la semifinal.');
  const copy = matches.map(m => ({ ...m, choices: [...m.choices] }));
  copy.find(m => m.id === id)!.competitorId = winner;
  if (target) copy.find(m => m.id === target.id)!.choices[source.nextSide!] = source.choices.find(c => c.id === winner)!;
  return copy;
}

export function kudoDemoProgress(matches: KudoDemoMatch[]) {
  const final = matches.find(m => m.id === 3)!;
  const finalists = final.choices.filter(Boolean);
  const awards: { competitorId: number; medal: string; name: string; academy: string }[] = [];
  if (final.competitorId && finalists.length === 2) {
    const add = (id: number, medal: string) => {
      const competitor = matches.flatMap(m => m.choices).find(c => c?.id === id)!;
      awards.push({ competitorId: id, medal, name: competitor.name, academy: 'Demo' });
    };
    add(final.competitorId, 'gold'); add(finalists.find(c => c.id !== final.competitorId)!.id, 'silver');
    for (const semifinal of matches.filter(m => m.nextId === 3)) add(semifinal.choices.find(c => c.id !== semifinal.competitorId)!.id, 'bronze');
  }
  return { complete: awards.length > 0, readyMatchIds: matches.filter(m => !m.competitorId && m.choices.filter(Boolean).length === 2).map(m => m.id), awards };
}
