import type { jsPDF } from 'jspdf';
import { AcademyStudent } from './students.models';

export const studentListTitle = 'Listado de Estudiantes/Deportistas';
const headings = ['N°', 'Nombres', 'Apellidos', 'Rol', 'Fecha de nacimiento'];

export function studentListRows(students: AcademyStudent[]): string[][] {
  return students.map((student, index) => {
    const date = /^(\d{4})-(\d{2})-(\d{2})/.exec(student.birthDate);
    return [String(index + 1), student.firstName, student.lastName,
      ['Sportman', 'D'].includes(student.role) ? 'Deportista' : 'Coach',
      date && date[1] !== '0001' ? `${date[3]}/${date[2]}/${date[1]}` : ''];
  });
}

const xml = (value: string): string => value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

// Inline string cells preserve identity values and never interpret names as formulas.
export function studentListWorkbook(academyName: string, students: AcademyStudent[]): Record<string, string> {
  return listWorkbook([[academyName], [studentListTitle], [], headings, ...studentListRows(students)]);
}

export function listWorkbook(rows: (string | number)[][]): Record<string, string> {
  const sheetRows = rows.map((row, index) => `<row r="${index + 1}">${row.map((value, column) => {
    const ref = `${String.fromCharCode(65 + column)}${index + 1}`;
    const style = index < 2 || index === 3 ? 1 : 0;
    return typeof value === 'number'
      ? `<c r="${ref}" t="n" s="${style}"><v>${value}</v></c>`
      : `<c r="${ref}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
  }).join('')}</row>`).join('');
  return {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Estudiantes" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': `<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
    'xl/worksheets/sheet1.xml': `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="7" customWidth="1"/><col min="2" max="3" width="30" customWidth="1"/><col min="4" max="4" width="16" customWidth="1"/><col min="5" max="5" width="23" customWidth="1"/></cols><sheetData>${sheetRows}</sheetData><mergeCells count="2"><mergeCell ref="A1:E1"/><mergeCell ref="A2:E2"/></mergeCells></worksheet>`
  };
}

export function renderStudentListPdf(doc: jsPDF, academyName: string, students: AcademyStudent[], budoLogo: string, academyLogo: string): void {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 12;
  const widths = [10, 53, 53, 30, width - margin * 2 - 146];
  const columns = widths.map((_, index) => margin + widths.slice(0, index).reduce((a, b) => a + b, 0));
  const logo = (source: string, x: number): void => {
    if (!source) return;
    const image = doc.getImageProperties(source);
    const scale = Math.min(24 / image.width, 24 / image.height);
    const w = image.width * scale; const h = image.height * scale;
    doc.addImage(source, 'PNG', x + (24 - w) / 2, 12 + (24 - h) / 2, w, h);
  };
  const beginPage = (): number => {
    logo(budoLogo, margin); logo(academyLogo, width - margin - 24);
    doc.setTextColor(35, 35, 35); doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
    const title = doc.splitTextToSize(academyName, width - 84) as string[];
    doc.text(title, width / 2, 19, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    const subtitleY = Math.max(32, 19 + title.length * 6);
    doc.text(studentListTitle, width / 2, subtitleY, { align: 'center' });
    const y = subtitleY + 9;
    doc.setFillColor(65, 55, 135); doc.rect(margin, y, width - margin * 2, 10, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    headings.forEach((heading, index) => doc.text(heading, columns[index] + 2, y + 6));
    return y + 10;
  };
  let y = beginPage();
  for (const [index, row] of studentListRows(students).entries()) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    const lines = row.map((cell, column) => doc.splitTextToSize(cell, widths[column] - 4) as string[]);
    const rowHeight = Math.max(9, Math.max(...lines.map(cell => cell.length)) * 4.2 + 4);
    if (y + rowHeight > height - 27) { doc.addPage(); y = beginPage(); }
    const shade = index % 2 ? 245 : 255;
    doc.setFillColor(shade, shade, shade); doc.rect(margin, y, width - margin * 2, rowHeight, 'F');
    doc.setTextColor(35, 35, 35); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    lines.forEach((cell, column) => doc.text(cell, columns[column] + 2, y + 5.5));
    doc.setDrawColor(220); doc.line(margin, y + rowHeight, width - margin, y + rowHeight);
    y += rowHeight;
  }
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90);
    doc.textWithLink('https://budotournaments.net/app/', width / 2, height - 14, { align: 'center', url: 'https://budotournaments.net/app/' });
    doc.text('@budotournaments_net', width / 2, height - 9, { align: 'center' });
  }
}
