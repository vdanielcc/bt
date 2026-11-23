import { EventPaymentLedgerComponent } from '../pricing/event-payment-ledger.component';
import { RegistrationCountsComponent } from '../invitations/registration-counts.component';
import { CompetitorChargeComponent } from '../pricing/competitor-charge.component';
import { TariffBatchesComponent } from '../pricing/tariff-batches.component';
import { TariffBatch } from '../pricing/event-pricing.models';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize, Subscription, timer, filter, switchMap, catchError, EMPTY } from 'rxjs';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { AuthService } from '../../../core/auth/auth.service';
import { enrollmentErrorMessage } from './enrollment-error-message';
import { RegistrationEntry, RegistrationSummary, RegistrationSummaryService, TransferReceipt, transferStatus } from './registration-summary.service';
import { RegistrationSummaryExportService } from './registration-summary-export.service';

@Component({ selector: 'bte-registration-summary', standalone: true,
  templateUrl: './registration-summary.component.html', styleUrls: ['./registration-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EventPaymentLedgerComponent, RegistrationCountsComponent, TariffBatchesComponent, CompetitorChargeComponent, CommonModule, RouterLink, ReactiveFormsModule, MatButtonModule, MatCardModule,
    MatFormFieldModule, MatInputModule, MatIconModule, MatProgressSpinnerModule,
    VexPageLayoutComponent, VexPageLayoutContentDirective, VexPageLayoutHeaderDirective] })
