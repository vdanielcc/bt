import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AcademyService } from '../../academy/academy.service';
import { EventInvitation } from '../invitations/event-invitation.model';
import { EventInvitationsService } from '../invitations/event-invitations.service';
import { orderedCategories, renderTournamentPdf } from './tournament-fixture-pdf';

@Injectable({ providedIn: 'root' })
export class TournamentFixturePdfService {
  constructor(private http: HttpClient, private events: EventInvitationsService, private academies: AcademyService) {}

  async downloadFixture(event: EventInvitation, category: any, fixture: any): Promise<void> {
    if (!event.academyId) throw new Error('El evento no tiene un dojo organizador configurado.');
    const academy = await firstValueFrom(this.academies.getAcademy(event.academyId));
    const source = academy.logoBase64 ? (academy.logoBase64.startsWith('data:') ? academy.logoBase64 : `data:image/png;base64,${academy.logoBase64}`) : this.academies.logoUrl(academy);
    if (!source) throw new Error('El dojo organizador debe tener un logo configurado para descargar este PDF.');
    const [budoLogo, dojoLogo, { jsPDF }] = await Promise.all([
      this.imageData(new URL('favicon.png', document.baseURI).href), this.imageData(source), import('jspdf')
    ]);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [330, 216], compress: true });
    renderTournamentPdf(doc, [{ category, fixture }], event.name, budoLogo, dojoLogo, event.eventType, event.associationType);
    doc.save(`llaves-evento-${event.id}-categoria-${category.id ?? category.Id}.pdf`);
  }

  async download(event: EventInvitation, progress: (done: number, total: number) => void): Promise<void> {
    const [categories, response] = await Promise.all([
      firstValueFrom(this.events.getEventCategories(event.id)),
      firstValueFrom(this.http.get<any>(`${environment.apiBaseUrl}/Modalities`))
    ]);
    const modalities = response?.data ?? response?.Data ?? response;
    const selected = orderedCategories(categories, Array.isArray(modalities) ? modalities : modalities?.items ?? []);
    if (!selected.length) throw new Error('No hay categorías con competidores en las modalidades solicitadas.');
    if (!event.academyId) throw new Error('El evento no tiene un dojo organizador configurado.');
    const academy = await firstValueFrom(this.academies.getAcademy(event.academyId));
    const dojoSource = academy.logoBase64 ? (academy.logoBase64.startsWith('data:') ? academy.logoBase64 : `data:image/png;base64,${academy.logoBase64}`) : this.academies.logoUrl(academy);
    if (!dojoSource) throw new Error('El dojo organizador debe tener un logo configurado para descargar este PDF.');
    const [budoLogo, dojoLogo, { jsPDF }] = await Promise.all([
      this.imageData(new URL('favicon.png', document.baseURI).href),
      this.imageData(dojoSource), import('jspdf')
    ]);
    const entries: { category: any; fixture: any }[] = [];
    progress(0, selected.length);
    for (const category of selected) {
      // The existing endpoint preserves official versions, creating only the first
      // version when none exists, exactly as opening a category already does.
      let fixture: any;
      try {
        fixture = await firstValueFrom(this.events.getLatestFixture(event.id, Number(category.id ?? category.Id)));
        if (!fixture?.rounds?.some((r: any) => r.matches?.length)) throw new Error('empty');
      } catch {
        throw new Error(`No se pudieron obtener las llaves de ${category.code ?? category.Code}. Reintenta la descarga.`);
      }
      entries.push({ category, fixture });
      progress(entries.length, selected.length);
    }
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [330, 216], compress: true });
    renderTournamentPdf(doc, entries, event.name, budoLogo, dojoLogo, event.eventType ?? '', event.associationType);
    doc.save(`llaves-torneo-${event.id}.pdf`);
  }

  private imageData(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const timeout = window.setTimeout(() => fail(), 20000);
      const fail = () => { window.clearTimeout(timeout); image.onload = image.onerror = null; reject(new Error('No se pudo cargar un logo del PDF. Revisa el logo del organizador y vuelve a intentar.')); };
      image.crossOrigin = 'anonymous';
      image.onerror = fail;
      image.onload = () => {
        window.clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, 600 / Math.max(image.naturalWidth, image.naturalHeight));
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          const context = canvas.getContext('2d');
          if (!context) throw new Error('canvas');
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
        } catch { fail(); }
      };
      image.src = url;
    });
  }
}
