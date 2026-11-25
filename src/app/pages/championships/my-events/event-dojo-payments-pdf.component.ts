import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom, from, mergeMap, toArray } from 'rxjs';
import { RegistrationSummaryService } from '../invitations/registration-summary.service';
import { renderDojoPaymentsPdf } from './event-dojo-payments-pdf';

@Component({
  selector: 'bte-event-dojo-payments-pdf', standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<button mat-stroked-button type="button" [disabled]="busy" (click)="download()" [attr.aria-busy]="busy">
    <mat-icon svgIcon="mat:picture_as_pdf"></mat-icon>{{ busy ? 'Preparando PDF...' : 'PDF de pagos por dojo' }}
  </button>`
})
export class EventDojoPaymentsPdfComponent {
  @Input({ required: true }) eventId = 0;
  @Input() eventName = '';
  busy = false;
  constructor(private payments: RegistrationSummaryService, private snack: MatSnackBar, private cdr: ChangeDetectorRef) {}

  async download(): Promise<void> {
    if (this.busy || !this.eventId) return;
    this.busy = true;
    try {
      const academies = await firstValueFrom(this.payments.getOrganizerAcademies(this.eventId));
      if (!academies.length) throw new Error('No hay dojos con inscripciones o pagos para exportar.');
      // Limit concurrency and fail the complete export if any dojo could not be loaded.
      const summaries = await firstValueFrom(from(academies).pipe(
        mergeMap(academy => this.payments.getOrganizerSummary(this.eventId, academy.id), 4), toArray()));
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
      renderDojoPaymentsPdf(doc, this.eventName || summaries[0].eventName, summaries);
      doc.save(`pagos-por-dojo-evento-${this.eventId}.pdf`);
    } catch (error) {
      this.snack.open(error instanceof Error ? error.message : 'No fue posible cargar el detalle de todos los dojos. Reintenta la descarga.', 'Cerrar', { duration: 7000 });
    } finally {
      this.busy = false; this.cdr.markForCheck();
    }
  }
}
