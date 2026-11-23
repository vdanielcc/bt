import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AcademyService } from '../../academy/academy.service';
import { EventInvitation } from '../invitations/event-invitation.model';
import { renderSchedulePdf, SchedulePdfArea } from './schedule-pdf';

@Injectable({ providedIn: 'root' })
export class SchedulePdfService {
  constructor(private readonly academies: AcademyService) {}

  async download(event: EventInvitation, areas: SchedulePdfArea[], fileSuffix = ''): Promise<void> {
    if (!event.academyId) throw new Error('El evento no tiene una academia organizadora configurada.');
    const [academy, { jsPDF }] = await Promise.all([
      firstValueFrom(this.academies.getAcademy(event.academyId)), import('jspdf')
    ]);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [330, 216], compress: true });
    renderSchedulePdf(doc, event, academy.name || event.academyName || '', areas);
    doc.save(`cronograma-torneo-${event.id}${fileSuffix ? `-${fileSuffix}` : ""}.pdf`);
  }
}
