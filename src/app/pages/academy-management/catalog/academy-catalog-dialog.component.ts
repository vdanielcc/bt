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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize, forkJoin, Observable } from 'rxjs';
import {
  AcademyRoom,
  AcademyStyle,
  MartialArtStyle,
  SportsAssociationOption,
  TrainingModality
} from '../models/academy-management.models';
import { AcademyManagementService } from '../services/academy-management.service';
import { GradingManagementService } from '../services/grading-management.service';
import { academyAgeOrder, requiredTrimmed } from './academy-catalog.validators';
import { AcademyConfirmDialogComponent } from '../shared/academy-confirm-dialog.component';

type CatalogKind = 'modalities' | 'rooms';
interface CatalogDialogData {
  kind: CatalogKind;
  academyId: number;
  item?: TrainingModality | AcademyRoom;
}

@Component({
  selector: 'bte-academy-catalog-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatSnackBarModule
  ],
  template: `<h2 mat-dialog-title>
      {{ data.item ? 'Editar' : 'Crear' }}
      {{ data.kind === 'rooms' ? 'sala' : 'modalidad' }}
    </h2>
    <mat-dialog-content [formGroup]="form" class="form-grid">
      <mat-form-field *ngIf="data.kind === 'modalities'"
        ><mat-label>Código</mat-label><input matInput formControlName="code"
      /></mat-form-field>
      <mat-form-field
        ><mat-label>Nombre</mat-label
        ><input matInput formControlName="name" required /><mat-error
          >El nombre es obligatorio.</mat-error
        ></mat-form-field
      >
      <mat-form-field class="wide"
        ><mat-label>Descripción</mat-label
        ><textarea matInput formControlName="description"></textarea>
      </mat-form-field>
      <ng-container *ngIf="data.kind === 'modalities'">
        <mat-form-field class="wide"
          ><mat-label>Estilo / Federación (opcional)</mat-label
          ><mat-select formControlName="academyStyleId"
            ><mat-option [value]="null">Sin estilo</mat-option
            ><mat-option
              *ngFor="let style of academyStyles"
              [value]="style.id"
              [disabled]="
                !style.isActive &&
                style.id !== form.controls.academyStyleId.value
              "
              >{{ styleLabel(style) }}</mat-option
            ></mat-select
          ></mat-form-field
        >
        <mat-form-field
          ><mat-label>Edad mínima</mat-label
          ><input matInput type="number" formControlName="minimumAge"
        /></mat-form-field>
        <mat-form-field
          ><mat-label>Edad máxima</mat-label
          ><input matInput type="number" formControlName="maximumAge"
        /></mat-form-field>
      </ng-container>
      <p *ngIf="form.hasError('ageOrder')" class="wide text-red-600">
        La edad mínima no puede superar la edad máxima.
      </p>
      <p *ngIf="stylesError" class="wide text-red-600">
        {{ stylesError }}
        <button mat-button (click)="loadStyles()">Reintentar</button>
      </p>
      <mat-form-field *ngIf="data.kind === 'rooms'"
        ><mat-label>Capacidad</mat-label
        ><input matInput type="number" formControlName="capacity"
      /></mat-form-field>
      <mat-slide-toggle formControlName="isActive">Activo</mat-slide-toggle>
    </mat-dialog-content>
    <mat-dialog-actions align="end"
      ><button mat-button [disabled]="saving" mat-dialog-close>Cancelar</button
      ><button
        mat-flat-button
        color="primary"
        [disabled]="saving || loadingStyles || !!stylesError"
        (click)="save()">
        {{ saving ? 'Guardando...' : 'Guardar' }}
      </button></mat-dialog-actions
    >`,
  styles: [
    `
      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        padding-top: 0.5rem;
      }
      .wide {
        grid-column: 1/-1;
      }
      @media (max-width: 599px) {
        .form-grid {
          grid-template-columns: 1fr;
        }
        .wide {
          grid-column: auto;
        }
      }
    `
  ]
})
export class AcademyCatalogDialogComponent {
  saving = false;
  loadingStyles = false;
  stylesError = '';
  academyStyles: AcademyStyle[] = [];
  styles: MartialArtStyle[] = [];
  associations: SportsAssociationOption[] = [];
  form = this.fb.group(
    {
      academyStyleId: [null as number | null],
      code: ['', Validators.maxLength(30)],
      name: ['', [requiredTrimmed, Validators.maxLength(100)]],
      description: ['', Validators.maxLength(500)],
      minimumAge: [null as number | null, Validators.min(0)],
      maximumAge: [null as number | null, Validators.min(0)],
      capacity: [null as number | null, Validators.min(1)],
      isActive: [true]
    },
    { validators: academyAgeOrder }
  );
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: CatalogDialogData,
    private fb: FormBuilder,
    private service: AcademyManagementService,
    private ref: MatDialogRef<AcademyCatalogDialogComponent>,
    private grading: GradingManagementService,
    private snack: MatSnackBar,
    private dialog: MatDialog
  ) {
    if (data.item) this.form.patchValue(data.item);
    if (data.kind === 'modalities') this.loadStyles();
  }
  loadStyles(): void {
    this.loadingStyles = true;
    this.stylesError = '';
    forkJoin({
      academyStyles: this.grading.getAcademyStyles(this.data.academyId),
      styles: this.grading.getMartialArtStyles(),
      associations: this.grading.getSportsAssociations()
    })
      .pipe(finalize(() => (this.loadingStyles = false)))
      .subscribe({
        next: (result) => {
          this.academyStyles = result.academyStyles;
          this.styles = result.styles;
          this.associations = result.associations;
        },
        error: (error) =>
          (this.stylesError =
            error?.error?.message ??
            'No fue posible cargar estilos y federaciones.')
      });
  }
  styleLabel(value: AcademyStyle): string {
    const style =
      this.styles.find((x) => x.id === value.styleId)?.name ??
      'Estilo no disponible';
    const association = this.associations.find(
      (x) => x.id === value.sportsAssociationId
    )?.name;
    return `${style} / ${association ?? 'Sin federación'}`;
  }
  save(confirmed = false): void {
    if (this.saving || this.loadingStyles || this.stylesError) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snack.open(
        'Revisa el nombre, las edades y la capacidad.',
        'Cerrar',
        { duration: 4000 }
      );
      return;
    }
    if (
      !confirmed &&
      this.data.item?.isActive &&
      !this.form.controls.isActive.value
    ) {
      this.dialog
        .open(AcademyConfirmDialogComponent, {
          data: {
            message: `¿Desactivar ${this.data.item.name}? Se conservará su historial.`
          }
        })
        .afterClosed()
        .subscribe((value) => {
          if (value) this.save(true);
        });
      return;
    }
    this.saving = true;
    const raw = this.form.getRawValue();
    const current = this.data.item;
    const request: Observable<unknown> =
      this.data.kind === 'rooms'
        ? current
          ? this.service.updateRoom(current.id, {
              ...current,
              name: raw.name,
              description: raw.description,
              capacity: raw.capacity,
              isActive: !!raw.isActive
            } as AcademyRoom)
          : this.service.createRoom(this.data.academyId, {
              academyId: this.data.academyId,
              name: raw.name,
              description: raw.description,
              capacity: raw.capacity,
              isActive: !!raw.isActive
            })
        : current
          ? this.service.updateTrainingModality(current.id, {
              ...current,
              academyStyleId: raw.academyStyleId,
              code: raw.code,
              name: raw.name,
              description: raw.description,
              minimumAge: raw.minimumAge,
              maximumAge: raw.maximumAge,
              isActive: !!raw.isActive
            } as TrainingModality)
          : this.service.createTrainingModality(this.data.academyId, {
              academyId: this.data.academyId,
              academyStyleId: raw.academyStyleId,
              code: raw.code,
              name: raw.name,
              description: raw.description,
              minimumAge: raw.minimumAge,
              maximumAge: raw.maximumAge,
              isActive: !!raw.isActive
            });
    request
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => this.ref.close(true),
        error: (error) =>
          this.snack.open(
            error?.error?.message ?? 'No fue posible guardar los datos.',
            'Cerrar',
            { duration: 5000 }
          )
      });
  }
}
