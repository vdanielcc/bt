import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MedalIssueDialog } from '../../../medal-table/medal-table.component';
import { FixtureResultRow, ScoreboardFixtureResultsService } from '../../services/scoreboard-fixture-results.service';

@Component({ standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDialogModule],
  template: `<main class="page">
    <header><h1>Resultados de categoría · {{ name }}</h1><a mat-button [routerLink]="['/medallero', eventId]">Medallero</a><button mat-stroked-button (click)="load()" [disabled]="busy">Actualizar</button></header>
    <p>Se utilizan los encuentros de la llave oficial guardada. Los podios completos se publican automáticamente.</p>
    <p *ngIf="type === 'ROUNDROBIN'">La clasificación de Round Robin queda pendiente del operador hasta implementar el reglamento por organización. Puede registrar los encuentros y corregir el podio desde Medallero.</p>
    <a mat-flat-button color="primary" *ngIf="association === 'KUDO'" [routerLink]="['/scoreboard/events',eventId,'categories',categoryId,'kudo']">Abrir Scoreboard Kudo</a>
    <p role="alert" *ngIf="error">{{ error }}</p>
    <p *ngIf="!busy && !rows.length">No hay encuentros disponibles en esta categoría.</p>
    <mat-card *ngFor="let row of rows" class="panel">
      <h2>{{ row.label }} · {{ row.version ? 'Resultado confirmado' : 'Pendiente' }}</h2>
      <div class="form">
        <mat-form-field appearance="outline"><mat-label>{{ row.individual ? 'Participante' : 'Ganador' }}</mat-label><mat-select [(ngModel)]="row.competitorId" [disabled]="busy || row.individual"><mat-option *ngFor="let person of row.choices" [value]="person.id">{{ person.name }}</mat-option></mat-select></mat-form-field>
        <mat-form-field appearance="outline" *ngIf="row.individual"><mat-label>Total oficial de Kata</mat-label><input matInput type="number" step="0.001" [(ngModel)]="row.totalScore" [disabled]="busy"></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Decisión</mat-label><mat-select [(ngModel)]="row.decision" (selectionChange)="row.tieOrder = row.decision === 'points' ? null : row.tieOrder" [disabled]="busy"><mat-option value="points">Puntaje</mat-option><mat-option value="vote">Votación</mat-option><mat-option value="new-match">Nuevo encuentro</mat-option></mat-select></mat-form-field>
        <mat-form-field appearance="outline" *ngIf="row.individual && row.decision !== 'points'"><mat-label>Orden tras desempate</mat-label><input matInput type="number" min="1" [(ngModel)]="row.tieOrder" [disabled]="busy"></mat-form-field>
        <button mat-flat-button color="primary" (click)="save(row)" [disabled]="busy || !row.competitorId">Confirmar resultado</button>
      </div>
    </mat-card>
  </main>`,
  styles: [`.page{padding:24px;max-width:1400px;margin:auto}header,.form{display:flex;gap:16px;align-items:center;flex-wrap:wrap}h1{font-size:1.7rem;font-weight:600}h2{font-size:1.2rem;margin-bottom:16px}.panel{padding:24px;margin-top:20px}.form mat-form-field{flex:1 1 200px}p{margin:16px 0}`]
})
export class ScoreboardCategoryResultsComponent implements OnInit {
  association = '';
  eventId = 0; categoryId = 0; name = ''; type = ''; rows: FixtureResultRow[] = []; busy = false; error = '';
  constructor(private route: ActivatedRoute, private api: ScoreboardFixtureResultsService, private dialog: MatDialog) {}
  ngOnInit(): void {
    this.eventId = Number(this.route.snapshot.paramMap.get('eventId')); this.categoryId = Number(this.route.snapshot.paramMap.get('categoryId'));
    void this.load();
  }
  async load(): Promise<void> {
    this.busy = true; this.error = '';
    try {
      const data = await this.api.load(this.eventId, this.categoryId); this.rows = data.rows; this.name = data.name; this.type = data.type; this.association = data.association;
      const incoming = history.state;
      const row = this.rows.find(x => x.id === incoming?.fixtureResult?.matchId);
      if (row && !row.version && incoming?.fixtureResult?.result) {
        const result = incoming.fixtureResult.result;
        if (row.individual && typeof result.total === 'number') { row.totalScore = result.total; row.scores = result.scores || []; }
      }
    } catch (e: any) { this.error = e.error?.message || e.message || 'No se pudieron cargar los resultados.'; }
    finally { this.busy = false; }
  }
  async save(row: FixtureResultRow): Promise<void> {
    this.busy = true; this.error = '';
    try {
      const statuses = await this.api.save(this.eventId, this.categoryId, row);
      const alerts = statuses.filter(x => x.categoryId === this.categoryId && x.status !== 'ready');
      if (alerts.length) this.dialog.open(MedalIssueDialog, { data: alerts.map(x => x.message).join('\n'), width: '600px' });
      await this.load();
    } catch (e: any) { this.error = e.error?.message || e.message || 'No se pudo confirmar el resultado en el servidor.'; }
    finally { this.busy = false; }
  }
}
