import { Injectable } from '@angular/core';
import { zipSync, strToU8 } from 'fflate';
import { MedalState, MedalTableService } from './medal-table.service';

@Injectable({ providedIn: 'root' })
export class MedalTableExportService {
  constructor(private api: MedalTableService) {}
  async export(state: MedalState, type: 'pdf' | 'excel'): Promise<void> {
    const ranking: (string | number)[][] = [['Posición', 'Club / dojo', 'Oro', 'Plata', 'Bronce', 'Total'],
      ...state.ranking.map((r, i) => [i + 1, r.name, r.gold, r.silver, r.bronze, r.total])];
    const categories = new Map(state.categories?.map(x => [x.categoryId, x.name]));
    const clubs = new Map(state.ranking.map(x => [x.academyId, x.name]));
    const detail: (string | number)[][] = [['Categoría', 'Medalla', 'Competidor', 'Club / dojo', 'Procedencia'],
      ...state.podiums.filter(p => p.published !== false).flatMap(p => p.awards.map(a => [categories.get(p.categoryId) || p.categoryId,
        ({ gold: 'Oro', silver: 'Plata', bronze: 'Bronce' } as Record<string, string>)[a.medal],
        a.name || '', clubs.get(a.academyId!) || '', p.source === 'manual' ? 'Manual' : p.source === 'automatic' ? 'Automático' : 'Publicado']))];
    const period = `${state.event.eventDateStart.slice(0, 10)} — ${state.event.eventDateEnd.slice(0, 10)}`;
    let brandLogo: Uint8Array | undefined;
    try {
      const response = await fetch('assets/img/logo/budo-tournaments.png');
      if (response.ok) brandLogo = new Uint8Array(await response.arrayBuffer());
    } catch { /* The branded text and colors remain available offline. */ }
    if (type === 'pdf') {
      const { jsPDF } = await import('jspdf'); const doc = new jsPDF({ orientation: 'landscape' });
      const logos = new Map<number, { bytes: Uint8Array; format: string }>();
      await Promise.all(state.ranking.filter(r => r.logo).map(async row => {
        try {
          const response = await fetch(this.api.logo(row.academyId, state.serverConfirmedAt));
          if (response.ok) logos.set(row.academyId, { bytes: new Uint8Array(await response.arrayBuffer()), format: response.headers.get('Content-Type')?.includes('png') ? 'PNG' : 'JPEG' });
        } catch { /* Keep the row even if a logo is unavailable. */ }
      }));
      let y = 0;
      const heading = (title: string) => {
        doc.setFillColor('#f20d18'); doc.rect(0, 0, 297, 5, 'F'); doc.setTextColor('#0b0b0b');
        doc.setFontSize(17); doc.text('Budo Tournaments', 14, 18); doc.setFontSize(12);
        doc.text(doc.splitTextToSize(state.event.name, 210).slice(0, 2), 14, 27); doc.setFontSize(9); doc.text(period, 14, 39);
        doc.setFontSize(13); doc.text(title, 14, 50); y = 61;
        if (brandLogo) try { doc.addImage(brandLogo, 'PNG', 240, 8, 40, 20); } catch { /* Keep text brand. */ }
      };
      heading('Medallero');
      for (const [title, rows] of [['Medallero', ranking], ['Detalle por categoría', detail]] as const) {
        if (title !== 'Medallero') { doc.addPage(); heading(title); }
        for (const [index, row] of rows.entries()) {
          const widths = title === 'Medallero' ? [18, 130, 30, 30, 30, 28] : [65, 25, 75, 65, 35];
          const lines = row.map((cell, i) => doc.splitTextToSize(String(cell), widths[i] -
            (title === 'Medallero' && index > 0 && i === 1 && logos.has(state.ranking[index - 1].academyId) ? 16 : 4)));
          const height = Math.max(title === 'Medallero' && index > 0 ? 14 : 0, Math.max(...lines.map(x => x.length)) * 5 + 4);
          if (y + height > 195) { doc.addPage(); heading(title); }
          if (index === 0) { doc.setFillColor('#0b0b0b'); doc.rect(12, y - 4, 273, height, 'F'); doc.setTextColor('#ffffff'); }
          else doc.setTextColor('#0b0b0b');
          doc.setFontSize(9); let x = 14;
          lines.forEach((text, i) => {
            const logo = title === 'Medallero' && index > 0 && i === 1 ? logos.get(state.ranking[index - 1].academyId) : undefined;
            if (logo) try { doc.addImage(logo.bytes, logo.format, x, y - 3, 9, 9); } catch { /* Unreadable logo does not remove the result. */ }
            doc.text(text, x + (logo ? 12 : 0), y); x += widths[i];
          }); y += height;
        }
      }
      doc.save(`medallero-${state.event.id}.pdf`); return;
    }
    const xml = (v: unknown) => String(v).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
    const sheet = (rows: (string | number)[][]) => `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="8" width="25" customWidth="1"/></cols><sheetData>${[
      ['Budo Tournaments', state.event.name], [period], [], ...rows
    ].map((row, index) => `<row r="${index + 1}">${row.map((cell, col) => typeof cell === 'number'
      ? `<c r="${String.fromCharCode(65 + col)}${index + 1}" s="${index === 3 ? 1 : 0}"><v>${cell}</v></c>`
      : `<c r="${String.fromCharCode(65 + col)}${index + 1}" s="${index === 0 || index === 3 ? 1 : 0}" t="inlineStr"><is><t xml:space="preserve">${xml(cell)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;
    const files: Record<string, string> = {
      '[Content_Types].xml': `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${[1, 2].map(i => `<Override PartName="/xl/worksheets/sheet${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
      '_rels/.rels': `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      'xl/workbook.xml': `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Medallero" sheetId="1" r:id="rId1"/><sheet name="Detalle por categoría" sheetId="2" r:id="rId2"/></sheets></workbook>`,
      'xl/_rels/workbook.xml.rels': `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${[1, 2].map(i => `<Relationship Id="rId${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i}.xml"/>`).join('')}<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
      'xl/styles.xml': `<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="12"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF20D18"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0" fillId="0" borderId="0" xfId="0"/><xf fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/></cellXfs></styleSheet>`,
      'xl/worksheets/sheet1.xml': sheet(ranking), 'xl/worksheets/sheet2.xml': sheet(detail)
    };
    if (brandLogo) {
      files['[Content_Types].xml'] = files['[Content_Types].xml'].replace('</Types>',
        '<Default Extension="png" ContentType="image/png"/>' + [1, 2].map(i => `<Override PartName="/xl/drawings/drawing${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`).join('') + '</Types>');
      for (const i of [1, 2]) {
        const path = `xl/worksheets/sheet${i}.xml`;
        files[path] = files[path].replace('<worksheet xmlns=', '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns=').replace('</worksheet>', '<drawing r:id="rIdLogo"/></worksheet>');
        files[`xl/worksheets/_rels/sheet${i}.xml.rels`] = `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${i}.xml"/></Relationships>`;
        files[`xl/drawings/drawing${i}.xml`] = `<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><xdr:oneCellAnchor><xdr:from><xdr:col>7</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="1524000" cy="762000"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="1" name="Budo Tournaments"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rIdImage"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`;
        files[`xl/drawings/_rels/drawing${i}.xml.rels`] = '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdImage" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/logo.png"/></Relationships>';
      }
    }
    const entries = Object.fromEntries(Object.entries(files).map(([path, content]) => [path, strToU8(content)]));
    if (brandLogo) entries['xl/media/logo.png'] = brandLogo;
    const zipped = zipSync(entries);
    this.api.download(new Blob([zipped], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `medallero-${state.event.id}.xlsx`);
  }
}
