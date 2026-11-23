import { EventPaymentLedgerComponent } from '../pricing/event-payment-ledger.component';
import { RegistrationCountsComponent } from '../invitations/registration-counts.component';
import { CommonModule } from '@angular/common';
import { CompetitorChargeComponent } from '../pricing/competitor-charge.component';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subscription, catchError, finalize, of, switchMap, tap } from 'rxjs';
import { enrollmentErrorMessage } from '../invitations/enrollment-error-message';
import { PaymentAcademy, RegistrationSummary, RegistrationSummaryService, RegistrationTransfer, TransferReceipt, transferStatus } from '../invitations/registration-summary.service';
import { ReceiptPreviewComponent } from './receipt-preview.component';

@Component({ selector: 'bte-event-payment-review', standalone: true,
  templateUrl: './event-payment-review.component.html', styleUrls: ['./event-payment-review.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EventPaymentLedgerComponent, RegistrationCountsComponent, CompetitorChargeComponent, CommonModule, ReactiveFormsModule, MatAutocompleteModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatDialogModule] })
export class EventPaymentReviewComponent implements OnInit, OnDestroy {
  @Input({ required: true }) eventId = 0;
  readonly academy = new FormControl<PaymentAcademy | string>('');
  academies: PaymentAcademy[] = []; summary?: RegistrationSummary;
  loading = false; saving = false; error = ''; success = '';
  reasons: Record<string, string> = {};
  readonly status = transferStatus;
  private readonly subscriptions = new Subscription();
  constructor(private service: RegistrationSummaryService, private cdr: ChangeDetectorRef, private dialog: MatDialog) {}
  readonly displayAcademy = (value: PaymentAcademy | string | null) => typeof value === 'string' ? value : value?.name ?? '';
  get options(): PaymentAcademy[] {
    const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const term = typeof this.academy.value === 'string' ? normalize(this.academy.value) : '';
    return this.academies.filter(a => normalize(a.name).includes(term));
  }
  ngOnInit(): void {
    this.loading = true;
    this.subscriptions.add(this.service.getOrganizerAcademies(this.eventId).pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({ next: list => this.academies = list, error: error => this.error = enrollmentErrorMessage(error) }));
    this.subscriptions.add(this.academy.valueChanges.pipe(
      tap(() => { this.summary = undefined; this.error = ''; this.success = ''; }),
      switchMap(value => {
        if (!value || typeof value === 'string') { this.loading = false; return of(null); }
        this.loading = true;
        return this.service.getOrganizerSummary(this.eventId, value.id).pipe(
          catchError(error => { this.error = enrollmentErrorMessage(error); return of(null); }),
          finalize(() => { this.loading = false; this.cdr.markForCheck(); }));
      })
    ).subscribe(summary => { this.summary = summary ?? undefined; this.cdr.markForCheck(); }));
  }
  ngOnDestroy(): void { this.subscriptions.unsubscribe(); }
  refresh(): void { this.academy.setValue(this.academy.value); }
  setReason(reference: string, event: Event): void { this.reasons[reference] = (event.target as HTMLTextAreaElement).value; }
  review(transfer: RegistrationTransfer, status: 'APPROVED' | 'REJECTED'): void {
    if (!this.summary || this.saving || transfer.approved || transfer.status === 'REJECTED') return;
    const reason = this.reasons[transfer.reference]?.trim();
    if (status === 'REJECTED' && !reason) { this.error = 'Indica el motivo del rechazo.'; return; }
    const academyId = this.summary.academyId;
    this.saving = true; this.error = ''; this.success = ''; this.academy.disable({ emitEvent: false });
    this.subscriptions.add(this.service.review(this.eventId, academyId, transfer.reference, status, reason)
      .pipe(finalize(() => { this.saving = false; this.academy.enable({ emitEvent: false }); this.cdr.markForCheck(); }))
      .subscribe({ next: summary => { this.summary = summary; this.success = status === 'APPROVED' ? 'Transferencia aprobada.' : 'Transferencia rechazada.'; },
        error: error => this.error = enrollmentErrorMessage(error) }));
  }
  receipt(receipt: TransferReceipt, preview: boolean): void {
    this.subscriptions.add(this.service.download(receipt.id).subscribe({
      next: blob => {
        if (preview) this.dialog.open(ReceiptPreviewComponent, { data: blob, width: '900px', maxWidth: '95vw' });
        else { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = receipt.fileName; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
      }, error: error => { this.error = enrollmentErrorMessage(error); this.cdr.markForCheck(); }
    }));
  }
}
