import type { jsPDF } from 'jspdf';

export function kataJkaPages(rounds: any[]): { round: any; matches: any[] }[][] {
  if (!rounds.length) return [];
  // Three columns fit up to ten opening encounters on the existing landscape sheet.
  // Decide this before pool assignment, including stored fixtures edited by the admin.
  if (rounds.length <= 3 && rounds.every(round => round.matches.length <= 10))
    return [rounds.map(round => ({ round, matches: round.matches }))];
  const owner = new Map<number, number>();
  const finals = rounds[rounds.length - 1].matches;
  finals.forEach((match: any, i: number) => owner.set(match.id, i));
  for (let r = rounds.length - 2; r >= 0; r--) for (const match of rounds[r].matches) {
    const target = owner.get(match.nextMatchId);
    if (target !== undefined) owner.set(match.id, target);
  }
  // Keep each qualifier and its official elimination branch together in its pool.
  const groups: number[][] = [];
  const weight = (ids: number[]) => Math.max(...rounds.map(round => round.matches.filter((m: any) => ids.includes(owner.get(m.id)!)).length));
  const split = (ids: number[]) => {
    if (weight(ids) <= 10 || ids.length <= 1) { groups.push(ids); return; }
    let cut = 1;
    for (let i = 2; i < ids.length; i++)
      if (Math.abs(weight(ids.slice(0, i)) - weight(ids.slice(i))) < Math.abs(weight(ids.slice(0, cut)) - weight(ids.slice(cut)))) cut = i;
    split(ids.slice(0, cut)); split(ids.slice(cut));
  };
  split(finals.map((_: any, i: number) => i));
  const pages: ReturnType<typeof kataJkaPages> = [];
  for (const group of groups) for (let phase = 0; phase < rounds.length; phase += 4) {
    const section = rounds.slice(phase, phase + 4).map(round => ({ round, matches: round.matches.filter((m: any) => group.includes(owner.get(m.id)!)) }));
    const count = Math.max(...section.map(s => s.matches.length));
    if (count <= 10) { if (count) pages.push(section.filter(s => s.matches.length)); continue; }
    // Very large branches continue across pools, as in direct elimination.
    const poolCount = Math.ceil(count / 10);
    for (let pool = 0; pool < poolCount; pool++) {
      const page = section.map(s => ({ round: s.round, matches: s.matches.filter((_: any, i: number) => Math.floor(i * poolCount / s.matches.length) === pool) })).filter(s => s.matches.length);
      if (page.length) pages.push(page);
    }
  }
  // Rejoin later phases when they fit together, instead of repeating a small
  // scoring-only page for every earlier pool.
  return Array.from({ length: Math.ceil(rounds.length / 4) }, (_, phase) => {
    const section = rounds.slice(phase * 4, phase * 4 + 4);
    return Math.max(...section.map(round => round.matches.length)) <= 10
      ? [section.map(round => ({ round, matches: round.matches }))]
      : pages.filter(page => Math.floor(rounds.indexOf(page[0].round) / 4) === phase);
  }).flat();
}

