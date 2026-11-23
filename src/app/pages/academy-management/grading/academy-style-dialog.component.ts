import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize, Observable } from 'rxjs';
import {
  AcademyStyle,
  MartialArtStyle,
  SportsAssociationOption
} from '../models/academy-management.models';
import { GradingManagementService } from '../services/grading-management.service';
import { requiredTrimmed } from '../catalog/academy-catalog.validators';
import { AcademyConfirmDialogComponent } from '../shared/academy-confirm-dialog.component';

interface StyleDialogData {
  kind: 'catalog' | 'association';
  academyId: number;
  style?: MartialArtStyle;
  association?: AcademyStyle;
  styles: MartialArtStyle[];
  federations: SportsAssociationOption[];
}

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule
  ],
  template: `<h2 mat-dialog-title>
      {{ data.style || data.association ? 'Editar' : 'Agregar' }}
      {{
        data.kind === 'catalog' ? 'estilo / disciplina' : 'estilo y federación'
      }}
    </h2>
    <mat-dialog-content [formGroup]="form" class="grid gap-4 pt-4">
      <ng-container *ngIf="data.kind === 'catalog'; else association">
        <mat-form-field
          ><mat-label>Código</mat-label
          ><input matInput formControlName="code" maxlength="30" /><mat-error
            >Ingresa un código de hasta 30 caracteres.</mat-error
          ></mat-form-field
        >
        <mat-form-field
          ><mat-label>Nombre</mat-label
          ><input matInput formControlName="name" maxlength="100" /><mat-error
            >Ingresa un nombre de hasta 100 caracteres.</mat-error
          ></mat-form-field
        >
        <mat-form-field
          ><mat-label>Descripción</mat-label
          ><textarea
            matInput
            formControlName="description"
            maxlength="500"></textarea>
        </mat-form-field>
      </ng-container>
      <ng-template #association>
        <mat-form-field
          ><mat-label>Estilo / Disciplina</mat-label
          ><mat-select formControlName="styleId"
            ><mat-option
              *ngFor="let style of data.styles"
              [value]="style.id"
              [disabled]="
                !style.isActive && style.id !== data.association?.styleId
              "
              >{{ style.name
              }}{{ style.isActive ? '' : ' (Inactivo)' }}</mat-option
            ></mat-select
          ><mat-error>Selecciona un estilo.</mat-error></mat-form-field
        >
        <mat-form-field
          ><mat-label>Federación / Asociación (opcional)</mat-label
          ><mat-select formControlName="sportsAssociationId"
            ><mat-option [value]="null">Sin federación</mat-option
            ><mat-option
              *ngFor="let federation of data.federations"
              [value]="federation.id"
              >{{ federation.name }}</mat-option
            ></mat-select
          ></mat-form-field
        >
        <mat-slide-toggle formControlName="isPrimary"
          >Principal</mat-slide-toggle
        >
      </ng-template>
      <mat-slide-toggle formControlName="isActive">Activo</mat-slide-toggle>
    </mat-dialog-content>
    <mat-dialog-actions align="end"
      ><button mat-button [disabled]="saving" mat-dialog-close>Cancelar</button
      ><button
        mat-flat-button
        color="primary"
        [disabled]="saving"
        (click)="save()">
        {{ saving ? 'Guardando...' : 'Guardar' }}
      </button></mat-dialog-actions
    >`
})
export class AcademyStyleDialogComponent {
  saving = false;
  form = this.fb.group({
    code: ['', Validators.maxLength(30)],
    name: ['', Validators.maxLength(100)],
    description: ['', Validators.maxLength(500)],
    styleId: [null as number | null],
    sportsAssociationId: [null as number | null],
    isPrimary: [false],
    isActive: [true]
  });
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: StyleDialogData,
    private fb: FormBuilder,
    private service: GradingManagementService,
    private ref: MatDialogRef<AcademyStyleDialogComponent>,
    private snack: MatSnackBar,
    private dialog: MatDialog
  ) {
    if (data.kind === 'catalog') {
      this.form.controls.code.addValidators(requiredTrimmed);
      this.form.controls.name.addValidators(requiredTrimmed);
      if (data.style) this.form.patchValue(data.style);
    } else {
      this.form.controls.styleId.addValidators([
        Validators.required,
        Validators.min(1)
      ]);
      if (data.association) this.form.patchValue(data.association);
    }
  }
  save(confirmed = false): void {
    if (this.saving) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    if (
      !confirmed &&
      (this.data.style?.isActive || this.data.association?.isActive) &&
      !raw.isActive
    ) {
      this.dialog
        .open(AcademyConfirmDialogComponent, {
          data: {
            message: '¿Desactivar este estilo? Se conservará su historial.'
          }
        })
        .afterClosed()
        .subscribe((value) => {
          if (value) this.save(true);
        });
      return;
    }
    let request: Observable<unknown>;
    if (this.data.kind === 'catalog') {
      const value = {
        code: raw.code!.trim(),
        name: raw.name!.trim(),
        description: raw.description,
        isActive: !!raw.isActive
      };
      request = this.data.style
        ? this.service.updateMartialArtStyle(this.data.style.id, {
            ...this.data.style,
            ...value
          })
        : this.service.createMartialArtStyle(value);
    } else {
      const value = {
        academyId: this.data.academyId,
        styleId: raw.styleId!,
        sportsAssociationId: raw.sportsAssociationId,
        isPrimary: !!raw.isActive && !!raw.isPrimary,
        isActive: !!raw.isActive
      };
      request = this.data.association
        ? this.service.updateAcademyStyle(
            this.data.academyId,
            this.data.association.id,
            { ...this.data.association, ...value }
          )
        : this.service.createAcademyStyle(this.data.academyId, value);
    }
    this.saving = true;
    request
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => this.ref.close(true),
        error: (error) =>
          this.snack.open(
            error?.error?.message ?? 'No fue posible guardar el estilo.',
            'Cerrar',
            { duration: 5000 }
          )
      });
  }
}
