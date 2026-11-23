import type { jsPDF } from 'jspdf';
import { listWorkbook } from '../students/student-list-export';
import { RegistrationSummary } from './registration-summary.service';

export interface SummaryLogos { budo: string; academy: string; organizer: string; }
const website = 'https://budotournaments.net/app';
const xml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function summaryTimestamp(now: Date): string {
  return new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
}
export function summaryFooter(timestamp: string): string { return `${website}  -  @budotournaments_net  -  ${timestamp}`; }
export function registrationCountRows(summary: RegistrationSummary): [string, number | string][] {
  return [['Deportistas \u00fanicos (inscripci\u00f3n individual)', summary.totalCompetitors ?? '\u2014'],
    ['Coaches', summary.totalCoaches ?? '\u2014'], ['Equipos', summary.totalTeams ?? '\u2014'],
    ['Inscripciones deportivas (sin coaches)', summary.totalRegistrations ?? '\u2014']];
}
export function summaryTotals(summary: RegistrationSummary): [string, number | string][] {
  return [['Total inscripción (CLP)', summary.pricingComplete ? summary.total : 'Por definir'],
    ['Pagado y aprobado (CLP)', summary.approvedAmount], ['Pendiente de aprobación (CLP)', summary.pendingAmount],
    ['Saldo pendiente (CLP)', summary.pricingComplete ? summary.balance : 'Por definir']];
}

export function registrationSummaryWorkbook(summary: RegistrationSummary, timestamp: string, logos: SummaryLogos): Record<string, string | Uint8Array> {
  const rows: (string | number)[][] = [[summary.eventName], [summary.academyName], [],
    ['N°', 'Inscrito', 'Categorías', 'Inscripciones deportivas', 'Monto (CLP)'],
    ...summary.entries.map((entry, index) => [index + 1, entry.name, entry.categories.map(category => category.name).join('\n'), entry.sportingRegistrations ?? '\u2014', entry.amount ?? 'Por definir']),
    [], ...registrationCountRows(summary).map(([label, count]) => [label, '', '', '', count]),
    [], ...summaryTotals(summary).map(([label, amount]) => [label, '', '', '', amount]),
    ...(summary.pricingComplete ? [] : [['Hay inscripciones sin tarifa configurada.']]), []];
  const organizerRow = rows.length;
  rows.push([], [], [], [summaryFooter(timestamp)]);
  const files: Record<string, string | Uint8Array> = listWorkbook(rows);
  files['xl/workbook.xml'] = String(files['xl/workbook.xml']).replace('name="Estudiantes"', 'name="Resumen"');
  let sheet = String(files['xl/worksheets/sheet1.xml'])
    .replace('width="30"', 'width="32"')
    .replace('<col min="2" max="3" width="32" customWidth="1"/>', '<col min="2" max="2" width="32" customWidth="1"/><col min="3" max="3" width="65" customWidth="1"/>')
    .replace('<mergeCell ref="A1:E1"/><mergeCell ref="A2:E2"/>', '<mergeCell ref="B1:D1"/><mergeCell ref="B2:D2"/>');
  // Keep the titles between the two top logos.
  sheet = sheet.replace('r="A1"', 'r="B1"').replace('r="A2"', 'r="B2"')
    .replace('<row r="1">', '<row r="1" ht="22" customHeight="1">').replace('<row r="2">', '<row r="2" ht="22" customHeight="1">');
  summary.entries.forEach((entry, index) => {
    const lines = Math.max(1, Math.ceil(entry.name.length / 30),
      entry.categories.reduce((count, category) => count + Math.max(1, Math.ceil(category.name.length / 60)), 0));
    sheet = sheet.replace(`<row r="${index + 5}">`, `<row r="${index + 5}" ht="${Math.min(409, lines * 15 + 6)}" customHeight="1">`);
  });
  files['xl/styles.xml'] = String(files['xl/styles.xml']).replace('xfId="0"/>', 'xfId="0"><alignment vertical="top" wrapText="1"/></xf>');
  const images = [{ source: logos.budo, col: 0, row: 0 }, { source: logos.academy, col: 4, row: 0 }, { source: logos.organizer, col: 2, row: organizerRow }].filter(image => image.source);
  if (images.length) {
    const drawingNamespace = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';
    files['xl/drawings/drawing1.xml'] = `<xdr:wsDr xmlns:xdr="${drawingNamespace}" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${images.map((image, index) => {
      const id = index + 1;
      const source = image.source.split(',')[1];
      files[`xl/media/image${id}.png`] = Uint8Array.from(atob(source), char => char.charCodeAt(0));
      const offset = image.col === 2 ? 1962150 : image.col === 4 ? 1123950 : 0;
      return `<xdr:oneCellAnchor><xdr:from><xdr:col>${image.col}</xdr:col><xdr:colOff>${offset}</xdr:colOff><xdr:row>${image.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="457200" cy="457200"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${id}" name="Logo ${id}"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId${id}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="457200" cy="457200"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;
    }).join('')}</xdr:wsDr>`;
    files['xl/drawings/_rels/drawing1.xml.rels'] = `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${images.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${index + 1}.png"/>`).join('')}</Relationships>`;
    files['xl/worksheets/_rels/sheet1.xml.rels'] = '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdDrawing" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>';
    files['[Content_Types].xml'] = String(files['[Content_Types].xml']).replace('</Types>', '<Default Extension="png" ContentType="image/png"/><Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>');
    sheet = sheet.replace('<worksheet ', '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ');
  }
  sheet = sheet.replace('</worksheet>', `<pageMargins left="0.3" right="0.3" top="0.4" bottom="0.5" header="0.2" footer="0.2"/><pageSetup paperSize="1" orientation="landscape"/><headerFooter><oddFooter>${xml('&C' + summaryFooter(timestamp))}</oddFooter></headerFooter>${images.length ? '<drawing r:id="rIdDrawing"/>' : ''}</worksheet>`);
  files['xl/worksheets/sheet1.xml'] = sheet;
  return files;
}

