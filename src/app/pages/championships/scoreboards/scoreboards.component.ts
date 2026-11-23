import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { finalize } from 'rxjs';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { EventInvitation } from '../invitations/event-invitation.model';
import { EventInvitationsService } from '../invitations/event-invitations.service';

@Component({
  selector: 'bte-scoreboards',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    VexBreadcrumbsComponent,
    VexPageLayoutComponent,
    VexPageLayoutContentDirective,
    VexPageLayoutHeaderDirective
  ],
  template: ` <vex-page-layout>
    <vex-page-layout-header class="pb-16">
      <div class="px-6">
        <vex-breadcrumbs
          [crumbs]="['Campeonatos', 'Scoreboards']"></vex-breadcrumbs>
        <h1 class="title mt-2 mb-0">Scoreboards</h1>
        <p class="text-secondary mt-1 mb-0">
          Selecciona el reglamento y el campeonato que utilizará el marcador.
        </p>
      </div>
    </vex-page-layout-header>

    <vex-page-layout-content class="-mt-6">
      <mat-card class="scoreboard-card">
        <div *ngIf="loading" class="state">
          <mat-spinner diameter="44"></mat-spinner
          ><span>Cargando campeonatos...</span>
        </div>
        <div *ngIf="!loading && loadError" class="state error">
          <mat-icon svgIcon="mat:error_outline"></mat-icon>
          <h2>No pudimos cargar los campeonatos.</h2>
          <p>Verifica la conexión con la API e inténtalo nuevamente.</p>
        </div>

        <ng-container *ngIf="!loading && !loadError">
          <div class="selection-grid">
            <mat-form-field appearance="outline">
              <mat-label>Tipo de campeonato</mat-label>
              <mat-select
                [(ngModel)]="selectedAssociationType"
                (selectionChange)="onAssociationChange()">
                <mat-option
                  *ngFor="let type of associationTypes"
                  [value]="type"
                  >{{ type }}</mat-option
                >
              </mat-select>
              <mat-hint>Definido por event.association_type</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Campeonato</mat-label>
              <mat-select
                [(ngModel)]="selectedEventId"
                (selectionChange)="selectedArea = null"
                [disabled]="!selectedAssociationType">
                <mat-option
                  *ngFor="let event of filteredEvents"
                  [value]="event.id">
                  {{ event.name }} ·
                  {{ event.eventDateStart | date: 'dd/MM/yyyy' }}
                </mat-option>
              </mat-select>
              <mat-hint
                *ngIf="selectedAssociationType && !filteredEvents.length"
                >No existen eventos configurados con este tipo.</mat-hint
              >
            </mat-form-field>
          </div>

          <section *ngIf="selectedEvent" class="selection-summary">
            <div class="type-badge">{{ selectedEvent.associationType }}</div>
            <div>
              <span>Campeonato</span><strong>{{ selectedEvent.name }}</strong>
            </div>
            <div>
              <span>Fecha</span
              ><strong>{{
                selectedEvent.eventDateStart | date: 'dd/MM/yyyy'
              }}</strong>
            </div>
            <div>
              <span>Academia</span
              ><strong>{{ selectedEvent.academyName || '—' }}</strong>
            </div>
          </section>

          <section *ngIf="selectedEvent" class="areas-section">
            <div class="areas-heading">
              <div>
                <span class="eyebrow">Áreas de competencia</span>
                <h2>Selecciona un área</h2>
              </div>
              <span
                >{{ areaNumbers.length }}
                {{
                  areaNumbers.length === 1
                    ? 'área disponible'
                    : 'áreas disponibles'
                }}</span
              >
            </div>
            <div *ngIf="areaNumbers.length" class="area-buttons">
              <button
                *ngFor="let area of areaNumbers"
                mat-flat-button
                type="button"
                [color]="selectedArea === area ? 'primary' : undefined"
                [class.selected]="selectedArea === area"
                (click)="selectedArea = area">
                <mat-icon svgIcon="mat:tv"></mat-icon>Área {{ area }}
              </button>
            </div>
            <div *ngIf="!areaNumbers.length" class="area-empty">
              Este campeonato no tiene áreas configuradas.
            </div>
          </section>

          <div *ngIf="!events.length" class="state compact">
            <mat-icon svgIcon="mat:assessment"></mat-icon>
            <p>No hay campeonatos disponibles.</p>
          </div>
          <div
            *ngIf="events.length && !associationTypes.length"
            class="state compact">
            <mat-icon svgIcon="mat:info"></mat-icon>
            <p>
              Los campeonatos existentes no tienen configurado association_type.
            </p>
          </div>
        </ng-container>
      </mat-card>
    </vex-page-layout-content>
  </vex-page-layout>`,
  styles: [
    `
      .scoreboard-card {
        padding: 1.5rem;
      }
      .selection-grid {
        display: grid;
        grid-template-columns: 1fr 2fr;
        gap: 1.5rem;
      }
      .state {
        min-height: 18rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        text-align: center;
        color: var(--vex-text-color-secondary);
      }
      .state mat-icon {
        width: 3rem;
        height: 3rem;
        font-size: 3rem;
      }
      .compact {
        min-height: 12rem;
      }
      .error {
        color: #b91c1c;
      }
      .selection-summary {
        display: grid;
        grid-template-columns: auto repeat(3, minmax(0, 1fr));
        align-items: center;
        gap: 1.5rem;
        margin-top: 1rem;
        padding: 1.25rem;
        border-radius: 0.75rem;
        background: var(--vex-background-hover);
      }
      .selection-summary div:not(.type-badge) {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .selection-summary span {
        font-size: 0.75rem;
        color: var(--vex-text-color-secondary);
      }
      .type-badge {
        padding: 0.45rem 0.85rem;
        border-radius: 999px;
        background: rgb(var(--vex-color-primary-100));
        color: rgb(var(--vex-color-primary-700));
        font-weight: 700;
      }
      .areas-section {
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 1px solid var(--vex-divider-color);
      }
      .areas-heading {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      .areas-heading h2 {
        margin: 0.2rem 0 0;
      }
      .areas-heading > span,
      .eyebrow {
        color: var(--vex-text-color-secondary);
        font-size: 0.8rem;
      }
      .eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 700;
      }
      .area-buttons {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 1rem;
      }
      .area-buttons button {
        min-height: 64px;
        border: 1px solid var(--vex-divider-color);
        background: var(--vex-card-background);
      }
      .area-buttons button.selected {
        border-color: rgb(var(--vex-color-primary-500));
        background: rgb(var(--vex-color-primary-500));
        color: white;
      }
      .area-empty {
        padding: 1.5rem;
        border-radius: 0.75rem;
        background: var(--vex-background-hover);
        color: var(--vex-text-color-secondary);
        text-align: center;
      }
      @media (max-width: 800px) {
        .selection-grid,
        .selection-summary {
          grid-template-columns: 1fr;
        }
        .areas-heading {
          align-items: start;
          flex-direction: column;
        }
      }
    `
  ]
})
export class ScoreboardsComponent implements OnInit {
  events: EventInvitation[] = [];
  selectedAssociationType = '';
  selectedEventId: number | null = null;
  selectedArea: number | null = null;
  loading = true;
  loadError = false;

  constructor(
    private readonly eventsService: EventInvitationsService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.eventsService
      .getEvents()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (events) => {
          this.events = events;
          this.selectedAssociationType = this.associationTypes[0] ?? '';
          this.selectedEventId = this.filteredEvents[0]?.id ?? null;
        },
        error: () => {
          this.loadError = true;
          this.events = [];
        }
      });
  }

  get associationTypes(): string[] {
    return [
      ...new Set(
        this.events
          .map((event) => event.associationType?.trim().toUpperCase())
          .filter((type): type is string => !!type)
      )
    ].sort();
  }
  get filteredEvents(): EventInvitation[] {
    return this.events.filter(
      (event) =>
        event.associationType?.trim().toUpperCase() ===
        this.selectedAssociationType
    );
  }
  get selectedEvent(): EventInvitation | undefined {
    return this.events.find((event) => event.id === this.selectedEventId);
  }
  get areaNumbers(): number[] {
    const total = Math.max(
      0,
      Math.trunc(this.selectedEvent?.numberOfAreas ?? 0)
    );
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  onAssociationChange(): void {
    this.selectedEventId = this.filteredEvents[0]?.id ?? null;
    this.selectedArea = null;
  }
}
