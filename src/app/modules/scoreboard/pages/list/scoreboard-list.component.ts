import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { ScoreboardApiService } from '../../services/scoreboard-api.service';
@Component({
  selector: 'bte-scoreboard-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatTableModule
  ],
  template: `<main class="page">
    <header>
      <div>
        <h1>{{ history ? 'Historial' : 'Combates' }}</h1>
        <p>Evento {{ eventId }}</p>
      </div>
      <a mat-stroked-button [routerLink]="['/scoreboard/events', eventId]"
        >Volver al control general</a
      >
    </header>
    <mat-card
      ><table mat-table [dataSource]="rows">
        <ng-container matColumnDef="match"
          ><th mat-header-cell *matHeaderCellDef>Combate</th>
          <td mat-cell *matCellDef="let row">
            {{ value(row, 'matchNumber', 'matchId', 'action') }}
          </td></ng-container
        ><ng-container matColumnDef="area"
          ><th mat-header-cell *matHeaderCellDef>Tatami</th>
          <td mat-cell *matCellDef="let row">
            {{ value(row, 'areaId', 'area') }}
          </td></ng-container
        ><ng-container matColumnDef="category"
          ><th mat-header-cell *matHeaderCellDef>Categoría</th>
          <td mat-cell *matCellDef="let row">
            {{ value(row, 'categoryName', 'category') }}
          </td></ng-container
        ><ng-container matColumnDef="modality"
          ><th mat-header-cell *matHeaderCellDef>Modalidad</th>
          <td mat-cell *matCellDef="let row">
            {{ value(row, 'modality', 'associationCode') }}
          </td></ng-container
        ><ng-container matColumnDef="status"
          ><th mat-header-cell *matHeaderCellDef>Estado</th>
          <td mat-cell *matCellDef="let row">
            {{ value(row, 'status', 'occurredAt') }}
          </td></ng-container
        >
        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
      <p class="empty" *ngIf="!rows.length">
        {{ loading ? 'Cargando...' : 'No hay registros disponibles.' }}
      </p></mat-card
    >
  </main>`,
  styles: [
    `
      .page {
        padding: 1.5rem;
      }
      .page > header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }
      .page h1,
      .page p {
        margin: 0;
      }
      table {
        width: 100%;
      }
      .empty {
        text-align: center;
        padding: 3rem;
        color: var(--vex-text-color-secondary);
      }
      @media (max-width: 700px) {
        .page > header {
          align-items: flex-start;
          flex-direction: column;
          gap: 1rem;
        }
        .page {
          overflow: auto;
        }
      }
    `
  ]
})
export class ScoreboardListComponent implements OnInit {
  eventId = 0;
  history = false;
  rows: any[] = [];
  loading = true;
  columns = ['match', 'area', 'category', 'modality', 'status'];
  constructor(
    private route: ActivatedRoute,
    private api: ScoreboardApiService,
    private cdr: ChangeDetectorRef
  ) {}
  ngOnInit() {
    this.eventId = Number(this.route.snapshot.paramMap.get('eventId'));
    this.history = this.route.snapshot.data['history'] === true;
    const request = this.history
      ? this.api.getHistory(this.eventId)
      : this.api.getMatches(this.eventId);
    request.subscribe({
      next: (r) => {
        this.rows = r;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }
  value(row: any, ...keys: string[]) {
    for (const key of keys) {
      const value = row?.[key] ?? row?.[key[0].toUpperCase() + key.slice(1)];
      if (value !== undefined && value !== null) return value;
    }
    return '—';
  }
}