export function renderRegistrationSummaryPdf(doc: jsPDF, summary: RegistrationSummary, timestamp: string, logos: SummaryLogos): void {
  const width = doc.internal.pageSize.getWidth(); const height = doc.internal.pageSize.getHeight();
  const margin = 12; const bottom = height - 49;
  const widths = [10, 53, width - 24 - 100, 37];
  const columns = widths.map((_, index) => margin + widths.slice(0, index).reduce((a, b) => a + b, 0));
  const money = (value: number | string): string => typeof value === 'number' ? `$ ${value.toLocaleString('es-CL')}` : value;
  const logo = (source: string, x: number, y: number, size: number): void => {
    if (!source) return;
    const image = doc.getImageProperties(source); const scale = Math.min(size / image.width, size / image.height);
    const w = image.width * scale; const h = image.height * scale;
    doc.addImage(source, 'PNG', x + (size - w) / 2, y + (size - h) / 2, w, h);
  };
  const beginPage = (): number => {
    logo(logos.budo, margin, 10, 24); logo(logos.academy, width - margin - 24, 10, 24);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(30); doc.setFontSize(14);
    const title = doc.splitTextToSize(summary.eventName, width - 84) as string[];
    doc.text(title, width / 2, 17, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    const subtitle = doc.splitTextToSize(summary.academyName, width - 84) as string[];
    const subtitleY = Math.max(29, 17 + title.length * 6);
    doc.text(subtitle, width / 2, subtitleY, { align: 'center' });
    const y = Math.max(41, subtitleY + subtitle.length * 5 + 5);
    doc.setFillColor(65, 55, 135); doc.rect(margin, y, width - 24, 9, 'F');
    doc.setFont('helvetica', 'bold'); doc.setTextColor(255); doc.setFontSize(9);
    ['N°', 'Inscrito', 'Categorías', 'Monto (CLP)'].forEach((value, index) => doc.text(value, columns[index] + 2, y + 6));
    return y + 9;
  };
  let y = beginPage();
  summary.entries.forEach((entry, index) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    const values = [String(index + 1), entry.name, entry.categories.map(category => category.name).join('\n'), money(entry.amount ?? 'Por definir')];
    const lines = values.map((value, column) => doc.splitTextToSize(value, widths[column] - 4) as string[]);
    let offset = 0; const count = Math.max(1, ...lines.map(value => value.length));
    while (offset < count) {
      if (y + 9 > bottom) { doc.addPage(); y = beginPage(); }
      const take = Math.max(1, Math.min(count - offset, Math.floor((bottom - y - 4) / 4.2)));
      const rowHeight = take * 4.2 + 4;
      const shade = index % 2 ? 245 : 255; doc.setFillColor(shade, shade, shade); doc.rect(margin, y, width - 24, rowHeight, 'F');
      doc.setTextColor(30); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      lines.forEach((value, column) => { const slice = value.slice(offset, offset + take); if (slice.length) doc.text(slice, columns[column] + 2, y + 5); });
      y += rowHeight; offset += take;
    }
  });
  const statistics = registrationCountRows(summary);
  const totals = [...statistics, ...summaryTotals(summary)];
  if (!summary.pricingComplete) totals.push(['Hay inscripciones sin tarifa configurada.', '']);
  if (y + totals.length * 8 + 5 > bottom) { doc.addPage(); y = beginPage(); }
  y += 5; doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(30);
  totals.forEach(([label, value], index) => { doc.text(label, margin + 2, y + 5); doc.text(index < statistics.length ? String(value) : money(value), width - margin - 2, y + 5, { align: 'right' }); y += 8; });
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page); logo(logos.organizer, width / 2 - 12, height - 41, 24);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90);
    doc.text(summaryFooter(timestamp), width / 2, height - 9, { align: 'center' });
  }
}
