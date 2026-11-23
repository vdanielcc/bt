import type { jsPDF } from 'jspdf';
import { renderKataJkaPdf } from './kata-jka-pdf';
import { renderScoreOnlyPdf } from './score-only-pdf';
import { renderPdfResults } from './competition-pdf-results';

const groups = ['Kata individual', 'Para-karate', 'Kata equipo', 'Kumite individual', 'Kumite equipo'];
export function modalityGroup(name: string): number {
  const text = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/para[\s-]*(karate|kata)/.test(text)) return 1;
  if (/^kata\b/.test(text)) return /equipo|team/.test(text) ? 2 : 0;
  if (/^kumite\b/.test(text)) return /equipo|team/.test(text) ? 4 : 3;
  return -1;
}

export function orderedCategories(categories: any[], modalities: any[]): any[] {
  const names = new Map(modalities.map(m => [Number(m.id ?? m.Id), m.name ?? m.Name]));
  return categories.map(c => ({ ...c, pdfGroup: modalityGroup(String(names.get(Number(c.modalityId ?? c.ModalityId)) ?? '')) }))
    .filter(c => Number(c.competitorCount ?? c.CompetitorCount ?? 0) > 0 && c.pdfGroup >= 0)
    .sort((a, b) => a.pdfGroup - b.pdfGroup || String(a.code ?? a.Code ?? '').localeCompare(String(b.code ?? b.Code ?? ''), 'es', { numeric: true }) || Number(a.id ?? a.Id) - Number(b.id ?? b.Id));
}

// Elimination keeps its existing pagination. Independent encounters share one page.
export function fixturePages(rounds: any[], fixtureType = 'ELIMINACION'): { rounds: { round: any; matches: { match: any; slot: number }[] }[] }[] {
  const pages: ReturnType<typeof fixturePages> = [];
  if (fixtureType === 'KUDOREPECHAGE') {
    for (const round of rounds) for (let start = 0; start < round.matches.length; start += 8) {
      pages.push({ rounds: [{ round, matches: round.matches.slice(start, start + 8).map((match: any, slot: number) => ({ match, slot })) }] });
    }
    return pages;
  }
  if (!['ELIMINACION', 'ELIMINACIONKUDO'].includes(fixtureType)) {
    return [{ rounds: rounds.map(round => ({ round,
      matches: round.matches.map((match: any, slot: number) => ({ match, slot })) })) }];
  }
  for (let phase = 0; phase < rounds.length; phase += 4) {
    const section = rounds.slice(phase, phase + 4);
    const slots = Math.max(...section.map((r, i) => r.matches.length * 2 ** i));
    for (let start = 0; start < slots; start += 8) {
      pages.push({ rounds: section.map((round, i) => ({ round, matches: round.matches
        .map((match: any, index: number) => ({ match, slot: index * 2 ** i - start + (2 ** i - 1) / 2 }))
        .filter((m: any) => m.slot >= 0 && m.slot < 8) })) });
    }
  }
  return pages;
}

