import type { jsPDF } from 'jspdf';
import type { RegistrationSummary } from '../invitations/registration-summary.service';

export function paymentPdfMoney(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? 'Sin asignar' : `$ ${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(value)}`;
}

/** A single amount per entrant: category bundles must never be charged once per category. */
export function renderDojoPaymentsPdf(doc: jsPDF, eventName: string, summaries: RegistrationSummary[], generatedAt = new Date()): void {
  const margin = 14, right = 283, bottom = 190, line = 4.5;
  const widths = [8, 53, 100, 36, 36, 36];
  const x = widths.reduce((positions, width) => [...positions, positions[positions.length - 1] + width], [margin]);
  const date = generatedAt.toLocaleString('es-CL', { timeZone: 'America/Santiago' });
  let y = 0;
  const text = (value: string, at: number, top: number, size = 9, bold = false, align: 'left' | 'right' = 'left') => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(30, 41, 59);
    doc.text(value, at, top, { align });
  };
  const wrap = (value: string, width: number): string[] => doc.splitTextToSize(value, width);
  const heading = (dojo: string, continued = false) => {
    doc.setFillColor(15, 23, 42); doc.rect(0, 0, 297, 8, 'F');
    text('DETALLE DE INSCRIPCIONES Y PAGOS', margin, 20, 15, true);
    doc.setFontSize(11);
    const eventLines = wrap(eventName, 210);
    eventLines.forEach((part, i) => text(part, margin, 28 + i * 5, 11));
    text(`Emitido: ${date}`, right, 20, 8, false, 'right');
    y = 33 + eventLines.length * 5;
    doc.setFontSize(12);
    const dojoLines = wrap(`${dojo}${continued ? ' (continuación)' : ''}`, 260);
    dojoLines.forEach(part => { text(part, margin, y, 12, true); y += 5.5; });
    y += 3;
    doc.setFillColor(226, 232, 240); doc.rect(margin, y - 4, right - margin, 9, 'F');
    ['#', 'Deportista / inscrito', 'Categorías', 'Monto inscripción', 'Pagado aprobado', 'Saldo por pagar'].forEach((label, i) => text(label, x[i] + 2, y + 1, 8, true));
    y += 10;
  };
  const newPage = (dojo: string) => { doc.addPage(); heading(dojo, true); };
  const totals = (summary: RegistrationSummary) => {
    if (y + 44 > bottom) newPage(summary.academyName);
    y += 4;
    doc.setDrawColor(148, 163, 184); doc.line(margin, y, right, y); y += 7;
    text(`TOTAL DOJO - ${summary.entries.length} inscritos`, margin, y, 10, true);
    const rows: [string, string][] = [
      ['Total inscripción', summary.pricingComplete ? paymentPdfMoney(summary.total) : `${paymentPdfMoney(summary.total)} (parcial)`],
      ['Pagos aprobados', paymentPdfMoney(summary.approvedAmount)],
      ['Pagos pendientes de revisión', paymentPdfMoney(summary.pendingAmount)],
      ['Saldo por pagar', summary.pricingComplete ? paymentPdfMoney(summary.balance) : 'Pendiente de tarifa'],
      ['Saldo a favor', paymentPdfMoney(summary.creditAmount ?? 0)]
    ];
    rows.forEach(([label, value], index) => {
      text(label, 170, y, 9, index === 3); text(value, right - 2, y, 9, index === 3, 'right'); y += 6;
    });
  };

  const ordered = [...summaries].sort((a, b) => a.academyName.localeCompare(b.academyName, 'es'));
  ordered.forEach((summary, dojoIndex) => {
    if (dojoIndex) doc.addPage();
    heading(summary.academyName);
    const entries = [...summary.entries].sort((a, b) => a.name.localeCompare(b.name, 'es'));
    if (!entries.length) { text('Sin inscripciones vigentes. Se incluyen los pagos registrados del dojo.', margin, y); y += 9; }
    entries.forEach((entry, index) => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      const name = `${entry.name}${entry.isTeam ? ' (equipo)' : entry.isCoach && !entry.isAthlete ? ' (coach)' : ''}`;
      const categories = entry.categories.map(c => `${c.modalityName ? c.modalityName + ': ' : ''}${c.name}`).join('\n') || 'Sin categorías vigentes';
      const columns = [String(index + 1), name, categories,
        entry.amount == null ? 'Pendiente de tarifa' : paymentPdfMoney(entry.amount),
        paymentPdfMoney(entry.paidAmount), paymentPdfMoney(entry.balance)]
        .map((value, i) => wrap(value, widths[i] - 4));
      let offset = 0;
      const length = Math.max(...columns.map(c => c.length));
      while (offset < length) {
        if (y + 9 > bottom) newPage(summary.academyName);
        const count = Math.min(length - offset, Math.max(1, Math.floor((bottom - y - 3) / line)));
        const height = count * line + 3;
        if (index % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(margin, y - 3, right - margin, height, 'F'); }
        columns.forEach((values, col) => values.slice(offset, offset + count).forEach((value, row) =>
          text(value, col >= 3 ? x[col + 1] - 2 : x[col] + 2, y + row * line, 9, false, col >= 3 ? 'right' : 'left')));
        y += height;
        offset += count;
        if (offset < length) newPage(summary.academyName);
      }
    });
    totals(summary);
  });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    text('CLP. Pendientes de revisión no descuentan el saldo. Sin asignar: pago o saldo sin distribución individual.', margin, 199, 8);
    text(`${page} / ${pages}`, right, 199, 8, false, 'right');
  }
  doc.setProperties({ title: `Inscripciones y pagos por dojo - ${eventName}`, subject: 'Detalle por dojo, inscritos y categorías', creator: 'Budo Tournaments' });
}
