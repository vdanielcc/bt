import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { EventInvitationsService, FixtureCompetitorProfile } from '../invitations/event-invitations.service';

@Component({
  selector: 'bte-competitor-profile-dialog', standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>{{ profile?.teamId ? 'Ficha del equipo' : 'Ficha del deportista' }}</h2>
    <mat-dialog-content>
      <div *ngIf="loading" class="flex items-center gap-3" role="status"><mat-spinner diameter="24"></mat-spinner>Cargando ficha...</div>
      <div *ngIf="error" role="alert"><p>{{ error }}</p><button mat-button (click)="load()">Reintentar</button></div>
      <ng-container *ngIf="profile as p">
        <h3 class="font-bold text-lg mb-4">{{ p.name }}</h3>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><dt class="text-secondary">Dojo / escuela del evento</dt><dd>{{ p.academy || 'Sin información' }}</dd></div>
          <ng-container *ngIf="p.studentId">
            <div><dt class="text-secondary">País</dt><dd>{{ p.country || 'Sin información' }}</dd></div>
            <div><dt class="text-secondary">{{ p.documentType || 'Documento' }}</dt><dd>{{ p.documentNumber || 'Sin información' }}</dd></div>
            <div><dt class="text-secondary">Fecha de nacimiento</dt><dd>{{ p.birthDate ? (p.birthDate | date:'dd/MM/yyyy':'UTC') : 'Sin información' }}</dd></div>
            <div><dt class="text-secondary">Género</dt><dd>{{ gender(p.gender) }}</dd></div>
            <div><dt class="text-secondary">Grado / nivel</dt><dd>{{ p.level || 'Sin información' }}</dd></div>
            <div><dt class="text-secondary">Peso</dt><dd>{{ p.weight != null && p.weight > 0 ? p.weight + ' kg' : 'Sin información' }}</dd></div>
            <div><dt class="text-secondary">Estatura</dt><dd>{{ p.height != null && p.height > 0 ? p.height : 'Sin información' }}</dd></div>
          </ng-container>
          <div><dt class="text-secondary">Modalidades</dt><dd>{{ p.modalities.length ? p.modalities.join(', ') : 'Sin información' }}</dd></div>
        </dl>
        <ng-container *ngIf="p.teamId"><h4 class="font-bold mt-4">Integrantes</h4>
          <ul><li *ngFor="let member of p.members">{{ member }}</li></ul><p *ngIf="!p.members.length">Sin integrantes registrados.</p>
        </ng-container>
      </ng-container>
    </mat-dialog-content>
    <mat-dialog-actions align="end"><button mat-button mat-dialog-close>Cerrar</button></mat-dialog-actions>`
})
export class CompetitorProfileDialogComponent implements OnInit, OnDestroy {
  loading = false; error = ''; profile?: FixtureCompetitorProfile;
  private request?: Subscription;
  constructor(@Inject(MAT_DIALOG_DATA) public readonly data: { eventId: number; competitorId: number }, private service: EventInvitationsService) {}
  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.request?.unsubscribe(); }
  gender(value?: string | null): string {
    return ({ male: 'Masculino', female: 'Femenino', m: 'Masculino', f: 'Femenino', other: 'Otro' } as Record<string, string>)[(value ?? '').toLowerCase()] || value || 'Sin información';
  }
  load(): void {
    this.request?.unsubscribe(); this.loading = true; this.error = ''; this.profile = undefined;
    this.request = this.service.getFixtureCompetitorProfile(this.data.eventId, this.data.competitorId).subscribe({
      next: profile => { this.profile = profile; this.loading = false; },
      error: error => {
        this.loading = false;
        this.error = error.status === 403 ? 'No tienes permiso para consultar esta ficha.'
          : error.status === 404 ? 'No se encontró la ficha del competidor en este evento.' : 'No fue posible cargar la ficha del deportista.';
      }
    });
  }
}