export class RegistrationSummaryComponent implements OnInit, OnDestroy {
  readonly transferStatus = transferStatus;
  private refreshSubscription?: Subscription;
  private batchPreparation?: Subscription;
  @ViewChild(TariffBatchesComponent) tariffBatches?: TariffBatchesComponent;
  preparingBatch = false;
  eventId = 0; academyId = 0;
  summary?: RegistrationSummary;
  loading = true; saving = false; loadError = ''; error = ''; success = '';
  removingId: number | null = null;
  exporting: 'excel' | 'pdf' | null = null;
  files: File[] = [];
  batchesEnabled = true; selectedBatch: TariffBatch | null = null;
  selectBatch(value: { enabled: boolean; batch: TariffBatch | null }) {
    this.batchesEnabled = value.enabled; this.selectedBatch = value.batch;
    if (value.batch) this.amount.setValue(value.batch.availableAmount ?? value.batch.balance ?? value.batch.total);
    this.cdr.markForCheck();
  }
  readonly amount = new FormControl<number | null>(null, [Validators.required, Validators.min(1),
    control => control.value == null || Number.isSafeInteger(control.value) ? null : { integer: true }]);
  private requestId: string | null = null;
  private requestSignature = '';
  constructor(private route: ActivatedRoute, private auth: AuthService,
    private service: RegistrationSummaryService, private cdr: ChangeDetectorRef,
    private readonly exports: RegistrationSummaryExportService) {}
  async downloadSummary(format: 'excel' | 'pdf'): Promise<void> {
    if (this.loading || this.loadError || this.saving || this.preparingBatch || this.removingId !== null || this.exporting || !this.summary) return;
    this.exporting = format; this.error = '';
    try { await this.exports.download(format, this.summary); }
    catch (error) { this.error = error instanceof Error ? error.message : 'No fue posible descargar el resumen.'; }
    finally { this.exporting = null; this.cdr.markForCheck(); }
  }
  ngOnInit(): void {
    this.eventId = Number(this.route.snapshot.paramMap.get('id'));
    this.academyId = this.auth.getCurrentUser()?.academieId ?? 0;
    this.load();
    this.refreshSubscription = timer(20000, 20000).pipe(
      filter(() => !document.hidden && !this.loading && !this.saving && !this.preparingBatch && this.removingId === null && this.eventId > 0 && this.academyId > 0),
      switchMap(() => this.service.getSummary(this.eventId, this.academyId).pipe(catchError(() => EMPTY)))
    ).subscribe(summary => { this.summary = summary; this.cdr.markForCheck(); });
  }
  ngOnDestroy(): void { this.refreshSubscription?.unsubscribe(); this.batchPreparation?.unsubscribe(); }
  load(): void {
    if (!Number.isInteger(this.eventId) || this.eventId <= 0 || this.academyId <= 0) {
      this.loading = false; this.loadError = 'No se pudo identificar el evento o tu academia.'; return;
    }
    this.loading = true; this.loadError = '';
    this.service.getSummary(this.eventId, this.academyId)
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({ next: data => this.summary = data, error: error => this.loadError = enrollmentErrorMessage(error) });
  }
  addFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = [...this.files, ...Array.from(input.files ?? [])]; input.value = '';
    this.error = '';
    if (files.length > 5) { this.error = 'Puedes adjuntar hasta 5 comprobantes por transferencia.'; return; }
    if (files.some(file => !/\.(jpe?g|png|pdf)$/i.test(file.name) || file.size <= 0 || file.size > 5 * 1024 * 1024)) {
      this.error = 'Selecciona archivos JPG, PNG o PDF de hasta 5 MB cada uno.'; return;
    }
    this.files = files;
  }
  removeRegistration(entry: RegistrationEntry): void {
    if (this.loading || this.saving || this.preparingBatch || this.removingId !== null || this.loadError ||
        !this.summary?.entries.some(item => item.competitorId === entry.competitorId)) return;
    if (!window.confirm(`¿Eliminar la inscripción de ${entry.name} de todas sus categorías en este evento?`)) return;
    let closureOverrideReason: string | undefined;
    const deadline = Date.parse(this.summary?.registrationClosesAtUtc || '');
    if (Number.isFinite(deadline) && Date.now() >= deadline) {
      if (!this.summary?.canOverrideRegistrationClose) { this.error = 'Las inscripciones del evento están cerradas.'; return; }
      const reason = window.prompt('Motivo de la excepción al cierre de inscripciones (quedará registrado):');
      if (reason === null) return;
      if (!reason.trim() || reason.trim().length > 1000) { this.error = 'Indica un motivo de hasta 1000 caracteres.'; return; }
      closureOverrideReason = reason.trim();
    }
    this.removingId = entry.competitorId;
    this.error = ''; this.success = '';
    this.service.removeRegistration(this.eventId, entry.competitorId, closureOverrideReason)
      .pipe(finalize(() => { this.removingId = null; this.cdr.markForCheck(); }))
      .subscribe({
        next: () => {
          this.success = `Se eliminó la inscripción de ${entry.name}.`;
          this.load();
        },
        error: error => {
          this.error = typeof error?.error?.message === 'string'
            ? error.error.message
            : 'No fue posible eliminar la inscripción. Inténtalo nuevamente.';
        }
      });
  }
  removeFile(index: number): void { if (!this.saving && !this.preparingBatch) this.files = this.files.filter((_, i) => i !== index); }
  submit(): void {
    if (this.saving || this.preparingBatch || this.removingId !== null || this.loading || this.loadError || !this.summary?.entries.length || !this.batchesEnabled && !this.summary.pricingComplete) return;
    this.error = ''; this.success = '';
    if (this.amount.invalid || !this.files.length) {
      this.amount.markAsTouched(); this.error = 'Indica el monto transferido y adjunta al menos un comprobante.'; return;
    }
    if (this.batchesEnabled && !this.selectedBatch) {
      if (!this.tariffBatches) { this.error = 'Selecciona el lote de deportistas que cubre este pago.'; return; }
      const enteredAmount = this.amount.value!;
      this.preparingBatch = true;
      this.batchPreparation = this.tariffBatches.preparePayment(enteredAmount)
        .pipe(finalize(() => { this.preparingBatch = false; this.cdr.markForCheck(); }))
        .subscribe({
          next: batch => {
            this.selectBatch({ enabled: true, batch: { ...batch, status: 'UNPAID', createdAt: '', presaleEndAt: null, items: [] } });
            this.preparingBatch = false;
            if (enteredAmount > batch.total) {
              this.error = 'El total del lote se actualizó. Revisa el monto antes de enviar el comprobante.';
              return;
            }
            this.amount.setValue(enteredAmount);
            this.submit();
          },
          error: error => {
            this.error = error instanceof Error ? error.message : enrollmentErrorMessage(error);
            this.cdr.markForCheck();
          }
        });
      return;
    }
    if (this.selectedBatch && this.amount.value! > (this.selectedBatch.availableAmount ?? this.selectedBatch.balance ?? this.selectedBatch.total)) {
      this.error = 'El abono supera el saldo disponible del lote, descontando pagos aprobados y pendientes.'; return;
    }
    const signature = JSON.stringify([this.selectedBatch?.id, this.amount.value, this.files.map(f => [f.name, f.size, f.lastModified])]);
    if (!this.requestId || signature !== this.requestSignature) {
      this.requestId = crypto.randomUUID(); this.requestSignature = signature;
    }
    this.saving = true; this.amount.disable();
    (this.selectedBatch
      ? this.service.upload(this.eventId, this.academyId, this.amount.value!, this.requestId, this.files, this.selectedBatch.id)
      : this.service.upload(this.eventId, this.academyId, this.amount.value!, this.requestId, this.files))
      .pipe(finalize(() => { this.saving = false; this.amount.enable(); this.cdr.markForCheck(); }))
      .subscribe({ next: () => {
        this.success = 'Comprobantes enviados. Pendientes de aprobación del organizador.';
        this.files = []; this.amount.reset(); this.requestId = null; this.load();
        this.selectedBatch = null;
      }, error: error => this.error = enrollmentErrorMessage(error) });
  }
  download(receipt: TransferReceipt): void {
    this.service.download(receipt.id).subscribe({ next: blob => {
      const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = receipt.fileName || 'comprobante'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, error: () => { this.error = 'No fue posible descargar el comprobante.'; this.cdr.markForCheck(); } });
  }
}
