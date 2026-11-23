import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { finalize, forkJoin, Observable } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import {
  AcademyRoom,
  AcademyStyle,
  MartialArtStyle,
  SportsAssociationOption,
  TrainingModality
} from '../models/academy-management.models';
import { AcademyManagementService } from '../services/academy-management.service';
import { AcademyCatalogDialogComponent } from './academy-catalog-dialog.component';
import { GradingManagementService } from '../services/grading-management.service';
import { AcademyConfirmDialogComponent } from '../shared/academy-confirm-dialog.component';

@Component({
  selector: 'bte-academy-catalog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    VexBreadcrumbsComponent,
    VexPageLayoutComponent,
    VexPageLayoutContentDirective,
    VexPageLayoutHeaderDirective
  ],
  template: `<vex-page-layout
    ><vex-page-layout-header class="pb-16 flex items-center"
      ><div class="px-6 flex-1">
        <vex-breadcrumbs [crumbs]="['Academia', title]"></vex-breadcrumbs>
        <h1 class="title mt-2 mb-0">{{ title }}</h1>
      </div>
      <button class="mr-6" mat-flat-button color="primary" (click)="open()">
        <mat-icon svgIcon="mat:add"></mat-icon>Nuevo
      </button></vex-page-layout-header
    >
    <vex-page-layout-content class="-mt-6"
      ><div class="card overflow-auto">
        <mat-form-field class="m-4"
          ><mat-label>Buscar por nombre o código</mat-label
          ><input matInput (input)="searchChanged($event)"
        /></mat-form-field>
        <div *ngIf="!loading && error" class="state">
          {{ error }} <button mat-button (click)="load()">Reintentar</button>
        </div>
        <div *ngIf="!loading && !error && !filteredItems.length" class="state">
          {{
            search
              ? 'No hay resultados para esta búsqueda.'
              : kind === 'rooms'
                ? 'Aún no existen salas. Crea la primera sala para configurar las clases.'
                : 'Aún no existen modalidades de entrenamiento. Crea la primera modalidad para configurar las clases.'
          }}
        </div>
        <div *ngIf="loading" class="state">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
        <table
          *ngIf="!loading && !error && filteredItems.length"
          mat-table
          [dataSource]="filteredItems"
          class="w-full">
          <ng-container matColumnDef="style"
            ><th mat-header-cell *matHeaderCellDef>Estilo / Federación</th>
            <td mat-cell *matCellDef="let row">
              {{ styleName(row) }}
            </td></ng-container
          >
          <ng-container matColumnDef="minimumAge"
            ><th mat-header-cell *matHeaderCellDef>Edad mínima</th>
            <td mat-cell *matCellDef="let row">
              {{ row.minimumAge ?? '—' }}
            </td></ng-container
          >
          <ng-container matColumnDef="maximumAge"
            ><th mat-header-cell *matHeaderCellDef>Edad máxima</th>
            <td mat-cell *matCellDef="let row">
              {{ row.maximumAge ?? '—' }}
            </td></ng-container
          >
          <ng-container matColumnDef="description"
            ><th mat-header-cell *matHeaderCellDef>Descripción</th>
            <td mat-cell *matCellDef="let row">
              {{ row.description || '—' }}
            </td></ng-container
          >
          <ng-container matColumnDef="code"
            ><th mat-header-cell *matHeaderCellDef>Código</th>
            <td mat-cell *matCellDef="let row">
              {{ row.code || '—' }}
            </td></ng-container
          >
          <ng-container matColumnDef="name"
            ><th mat-header-cell *matHeaderCellDef>Nombre</th>
            <td mat-cell *matCellDef="let row">{{ row.name }}</td></ng-container
          >
          <ng-container matColumnDef="detail"
            ><th mat-header-cell *matHeaderCellDef>
              {{ kind === 'rooms' ? 'Capacidad' : 'Rango de edad' }}
            </th>
            <td mat-cell *matCellDef="let row">
              {{ detail(row) }}
            </td></ng-container
          >
          <ng-container matColumnDef="status"
            ><th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let row">
              {{ row.isActive ? 'Activo' : 'Inactivo' }}
            </td></ng-container
          >
          <ng-container matColumnDef="actions"
            ><th mat-header-cell *matHeaderCellDef>Acciones</th>
            <td mat-cell *matCellDef="let row">
              <button mat-icon-button (click)="open(row)">
                <mat-icon svgIcon="mat:edit"></mat-icon></button
              ><button
                mat-icon-button
                [disabled]="busy"
                [attr.aria-label]="row.isActive ? 'Desactivar' : 'Activar'"
                (click)="toggle(row)">
                <mat-icon
                  [svgIcon]="
                    row.isActive ? 'mat:toggle_off' : 'mat:toggle_on'
                  "></mat-icon>
              </button></td
          ></ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table></div></vex-page-layout-content
  ></vex-page-layout>`,
  styles: [
    `
      .state {
        min-height: 16rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    `
  ]
})
export class AcademyCatalogComponent implements OnInit {
  kind: 'modalities' | 'rooms' = 'modalities';
  academyId = 0;
  items: Array<TrainingModality | AcademyRoom> = [];
  loading = true;
  busy = false;
  error = '';
  search = '';
  searchChanged(event: Event): void {
    this.search = (event.target as HTMLInputElement).value;
  }
  academyStyles: AcademyStyle[] = [];
  styles: MartialArtStyle[] = [];
  associations: SportsAssociationOption[] = [];
  get filteredItems(): Array<TrainingModality | AcademyRoom> {
    const q = this.search.toLocaleLowerCase().trim();
    return this.items.filter((x) =>
      `${x.name ?? ''} ${'code' in x ? x.code ?? '' : ''}`
        .toLocaleLowerCase()
        .includes(q)
    );
  }
  get title(): string {
    return this.kind === 'rooms' ? 'Salas' : 'Modalidades de entrenamiento';
  }
  get columns(): string[] {
    return this.kind === 'rooms'
      ? ['name', 'detail', 'description', 'status', 'actions']
      : [
          'code',
          'name',
          'style',
          'minimumAge',
          'maximumAge',
          'status',
          'actions'
        ];
  }
  constructor(
    private route: ActivatedRoute,
    private service: AcademyManagementService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private grading: GradingManagementService
  ) {}
  ngOnInit(): void {
    this.kind = this.route.snapshot.data['kind'];
    this.academyId = Number(this.route.snapshot.paramMap.get('academyId'));
    this.load();
  }
  load(): void {
    this.loading = true;
    this.error = '';
    this.items = [];
    const request: Observable<Array<TrainingModality | AcademyRoom>> =
      this.kind === 'rooms'
        ? this.service.getRooms(this.academyId)
        : this.service.getTrainingModalities(this.academyId);
    const lookup: Observable<
      | Array<TrainingModality | AcademyRoom>
      | {
          items: Array<TrainingModality | AcademyRoom>;
          academyStyles: AcademyStyle[];
          styles: MartialArtStyle[];
          associations: SportsAssociationOption[];
        }
    > =
      this.kind === 'modalities'
        ? forkJoin({
            items: request,
            academyStyles: this.grading.getAcademyStyles(this.academyId),
            styles: this.grading.getMartialArtStyles(),
            associations: this.grading.getSportsAssociations()
          })
        : request;
    lookup.pipe(finalize(() => (this.loading = false))).subscribe({
      next: (rows) => {
        if (Array.isArray(rows)) this.items = rows;
        else {
          this.items = rows.items;
          this.academyStyles = rows.academyStyles;
          this.styles = rows.styles;
          this.associations = rows.associations;
        }
      },
      error: (e) =>
        (this.error = e?.error?.message ?? 'No fue posible cargar los datos.')
    });
  }
  styleName(row: TrainingModality | AcademyRoom): string {
    if (!('academyStyleId' in row) || row.academyStyleId == null)
      return 'Sin estilo';
    const association = this.academyStyles.find(
      (x) => x.id === row.academyStyleId
    );
    if (!association) return 'Estilo no disponible';
    return `${this.styles.find((x) => x.id === association.styleId)?.name ?? 'Estilo no disponible'} / ${this.associations.find((x) => x.id === association.sportsAssociationId)?.name ?? 'Sin federación'}`;
  }
  detail(row: TrainingModality | AcademyRoom): string | number {
    return this.kind === 'rooms'
      ? (row as AcademyRoom).capacity ?? 'Sin límite'
      : `${(row as TrainingModality).minimumAge ?? '—'} a ${(row as TrainingModality).maximumAge ?? '—'} años`;
  }
  open(item?: TrainingModality | AcademyRoom): void {
    this.dialog
      .open(AcademyCatalogDialogComponent, {
        width: '680px',
        maxWidth: '95vw',
        data: { kind: this.kind, academyId: this.academyId, item }
      })
      .afterClosed()
      .subscribe((saved) => saved && this.load());
  }
  toggle(item: TrainingModality | AcademyRoom): void {
    if (this.busy) return;
    if (item.isActive)
      this.dialog
        .open(AcademyConfirmDialogComponent, {
          data: {
            message: `¿Desactivar ${item.name}? Se conservará su historial.`
          }
        })
        .afterClosed()
        .subscribe((confirmed) => {
          if (confirmed) this.setActive(item);
        });
    else this.setActive(item);
  }
  private setActive(item: TrainingModality | AcademyRoom): void {
    this.busy = true;
    const request: Observable<void> =
      this.kind === 'rooms'
        ? this.service.updateRoom(item.id, {
            ...item,
            isActive: !item.isActive
          } as AcademyRoom)
        : this.service.updateTrainingModality(item.id, {
            ...item,
            isActive: !item.isActive
          } as TrainingModality);
    request.pipe(finalize(() => (this.busy = false))).subscribe({
      next: () => this.load(),
      error: (e) =>
        this.snack.open(
          e?.error?.message ?? 'No fue posible actualizar el estado.',
          'Cerrar',
          { duration: 4500 }
        )
    });
  }
}
