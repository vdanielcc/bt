import type { jsPDF } from 'jspdf';
import { EventInvitation } from '../invitations/event-invitation.model';
import { scheduleStart, scheduleTimes } from './schedule-times';

export interface SchedulePdfArea {
  number: number;
  items: {
    type: 'category' | 'break';
    code: string;
    name: string;
    competitorCount: number;
    durationMinutes: number | null;
  }[];
}

export function renderSchedulePdf(doc: jsPDF, event: EventInvitation, academyName: string,
  areas: SchedulePdfArea[]): void {
  let page = 0;
  const width = 98;
  const edges = [0, 24, 80, 87, 98];
  const fit = (text: string, x: number, y: number, available: number, size = 7) => {
    doc.setFontSize(size);
    while (doc.getTextWidth(text) > available && size > 5) doc.setFontSize(size -= 0.25);
    doc.text(text, x, y);
  };
  const dateLabel = scheduleStart(event.eventDateStart)?.toFormat('dd/MM/yyyy HH:mm') ?? 'Por definir';
  const startPage = () => {
    if (page++) doc.addPage([330, 216], 'landscape');
    doc.setTextColor(0); doc.setDrawColor(130); doc.setLineWidth(0.15);
    doc.setFont('helvetica', 'bold');
    fit(event.name + ' · Cronograma', 10, 9, 310, 10);
    doc.setFont('helvetica', 'normal');
    fit(academyName + ' · ' + dateLabel + ' · ' + (event.eventLocation || event.eventAddress || 'Lugar por definir'), 10, 13, 310, 8);
    doc.setFontSize(7); doc.text(String(page), 320, 209, { align: 'right' });
  };
  for (let first = 0; first < areas.length; first += 3) {
    const columns = areas.slice(first, first + 3).map(area => {
      const times = scheduleTimes(event.eventDateStart, area.items);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
      const rows = area.items.flatMap((item, index) => {
        const title = (item.type === 'break' ? 'RECESO' : item.code) + ' · ' + (item.name || 'Sin nombre');
        const lines: string[] = doc.splitTextToSize(title, 54);
        const segments = [];
        for (let offset = 0; offset < lines.length; offset += 40) {
          const segment = lines.slice(offset, offset + 40);
          segments.push({ item, lines: segment, time: times[index], height: Math.max(5, 1.5 + segment.length * 2.8) });
        }
        return segments;
      });
      return { area, rows, cursor: 0 };
    });
    let continued = false;
    do {
      startPage();
      columns.forEach((column, col) => {
        const x = 10 + col * 106;
        doc.setFont('helvetica', 'bold');
        fit('Área ' + column.area.number + (continued ? ' · Continuación' : ''), x + 3, 20, width - 6, 9);
        doc.rect(x, 22, width, 6);
        ['Horario', 'Categoría / Receso', 'Ins.', 'Min.'].forEach((label, i) => fit(label, x + edges[i] + 1, 26, edges[i + 1] - edges[i] - 2));
        for (const edge of edges.slice(1, -1)) doc.line(x + edge, 22, x + edge, 28);
        doc.setFont('helvetica', 'normal');
        let y = 28;
        if (column.cursor === column.rows.length) fit(column.rows.length ? 'Área completada.' : 'Sin actividades.', x + 1, y + 4, width - 2);
        while (column.cursor < column.rows.length) {
          const row = column.rows[column.cursor];
          if (y + row.height > 202) break;
          doc.rect(x, y, width, row.height);
          for (const edge of edges.slice(1, -1)) doc.line(x + edge, y, x + edge, y + row.height);
          fit(row.time.start + ' - ' + row.time.end, x + 1, y + 3.3, 22, 6.5);
          doc.setFontSize(7);
          doc.text(row.lines, x + 25, y + 3.3, { lineHeightFactor: 1.13 });
          fit(row.item.type === 'break' ? '-' : String(row.item.competitorCount), x + 81, y + 3.3, 5);
          fit(row.item.durationMinutes == null ? '?' : String(Math.max(0, Math.round(row.item.durationMinutes))), x + 88, y + 3.3, 9);
          y += row.height;
          column.cursor++;
        }
      });
      continued = true;
    } while (columns.some(column => column.cursor < column.rows.length));
  }
}
