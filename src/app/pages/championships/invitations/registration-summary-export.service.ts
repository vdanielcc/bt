import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AcademyDetail, AcademyService } from '../../academy/academy.service';
import { EventInvitationsService } from './event-invitations.service';
import { RegistrationSummary } from './registration-summary.service';
import { registrationSummaryWorkbook, renderRegistrationSummaryPdf, summaryTimestamp } from './registration-summary-export';

@Injectable({ providedIn: 'root' })
export class RegistrationSummaryExportService {
  constructor(private readonly academies: AcademyService, private readonly events: EventInvitationsService) {}
  async download(format: 'excel' | 'pdf', summary: RegistrationSummary): Promise<void> {
    const timestamp = summaryTimestamp(new Date());
    const [academy, event] = await Promise.all([
      firstValueFrom(this.academies.getAcademy(summary.academyId)), firstValueFrom(this.events.getEvent(summary.eventId))
    ]);
    const organizer = event.academyId === summary.academyId ? academy : event.academyId
      ? await firstValueFrom(this.academies.getAcademy(event.academyId)) : undefined;
    const source = (item?: AcademyDetail): string => item
      ? item.logoBase64 ? (item.logoBase64.startsWith('data:') ? item.logoBase64 : `data:image/png;base64,${item.logoBase64}`) : this.academies.logoUrl(item) : '';
    const [budo, dojo, organizerLogo] = await Promise.all([
      this.imageData(new URL('favicon.png', document.baseURI).href),
      source(academy) ? this.imageData(source(academy)) : Promise.resolve(''),
      source(organizer) ? this.imageData(source(organizer)) : Promise.resolve('')
    ]);
    const logos = { budo, academy: dojo, organizer: organizerLogo };
    const filename = `resumen-inscripciones-evento-${summary.eventId}-dojo-${summary.academyId}`;
    if (format === 'excel') {
      const { zipSync, strToU8 } = await import('fflate');
      const files = registrationSummaryWorkbook(summary, timestamp, logos);
      const entries = Object.fromEntries(Object.entries(files).map(([name, value]) => [name, typeof value === 'string' ? strToU8(value) : value]));
      const url = URL.createObjectURL(new Blob([zipSync(entries)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a'); link.href = url; link.download = `${filename}.xlsx`;
      document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait', compress: true });
    doc.setProperties({ title: `${summary.eventName} - ${summary.academyName}`, author: 'Budo Tournaments' });
    renderRegistrationSummaryPdf(doc, summary, timestamp, logos);
    doc.save(`${filename}.pdf`);
  }
  private imageData(source: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const fail = (): void => { window.clearTimeout(timeout); image.onload = image.onerror = null; reject(new Error('No fue posible cargar los logos. Reintenta la descarga.')); };
      const timeout = window.setTimeout(fail, 20000);
      image.crossOrigin = 'anonymous'; image.onerror = fail;
      image.onload = () => {
        window.clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas'); canvas.width = canvas.height = 300;
          const context = canvas.getContext('2d'); if (!context) throw new Error('canvas');
          const scale = 300 / Math.max(image.naturalWidth, image.naturalHeight);
          const w = image.naturalWidth * scale; const h = image.naturalHeight * scale;
          context.drawImage(image, (300 - w) / 2, (300 - h) / 2, w, h);
          resolve(canvas.toDataURL('image/png'));
        } catch { fail(); }
      };
      image.src = source;
    });
  }
}