export function renderTournamentPdf(doc: jsPDF, entries: { category: any; fixture: any }[], eventName: string, budoLogo: string, dojoLogo: string, eventType?: string, associationType?: string): void {
  let pageNumber = 0;
  const fitText = (text: string, x: number, y: number, width: number, size: number, minimum = 5) => {
    doc.setFontSize(size);
    while (doc.getTextWidth(text) > width && size > minimum) doc.setFontSize(size = Math.max(minimum, size - 0.25));
    doc.text(text, x, y);
  };
  const logo = (data: string, x: number) => {
    const image = doc.getImageProperties(data);
    const scale = Math.min(20 / image.width, 20 / image.height);
    doc.addImage(data, 'PNG', x + (20 - image.width * scale) / 2, 8, image.width * scale, image.height * scale);
  };
  for (const { category, fixture } of entries) {
    const kudo = ['ELIMINACIONKUDO', 'KUDOREPECHAGE'].includes(fixture.fixtureType);
    const thirdPlacePlayoff = fixture.fixtureType === 'KUDOREPECHAGE' || Boolean(category.thirdPlacePlayoff ?? category.ThirdPlacePlayoff ?? fixture.thirdPlacePlayoff ?? fixture.ThirdPlacePlayoff ?? false);
    const type = String(eventType ?? fixture.championshipType ?? '').toLowerCase();
    const traditional = ['tradicional', 'jka', 'shotokan', 'shobu ippon'].some(value => type.includes(value));
    const kumite = [3, 4].includes(category.pdfGroup) || [2, 4, 5].includes(Number(category.modalityId ?? category.ModalityId)) || /kumite/i.test(String(fixture.modality ?? category.modality?.name ?? category.Modality?.Name ?? ''));
    const jkaKumite = associationType?.trim().toUpperCase() === 'JKA' && kumite;
    const rounds = [...fixture.rounds].sort((a, b) => a.number - b.number).map(r => ({ ...r, matches: [...r.matches].sort((a, b) => a.position - b.position) }));
    if (fixture.fixtureType === 'SOLOPUNTAJE') {
      renderScoreOnlyPdf(doc, rounds, (part,total) => {
        if(pageNumber++) doc.addPage([330,216], 'landscape');
        logo(budoLogo,10);logo(dojoLogo,300);doc.setTextColor(20);doc.setFont('helvetica','bold');
        fitText(eventName,38,15,252,14);
        fitText(`${fixture.categoryCode ?? category.code ?? category.Code} - ${fixture.categoryName ?? category.name ?? category.Name}`,38,23,252,11);
        doc.setFont('helvetica','normal');doc.setFontSize(9);
        doc.text(`Solo Puntaje - J1 a J5 - Version ${fixture.version} - Hoja ${part}/${total}`,38,30);
        doc.text('https://budotournaments.net/app/',165,207,{align:'center'});
      });
      continue;
    }
    if (fixture.fixtureType === 'KATAJKA') {
      renderKataJkaPdf(doc, rounds, (pool, total) => {
        if (pageNumber++) doc.addPage([330, 216], 'landscape');
        logo(budoLogo, 10); logo(dojoLogo, 300);
        doc.setTextColor(20); doc.setFont('helvetica', 'bold');
        fitText(eventName, 38, 15, 252, 14);
        fitText(`${fixture.categoryCode ?? category.code ?? category.Code} - ${fixture.categoryName ?? category.name ?? category.Name}`, 38, 23, 252, 11);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        doc.text(`Kata JKA: AKA / SHIRO - J1 a J5 - Version ${fixture.version}${total > 1 ? ` - POOL ${pool}` : ''}`, 38, 30);
        doc.text('https://budotournaments.net/app', 165, 207, { align: 'center' });
      }, () => renderPdfResults(doc, thirdPlacePlayoff, true));
      continue;
    }
    const pages = fixturePages(rounds, fixture.fixtureType);
    const matchNumbers = new Map<number, string>(rounds.flatMap(r => r.matches.map((m: any) => [m.id, `R${r.number}-${m.matchNumber}`] as [number, string])));
    pages.forEach((page, part) => {
      if (pageNumber++) doc.addPage([330, 216], 'landscape');
      logo(budoLogo, 10); logo(dojoLogo, 300);
      doc.setTextColor(20); doc.setFont('helvetica', 'bold');
      fitText(eventName, 38, 15, 252, 14);
      fitText(`${fixture.categoryCode ?? category.code ?? category.Code} · ${fixture.categoryName ?? category.name ?? category.Name}`, 38, 23, 252, 11);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.text(`${groups[category.pdfGroup] ?? fixture.modality ?? category.modality?.name ?? category.name ?? ''} · Versión ${fixture.version} · POOL ${part + 1}`, 38, 30);
      const independent = fixture.fixtureType === 'KUDOREPECHAGE' || fixture.fixtureType === 'ROUNDROBIN' || fixture.fixtureType === 'MEJORDETRES';
      const lastPage = part === pages.length - 1;
      const finalRound = rounds[rounds.length - 1];
      const attachedWinner = !independent && finalRound.matches.length === 1 && page.rounds.some(section => section.round === finalRound && section.matches.length);
      const columns = independent ? Math.min(3, page.rounds.length) : page.rounds.length + (attachedWinner ? 1 : 0);
      const gridRows = independent ? Math.ceil(page.rounds.length / columns) : 1;
      const cellHeight = (lastPage ? 110 : 160) / gridRows;
      const scale = independent ? Math.min(1, cellHeight / (10 + 18.5 * Math.max(1, ...page.rounds.map(r => r.matches.length)))) : Math.min(1, cellHeight / (10 + 18.5 * Math.max(1, ...page.rounds.flatMap(r => r.matches.map(m => m.slot + 1)))));
      const columnWidth = 310 / columns;
      const positions = new Map<number, { x: number; y: number }>();
      page.rounds.forEach(({ round, matches }, col) => {
        const x = 10 + (independent ? col % columns : col) * columnWidth;
        const headingY = 42 + (independent ? Math.floor(col / columns) * cellHeight : 0);
        doc.setFontSize(10); doc.setTextColor(20);
        if (independent) fitText(String(round.name), x + 2, headingY, columnWidth - 9, 10 * scale, 5 * scale);
        else doc.text(String(round.name), x + 2, 42);
        matches.forEach(({ match, slot }) => {
          const y = headingY + 5 * scale + slot * 18.5 * scale;
          positions.set(match.id, { x, y });
          doc.setTextColor(80); doc.setFontSize(5 * scale);
          const next = matchNumbers.get(match.nextMatchId);
          doc.text(`Encuentro R${round.number}-${match.matchNumber ?? ''}${next ? ` / Sigue en ${next}` : ''}`, x, y - 0.5 * scale);
          [match.top, match.bottom].forEach((position: any, side) => {
            const top = y + side * 8.4 * scale;
            const corner = kudo ? (side ? 'SHIRO' : 'AO') : side ? (jkaKumite || traditional ? 'SHIRO' : 'AO') : 'AKA';
            const lightCorner = Boolean(side && (kudo || traditional || jkaKumite));
            const color = side ? (lightCorner ? '#f8fafc' : '#0957d9') : kudo ? '#0957d9' : '#dc2626';
            const empty = !position?.competitorId && (round === rounds[0] || Boolean(match.winnerCompetitorId));
            doc.setFillColor(empty ? '#e5e7eb' : '#ffffff');
            doc.setDrawColor(empty ? '#cbd5e1' : color); doc.setLineWidth(0.3);
            doc.rect(x, top, columnWidth - 9, 8.4 * scale, 'FD');
            doc.setFillColor(empty ? '#9ca3af' : color); doc.rect(x, top, 8 * scale, 8.4 * scale, 'F');
            if (!empty && lightCorner) {
              doc.setDrawColor('#94a3b8'); doc.line(x + 8 * scale, top, x + 8 * scale, top + 8.4 * scale);
            }
            doc.setTextColor(empty ? '#f8fafc' : lightCorner ? '#111827' : '#ffffff');
            doc.setFontSize(5.5 * scale); doc.text(corner, x + scale, top + 4.8 * scale);
            doc.setTextColor(20); doc.setFont('helvetica', 'bold');
            const sourceNumber = side ? match.bottomSourceNumber : match.topSourceNumber;
            const sourceResult = side ? match.bottomSourceResult : match.topSourceResult;
            const name = position?.name || (sourceNumber ? `${sourceResult === 'loser' ? 'Perdedor' : 'Ganador'} combate ${sourceNumber}` : '');
            fitText(!position?.competitorId && /^(bye|bay)$/i.test(name.trim()) ? '' : name.toUpperCase(), x + 9 * scale, top + 3.4 * scale, columnWidth - 10 - 9 * scale, 7.5 * scale, 5 * scale);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(empty ? '#9ca3af' : '#475569');
            fitText((position?.academyName || '').toUpperCase(), x + 9 * scale, top + 6.9 * scale, columnWidth - 10 - 9 * scale, 6 * scale, 5 * scale);
          });
        });
      });
      doc.setDrawColor('#334155'); doc.setLineWidth(0.2);
      page.rounds.forEach(({ matches }) => matches.forEach(({ match }) => {
        const from = positions.get(match.id), to = positions.get(match.nextMatchId);
        if (from && to && to.x > from.x) {
          const right = from.x + columnWidth - 9;
          const targetY = to.y + (match.nextMatchPosition === 'bottom' ? 12.6 : 4.2) * scale;
          doc.line(right, from.y + 8.4 * scale, right + 4, from.y + 8.4 * scale);
          doc.line(right + 4, from.y + 8.4 * scale, right + 4, targetY);
          doc.line(right + 4, targetY, to.x, targetY);
        }
      }));
      if (attachedWinner) {
        const from = positions.get(finalRound.matches[0].id);
        if (from) {
          const x = 10 + page.rounds.length * columnWidth;
          doc.setFontSize(10); doc.setTextColor('#111827'); doc.text('Ganador', x + 2, 42);
          doc.setDrawColor('#94a3b8'); doc.rect(x, from.y + 4.2 * scale, columnWidth - 9, 8.4 * scale);
          doc.line(from.x + columnWidth - 9, from.y + 8.4 * scale, x, from.y + 8.4 * scale);
        }
      }
      if (lastPage) renderPdfResults(doc, thirdPlacePlayoff, kudo || traditional || jkaKumite, !attachedWinner, kudo);
      doc.setTextColor(70); doc.setFontSize(9);
      doc.text('https://budotournaments.net/app versión 2.0', 165, 207, { align: 'center' });
      doc.text(String(pageNumber), 319, 207, { align: 'right' });
    });
  }
}