// Render only the official saved rounds; score sheets are individual terminal slots.
export function renderKataJkaPdf(doc: jsPDF, rounds: any[], startPage: (pool: number, total: number) => void, finishCategory?: () => void): void {
  const cleanName = (name: unknown): string => /^(bye|bay|libre|ganador encuentro\b.*)$/i.test(String(name ?? '').trim()) ? '' : String(name ?? '');
  const scoringRound = rounds[rounds.length - 1];
  const pages = kataJkaPages(rounds);
  const text = (value: string, x: number, y: number, width: number, size = 7) => {
    doc.setFontSize(size);
    while (doc.getTextWidth(value) > width && size > 5) doc.setFontSize(size -= .25);
    doc.text(value, x, y);
  };
  for (const [part, page] of pages.entries()) {
    startPage(part + 1, pages.length);
    const bodyHeight = finishCategory && part === pages.length - 1 ? 110 : 148;
    const scale = Math.min(1, bodyHeight / (28 * Math.max(...page.map(s => s.matches.length))));
    const width = (rounds.length === 1 ? 155 : 310) / page.length;
    const positions = new Map<number, { x: number; y: number }>();
    page.forEach(({ round, matches }, column) => {
      const x = 10 + width * column;
      const cardWidth = width - 10;
      const scoring = round === scoringRound;
      doc.setFont('helvetica', 'bold'); doc.setTextColor('#111827');
      text(scoring ? 'Puntajes' : `Eliminacion ${round.number}`, x, 42, cardWidth, 10);
      matches.forEach((match, index) => {
        const y = 48 + (index + .5) * bodyHeight / matches.length - 12 * scale;
        // Scale the card content only; page dimensions, orientation and margins stay intact.
        const baseText = text;
        const cardText = (value: string, left: number, top: number, w: number, size = 7) => baseText(value, left, y + (top - y) * scale, w, Math.max(5, size * scale));
        const rect = (left: number, top: number, w: number, h: number, style?: string) => doc.rect(left, y + (top - y) * scale, w, h * scale, style);
        positions.set(match.id, { x, y });
        doc.setFont('helvetica', 'normal'); doc.setTextColor('#64748b');
        text(`${scoring ? 'Deportista' : 'Encuentro'} ${match.matchNumber}`, x, y - 1, cardWidth, 5);
        if (scoring) {
          doc.setDrawColor('#94a3b8'); doc.setFillColor('#ffffff'); rect(x, y, cardWidth, 24, 'FD');
          doc.setTextColor('#111827'); doc.setFont('helvetica', 'bold');
          cardText(cleanName(match.top?.name), x + 2, y + 4, cardWidth - 4);
          doc.setFont('helvetica', 'normal'); doc.setTextColor('#475569');
          cardText(match.top?.academyName ?? match.top?.academy ?? '', x + 2, y + 8, cardWidth - 4, 6);
          for (let judge = 0; judge < 5; judge++) {
            const left = x + judge * cardWidth / 5;
            doc.setFillColor('#f1f5f9'); rect(left, y + 11, cardWidth / 5, 5, 'FD');
            rect(left, y + 16, cardWidth / 5, 8);
            cardText(`J${judge + 1}`, left + 2, y + 14.5, cardWidth / 5 - 3, 7);
          }
        } else {
          [match.top, match.bottom].forEach((side: any, s: number) => {
            const top = y + s * 12;
            const bye = s === 1 && match.isBye;
            doc.setDrawColor(s ? '#cbd5e1' : '#dc2626'); doc.setFillColor(bye ? '#e5e7eb' : '#ffffff');
            rect(x, top, cardWidth, 12, 'FD');
            doc.setFillColor(bye ? '#e5e7eb' : s ? '#f8fafc' : '#dc2626'); rect(x, top, 10, 12, 'FD');
            doc.setTextColor(s ? '#111827' : '#ffffff'); cardText(s ? 'SHIRO' : 'AKA', x + 1, top + 6, 8, 6);
            doc.setTextColor('#111827'); doc.setFont('helvetica', 'bold');
            cardText(cleanName(side?.name), x + 12, top + 4.5, cardWidth - 14);
            doc.setFont('helvetica', 'normal'); doc.setTextColor('#475569');
            cardText(side?.academyName ?? side?.academy ?? '', x + 12, top + 9, cardWidth - 14, 6);
          });
        }
      });
    });
    doc.setDrawColor('#334155'); doc.setLineWidth(.25);
    for (const { matches } of page) for (const match of matches) {
      const from = positions.get(match.id), to = positions.get(match.nextMatchId);
      if (!from || !to || to.x <= from.x) continue;
      const right = from.x + width - 10;
      doc.line(right, from.y + 12 * scale, right + 5, from.y + 12 * scale);
      doc.line(right + 5, from.y + 12 * scale, right + 5, to.y + 12 * scale);
      doc.line(right + 5, to.y + 12 * scale, to.x, to.y + 12 * scale);
    }
    if (part === pages.length - 1) finishCategory?.();
  }
}
