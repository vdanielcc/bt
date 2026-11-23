import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';
import { EventInvitationsService } from '../invitations/event-invitations.service';
import { enrollmentErrorMessage } from '../invitations/enrollment-error-message';

export interface CompetitorCategoryDialogData {
  eventId: number;
  competitorId: number;
  name: string;
  category: any;
  categories: any[];
  action: 'remove' | 'move';
}

export function enrolledCategoryIds(categories: any[], competitor: any): number[] {
  const studentId = Number(competitor.studentId ?? competitor.StudentId);
  const teamId = Number(competitor.teamId ?? competitor.TeamId);
  return categories.filter(category => (category.competitors ?? category.Competitors ?? []).some((item: any) =>
    studentId > 0 ? Number(item.studentId ?? item.StudentId) === studentId
      : teamId > 0 && Number(item.teamId ?? item.TeamId) === teamId
  )).map(category => Number(category.id ?? category.Id));
}

export function transferCategoryIds(ids: number[], source: number, target?: number): number[] {
  if (!ids.includes(source)) throw new Error('El competidor ya no está inscrito en esta categoría. Actualiza la vista.');
  if (target && (target === source || ids.includes(target))) throw new Error('El competidor ya está inscrito en la categoría de destino.');
  return [...new Set([...ids.filter(id => id !== source), ...(target ? [target] : [])])];
}

@Component({
  selector: 'bte-competitor-category-dialog', standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>{{ data.action === 'move' ? 'Mover competidor' : 'Eliminar de la categoría' }}</h2>
    <mat-dialog-content>
      <p><strong>{{ data.name }}</strong></p>
      <p>{{ label(data.category) }}</p>
      <div *ngIf="loading" class="flex items-center gap-3"><mat-spinner diameter="24"></mat-spinner>Cargando inscripciones...</div>
      <ng-container *ngIf="!loading && ready">
        <p *ngIf="data.action === 'remove'">Se eliminará únicamente esta inscripción. Sus otras categorías se conservarán.</p>
        <ng-container *ngIf="data.action === 'move'">
          <p>Selecciona una categoría compatible de la misma modalidad.</p>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Nueva categoría</mat-label>
            <mat-select [(ngModel)]="targetId" [disabled]="saving">
              <mat-option *ngFor="let category of targets" [value]="id(category)">{{ label(category) }}</mat-option>
            </mat-select>
          </mat-form-field>
          <p *ngIf="!targets.length">No hay otras categorías compatibles disponibles.</p>
        </ng-container>
        <p class="text-secondary">El deportista se quitará del borrador de esta llave. Guarda una nueva versión para conservar el cambio. Las versiones anteriores se mantendrán.</p>
      </ng-container>
      <p *ngIf="error" class="text-red-600" role="alert">{{ error }}</p>
      <button *ngIf="!loading && !ready" mat-button (click)="load()">Reintentar</button>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [disabled]="saving" (click)="dialogRef.close()">Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="loading || saving || !ready || (data.action === 'move' && !targetId)" (click)="save()">
        {{ saving ? 'Guardando...' : data.action === 'move' ? 'Mover' : 'Eliminar de esta categoría' }}
      </button>
    </mat-dialog-actions>`
})
export class CompetitorCategoryDialogComponent implements OnInit {
  loading = true; saving = false; ready = false; error = '';
  targetId: number | null = null;
  targets: any[] = [];
  private competitor: any;
  constructor(@Inject(MAT_DIALOG_DATA) public readonly data: CompetitorCategoryDialogData,
    public readonly dialogRef: MatDialogRef<CompetitorCategoryDialogComponent>, private readonly service: EventInvitationsService) {}
  ngOnInit(): void { void this.load(); }
  id(category: any): number { return Number(category.id ?? category.Id); }
  label(category: any): string { return `${category.code ?? category.Code ?? ''} - ${category.name ?? category.Name ?? ''}`; }

  async load(): Promise<void> {
    this.loading = true; this.ready = false; this.error = ''; this.targetId = null;
    try {
      this.competitor = await firstValueFrom(this.service.getCompetitor(this.data.competitorId));
      if (Number(this.competitor.eventId ?? this.competitor.EventId) !== this.data.eventId) throw new Error('El competidor no pertenece a este evento.');
      const categories = await firstValueFrom(this.service.getEventEnrollmentCategories(this.data.eventId));
      const ids = enrolledCategoryIds(categories, this.competitor);
      transferCategoryIds(ids, this.id(this.data.category));
      if (this.data.action === 'move') this.targets = await this.availableTargets(ids);
      this.ready = true;
    } catch (error) { this.error = error instanceof Error ? error.message : enrollmentErrorMessage(error); }
    finally { this.loading = false; }
  }

  private async availableTargets(enrolled: number[]): Promise<any[]> {
    const studentId = Number(this.competitor.studentId ?? this.competitor.StudentId);
    const teamId = Number(this.competitor.teamId ?? this.competitor.TeamId);
    const eligible = await firstValueFrom(this.service.getEligibleCategories(this.data.eventId, studentId || teamId, studentId ? 'Sportman' : 'Team'));
    const modality = Number(this.data.category.modalityId ?? this.data.category.ModalityId);
    const sameModality = new Set(this.data.categories.filter(category =>
      Number(category.modalityId ?? category.ModalityId) === modality).map(category => this.id(category)));
    return eligible.flatMap(category => [category, ...(category.children ?? category.Children ?? [])])
      .filter(category => sameModality.has(this.id(category)) && !enrolled.includes(this.id(category)));
  }

  async save(): Promise<void> {
    if (this.loading || this.saving || !this.ready || (this.data.action === 'move' && !this.targetId)) return;
    this.saving = true; this.error = ''; this.dialogRef.disableClose = true;
    try {
      // Read the complete current roster again so unrelated inscriptions are preserved.
      const categories = await firstValueFrom(this.service.getEventEnrollmentCategories(this.data.eventId));
      const ids = enrolledCategoryIds(categories, this.competitor);
      const target = this.data.action === 'move' ? this.targetId! : undefined;
      if (target && !(await this.availableTargets(ids)).some(category => this.id(category) === target)) throw new Error('La categoría de destino ya no está disponible.');
      const updated = transferCategoryIds(ids, this.id(this.data.category), target);
      const studentId = Number(this.competitor.studentId ?? this.competitor.StudentId);
      const request = studentId
        ? this.service.enroll(this.data.eventId, studentId, updated, Number(this.competitor.academyId ?? this.competitor.AcademyId))
        : this.service.enrollTeam(this.data.eventId, Number(this.competitor.teamId ?? this.competitor.TeamId), updated);
      await firstValueFrom(request);
      this.dialogRef.close({ sourceId: this.id(this.data.category), targetId: target });
    } catch (error) { this.error = error instanceof Error ? error.message : enrollmentErrorMessage(error); }
    finally { this.saving = false; this.dialogRef.disableClose = false; }
  }
}
