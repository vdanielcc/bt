import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { finalize } from 'rxjs';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { AcademyInstructor } from '../models/academy-management.models';
import { AcademyManagementService } from '../services/academy-management.service';
import { InstructorFormDialogComponent } from './instructor-form-dialog.component';
import { AcademyConfirmDialogComponent } from '../shared/academy-confirm-dialog.component';

@Component({
  selector: 'bte-instructor-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTableModule,
    VexBreadcrumbsComponent,
    VexPageLayoutComponent,
    VexPageLayoutContentDirective,
    VexPageLayoutHeaderDirective
  ],
  template: `<vex-page-layout
    ><vex-page-layout-header class="pb-16 flex items-center"
      ><div class="px-6 flex-1">
        <vex-breadcrumbs
          [crumbs]="['Academia', 'Instructores']"></vex-breadcrumbs>
        <h1 class="title mt-2 mb-0">Instructores</h1>
      </div>
      <button mat-flat-button color="primary" class="mr-6" (click)="open()">
        <mat-icon svgIcon="mat:add"></mat-icon>Registrar instructor
      </button></vex-page-layout-header
    ><vex-page-layout-content class="-mt-6"
      ><div class="card overflow-auto">
        <mat-form-field class="m-4"
          ><mat-label>Buscar instructor</mat-label
          ><input matInput (input)="searchChanged($event)"
        /></mat-form-field>
        <div class="state" *ngIf="!loading && error">
          {{ error }} <button mat-button (click)="load()">Reintentar</button>
        </div>
        <div class="state" *ngIf="!loading && !error && !filtered.length">
          {{
            search
              ? 'No hay resultados para esta búsqueda.'
              : 'Aún no hay instructores. Agrega una persona existente para comenzar.'
          }}
        </div>
        <div *ngIf="loading" class="state">
          <mat-spinner diameter="42"></mat-spinner>
        </div>
        <table
          *ngIf="!loading && !error && filtered.length"
          mat-table
          [dataSource]="filtered"
          class="w-full">
          <ng-container matColumnDef="person"
            ><th mat-header-cell *matHeaderCellDef>Instructor</th>
            <td mat-cell *matCellDef="let row">
              <a [routerLink]="[row.id]">{{
                row.personName || 'Nombre no disponible'
              }}</a>
            </td></ng-container
          ><ng-container matColumnDef="title"
            ><th mat-header-cell *matHeaderCellDef>Título</th>
            <td mat-cell *matCellDef="let row">
              {{ row.title || '—' }}
            </td></ng-container
          ><ng-container matColumnDef="license"
            ><th mat-header-cell *matHeaderCellDef>Licencia</th>
            <td mat-cell *matCellDef="let row">
              {{ row.licenseNumber || '—' }}
            </td></ng-container
          ><ng-container matColumnDef="start"
            ><th mat-header-cell *matHeaderCellDef>Fecha ingreso</th>
            <td mat-cell *matCellDef="let row">
              {{ row.startDate ? (row.startDate | date: 'dd-MM-yyyy') : '—' }}
            </td></ng-container
          ><ng-container matColumnDef="status"
            ><th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let row">
              {{ row.isActive ? 'Activo' : 'Inactivo' }}
            </td></ng-container
          ><ng-container matColumnDef="actions"
            ><th mat-header-cell *matHeaderCellDef>Acciones</th>
            <td mat-cell *matCellDef="let row">
              <button mat-icon-button (click)="open(row)">
                <mat-icon svgIcon="mat:edit"></mat-icon></button
              ><button
                mat-icon-button
                color="warn"
                [disabled]="busy"
                [attr.aria-label]="
                  row.isActive ? 'Desactivar instructor' : 'Activar instructor'
                "
                (click)="toggle(row)">
                <mat-icon
                  [svgIcon]="
                    row.isActive ? 'mat:person_off' : 'mat:person_add'
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
        min-height: 15rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    `
  ]
})
export class InstructorListComponent implements OnInit {
  academyId = 0;
  instructors: AcademyInstructor[] = [];
  loading = true;
  error = '';
  search = '';
  busy = false;
  get filtered(): AcademyInstructor[] {
    const q = this.search.toLocaleLowerCase().trim();
    return this.instructors.filter((x) =>
      `${x.personName ?? ''} ${x.title ?? ''} ${x.licenseNumber ?? ''}`
        .toLocaleLowerCase()
        .includes(q)
    );
  }
  searchChanged(event: Event): void {
    this.search = (event.target as HTMLInputElement).value;
  }
  columns = ['person', 'title', 'license', 'start', 'status', 'actions'];
  constructor(
    private route: ActivatedRoute,
    private service: AcademyManagementService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}
  ngOnInit(): void {
    this.academyId = Number(this.route.snapshot.paramMap.get('academyId'));
    this.load();
  }
  load(): void {
    this.loading = true;
    this.error = '';
    this.instructors = [];
    this.service
      .getInstructors(this.academyId)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (value) => {
          this.instructors = value;
        },
        error: (e) =>
          (this.error =
            e?.error?.message ?? 'No fue posible cargar instructores.')
      });
  }
  open(instructor?: AcademyInstructor): void {
    this.dialog
      .open(InstructorFormDialogComponent, {
        width: '700px',
        maxWidth: '95vw',
        data: { academyId: this.academyId, instructor }
      })
      .afterClosed()
      .subscribe((saved) => saved && this.load());
  }
  toggle(instructor: AcademyInstructor): void {
    if (this.busy) return;
    if (instructor.isActive)
      this.dialog
        .open(AcademyConfirmDialogComponent, {
          data: {
            message: `¿Desactivar ${instructor.personName ?? 'este instructor'}? Se conservará su historial.`
          }
        })
        .afterClosed()
        .subscribe((confirmed) => {
          if (confirmed) this.setActive(instructor);
        });
    else this.setActive(instructor);
  }
  private setActive(instructor: AcademyInstructor): void {
    this.busy = true;
    this.service
      .updateInstructor(instructor.id, {
        ...instructor,
        isActive: !instructor.isActive
      })
      .pipe(
        finalize(() => {
          this.busy = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => this.load(),
        error: (e) =>
          this.snack.open(
            e?.error?.message ?? 'No fue posible desactivar el instructor.',
            'Cerrar',
            { duration: 5000 }
          )
      });
  }
}
