import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize, forkJoin, Observable } from 'rxjs';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { AuthService } from '../../../core/auth/auth.service';
import {
  AcademyStyle,
  MartialArtStyle,
  SportsAssociationOption
} from '../models/academy-management.models';
import { GradingManagementService } from '../services/grading-management.service';
import { AcademyStyleDialogComponent } from './academy-style-dialog.component';
import { AcademyConfirmDialogComponent } from '../shared/academy-confirm-dialog.component';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    VexPageLayoutComponent,
    VexPageLayoutHeaderDirective,
    VexPageLayoutContentDirective,
    VexBreadcrumbsComponent
  ],
  template: `<vex-page-layout
    ><vex-page-layout-header class="pb-16 flex items-center"
      ><div class="px-6 flex-1">
        <vex-breadcrumbs
          [crumbs]="['Academia', 'Estilos y federaciones']"></vex-breadcrumbs>
        <h1 class="title mt-2 mb-0">Estilos y federaciones</h1>
        <p>Configura las disciplinas de entrenamiento de la academia.</p>
      </div>
      <button
        class="mr-6"
        mat-flat-button
        color="primary"
        [disabled]="loading || !!error"
        (click)="openAssociation()">
        Agregar
      </button></vex-page-layout-header
    >
    <vex-page-layout-content class="-mt-6"
      ><div class="card p-4 overflow-auto">
        <mat-spinner *ngIf="loading" diameter="40"></mat-spinner>
        <div *ngIf="!loading && error">
          {{ error }} <button mat-button (click)="load()">Reintentar</button>
        </div>
        <ng-container *ngIf="!loading && !error">
          <mat-form-field
            ><mat-label>Buscar estilo o federación</mat-label
            ><input matInput (input)="searchChanged($event)"
          /></mat-form-field>
          <p *ngIf="!filtered.length">
            {{
              search
                ? 'No hay resultados para esta búsqueda.'
                : 'Aún no hay estilos asociados. Agrega el primero para configurar las modalidades.'
            }}
          </p>
          <table
            mat-table
            [dataSource]="filtered"
            class="w-full"
            *ngIf="filtered.length">
            <ng-container matColumnDef="style"
              ><th mat-header-cell *matHeaderCellDef>Estilo</th>
              <td mat-cell *matCellDef="let row">
                {{ styleName(row.styleId) }}
              </td></ng-container
            >
            <ng-container matColumnDef="federation"
              ><th mat-header-cell *matHeaderCellDef>
                Federación / Asociación
              </th>
              <td mat-cell *matCellDef="let row">
                {{ federationName(row.sportsAssociationId) }}
              </td></ng-container
            >
            <ng-container matColumnDef="primary"
              ><th mat-header-cell *matHeaderCellDef>Principal</th>
              <td mat-cell *matCellDef="let row">
                {{ row.isPrimary ? 'Sí' : 'No' }}
              </td></ng-container
            >
            <ng-container matColumnDef="active"
              ><th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let row">
                {{ row.isActive ? 'Activo' : 'Inactivo' }}
              </td></ng-container
            >
            <ng-container matColumnDef="actions"
              ><th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let row">
                <button
                  mat-button
                  [disabled]="busy"
                  (click)="openAssociation(row)">
                  Editar</button
                ><button
                  mat-button
                  [disabled]="busy"
                  *ngIf="row.isActive && !row.isPrimary"
                  (click)="updateAssociation(row, true)">
                  Marcar principal</button
                ><button
                  mat-button
                  [disabled]="busy"
                  (click)="toggleAssociation(row)">
                  {{ row.isActive ? 'Desactivar' : 'Activar' }}
                </button>
              </td></ng-container
            >
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
          <section class="mt-8" *ngIf="isSystemAdmin">
            <div class="flex items-center justify-between">
              <h2>Catálogo de estilos / disciplinas</h2>
              <button mat-flat-button color="primary" (click)="openStyle()">
                Nuevo estilo
              </button>
            </div>
            <table mat-table [dataSource]="styles" class="w-full">
              <ng-container matColumnDef="code"
                ><th mat-header-cell *matHeaderCellDef>Código</th>
                <td mat-cell *matCellDef="let row">
                  {{ row.code }}
                </td></ng-container
              >
              <ng-container matColumnDef="name"
                ><th mat-header-cell *matHeaderCellDef>Nombre</th>
                <td mat-cell *matCellDef="let row">
                  {{ row.name }}
                </td></ng-container
              >
              <ng-container matColumnDef="description"
                ><th mat-header-cell *matHeaderCellDef>Descripción</th>
                <td mat-cell *matCellDef="let row">
                  {{ row.description || '—' }}
                </td></ng-container
              >
              <ng-container matColumnDef="state"
                ><th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let row">
                  {{ row.isActive ? 'Activo' : 'Inactivo' }}
                </td></ng-container
              >
              <ng-container matColumnDef="actions"
                ><th mat-header-cell *matHeaderCellDef>Acciones</th>
                <td mat-cell *matCellDef="let row">
                  <button mat-button (click)="openStyle(row)">Editar</button
                  ><button
                    mat-button
                    [disabled]="busy"
                    (click)="toggleStyle(row)">
                    {{ row.isActive ? 'Desactivar' : 'Activar' }}
                  </button>
                </td></ng-container
              >
              <tr mat-header-row *matHeaderRowDef="catalogColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: catalogColumns"></tr>
            </table>
            <p *ngIf="!styles.length">
              Aún no existen estilos. Crea el primero.
            </p>
          </section>
        </ng-container>
      </div></vex-page-layout-content
    ></vex-page-layout
  >`
})
export class AcademyStylesComponent implements OnInit {
  academyId = 0;
  loading = true;
  busy = false;
  error = '';
  search = '';
  associations: AcademyStyle[] = [];
  styles: MartialArtStyle[] = [];
  federations: SportsAssociationOption[] = [];
  columns = ['style', 'federation', 'primary', 'active', 'actions'];
  catalogColumns = ['code', 'name', 'description', 'state', 'actions'];
  get isSystemAdmin(): boolean {
    return this.auth.getCurrentUser()?.rol === 'admin';
  }
  get filtered(): AcademyStyle[] {
    const q = this.search.trim().toLocaleLowerCase();
    return this.associations.filter((x) =>
      `${this.styleName(x.styleId)} ${this.federationName(x.sportsAssociationId)}`
        .toLocaleLowerCase()
        .includes(q)
    );
  }
  constructor(
    private route: ActivatedRoute,
    private service: GradingManagementService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private auth: AuthService
  ) {}
  ngOnInit(): void {
    this.academyId = Number(this.route.snapshot.paramMap.get('academyId'));
    this.load();
  }
  searchChanged(event: Event): void {
    this.search = (event.target as HTMLInputElement).value;
  }
  load(): void {
    this.loading = true;
    this.error = '';
    forkJoin({
      associations: this.service.getAcademyStyles(this.academyId),
      styles: this.service.getMartialArtStyles(),
      federations: this.service.getSportsAssociations()
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          this.associations = result.associations;
          this.styles = result.styles;
          this.federations = result.federations;
        },
        error: (error) =>
          (this.error =
            error?.error?.message ??
            'No fue posible cargar estilos y federaciones.')
      });
  }
  styleName(id: number): string {
    return this.styles.find((x) => x.id === id)?.name ?? 'Estilo no disponible';
  }
  federationName(id: number | null): string {
    return id == null
      ? 'Sin federación'
      : this.federations.find((x) => x.id === id)?.name ??
          'Federación no disponible';
  }
  openAssociation(association?: AcademyStyle): void {
    this.open({ kind: 'association', association });
  }
  openStyle(style?: MartialArtStyle): void {
    if (this.isSystemAdmin) this.open({ kind: 'catalog', style });
  }
  private open(value: {
    kind: 'catalog' | 'association';
    style?: MartialArtStyle;
    association?: AcademyStyle;
  }): void {
    this.dialog
      .open(AcademyStyleDialogComponent, {
        width: '620px',
        maxWidth: '95vw',
        data: {
          ...value,
          academyId: this.academyId,
          styles: this.styles,
          federations: this.federations
        }
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.load();
      });
  }
  updateAssociation(row: AcademyStyle, primary = false): void {
    this.save(
      this.service.updateAcademyStyle(this.academyId, row.id, {
        ...row,
        isPrimary: primary ? true : row.isPrimary,
        isActive: primary ? row.isActive : !row.isActive
      })
    );
  }
  toggleAssociation(row: AcademyStyle): void {
    if (row.isActive)
      this.confirm(
        `¿Desactivar ${this.styleName(row.styleId)}? Se conservará su historial.`,
        () => this.save(this.service.deleteAcademyStyle(this.academyId, row.id))
      );
    else this.updateAssociation(row);
  }
  toggleStyle(row: MartialArtStyle): void {
    if (!this.isSystemAdmin) return;
    if (row.isActive)
      this.confirm(
        `¿Desactivar ${row.name}? Se conservarán las asociaciones existentes.`,
        () => this.save(this.service.deleteMartialArtStyle(row.id))
      );
    else
      this.save(
        this.service.updateMartialArtStyle(row.id, { ...row, isActive: true })
      );
  }
  private confirm(message: string, action: () => void): void {
    this.dialog
      .open(AcademyConfirmDialogComponent, { data: { message } })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) action();
      });
  }
  private save(request: Observable<unknown>): void {
    if (this.busy) return;
    this.busy = true;
    request
      .pipe(finalize(() => (this.busy = false)))
      .subscribe({
        next: () => this.load(),
        error: (error) =>
          this.snack.open(
            error?.error?.message ?? 'No fue posible actualizar el estilo.',
            'Cerrar',
            { duration: 5000 }
          )
      });
  }
}
