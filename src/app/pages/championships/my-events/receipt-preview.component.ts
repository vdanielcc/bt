import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({ standalone: true, imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `<h2 mat-dialog-title>Comprobante de transferencia</h2><mat-dialog-content>
    <img *ngIf="image" [src]="url" alt="Comprobante de transferencia" style="max-width:100%;max-height:70vh">
    <iframe *ngIf="!image" [src]="safeUrl" title="Comprobante de transferencia" style="width:100%;height:70vh;border:0"></iframe>
    </mat-dialog-content><mat-dialog-actions align="end"><button mat-button mat-dialog-close>Cerrar</button></mat-dialog-actions>` })
export class ReceiptPreviewComponent implements OnDestroy {
  readonly url: string; readonly safeUrl: SafeResourceUrl; readonly image: boolean;
  constructor(@Inject(MAT_DIALOG_DATA) blob: Blob, sanitizer: DomSanitizer) {
    this.url = URL.createObjectURL(blob); this.safeUrl = sanitizer.bypassSecurityTrustResourceUrl(this.url);
    this.image = blob.type.startsWith('image/');
  }
  ngOnDestroy(): void { URL.revokeObjectURL(this.url); }
}
