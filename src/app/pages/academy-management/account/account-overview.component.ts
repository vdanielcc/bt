import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../../environments/environment';
import { unwrapApiResponse } from '../services/api-response.util';
import { AuthService } from '../../../core/auth/auth.service';
import { AcademyComponent } from '../../academy/academy.component';

interface Overview {
  name: string;
  students: { id: number; name: string; academies: string[]; balance: number; grades: (string | null)[];
    attendance: { className: string; date: string; status: string }[] }[];
  sessions: { id: number; academyId: number; className: string; date: string; startTime: string }[];
}

@Component({
  standalone: true,
  selector: 'bte-account-overview',
  imports: [CommonModule, RouterLink, MatButtonModule, MatProgressSpinnerModule, AcademyComponent],
  template: `<main class="p-6 max-w-6xl mx-auto">
    <h1 class="text-2xl font-semibold mb-6">Mi cuenta</h1>
    <bte-academy *ngIf="manager && academyId" [embedded]="true" class="mb-6"></bte-academy>
    <mat-spinner *ngIf="loading" diameter="40" aria-label="Cargando información"></mat-spinner>
    <div *ngIf="error" role="alert" class="card p-5">
      <p>{{ error }}</p><button mat-button (click)="load()">Reintentar</button>
    </div>
    <ng-container *ngIf="data && !loading">
      <p class="mb-5">{{ data.name }}</p>
      <div *ngIf="manager" class="card p-5 mb-5">
        <a mat-stroked-button *ngIf="role === 'admin'" routerLink="/admin/users">Administrar usuarios</a>
        <a mat-stroked-button *ngIf="academyId" [routerLink]="['/academies', academyId, 'dashboard']">Mi academia</a>
      </div>
      <section *ngFor="let student of data.students" class="card p-5 mb-5">
        <h2 class="text-xl font-medium">{{ student.name }}</h2>
        <p>{{ student.academies.join(' · ') }}</p>
        <p class="my-3">Saldo pendiente: {{ student.balance | number:'1.0-2' }}</p>
        <p>Grados: {{ student.grades.join(', ') || 'Sin grados registrados' }}</p>
        <h3 class="font-medium mt-5 mb-2">Asistencia reciente</h3>
        <div class="overflow-x-auto" *ngIf="student.attendance.length; else noAttendance">
          <table class="w-full text-left"><thead><tr><th>Fecha</th><th>Clase</th><th>Estado</th></tr></thead>
            <tbody><tr *ngFor="let item of student.attendance"><td class="py-2">{{ item.date | date:'dd/MM/yyyy' }}</td>
              <td>{{ item.className }}</td><td>{{ status(item.status) }}</td></tr></tbody></table>
        </div>
        <ng-template #noAttendance><p>No hay asistencia registrada.</p></ng-template>
      </section>
      <section *ngIf="role === 'instructor'" class="card p-5">
        <h2 class="text-xl font-medium mb-3">Mis sesiones · próximos 30 días</h2>
        <div *ngFor="let session of data.sessions" class="flex flex-wrap items-center justify-between gap-3 py-3 border-b">
          <span>{{ session.date | date:'dd/MM/yyyy' }} · {{ session.startTime }} · {{ session.className }}</span>
          <a mat-stroked-button [routerLink]="['/academies', session.academyId, 'class-sessions', session.id, 'attendance']">Registrar asistencia</a>
        </div><p *ngIf="!data.sessions.length">No tienes sesiones asignadas para este período.</p>
      </section>
      <p *ngIf="!manager && role !== 'instructor' && !data.students.length" class="card p-5">
        No tienes alumnos asociados. Solicita al administrador de tu academia que revise la asociación de tu cuenta.
      </p>
    </ng-container>
  </main>`
})
export class AccountOverviewComponent {
  private readonly http = inject(HttpClient);
  private readonly session = inject(AuthService).getCurrentUser();
  readonly role = this.session?.rol;
  readonly academyId = this.session?.academieId;
  readonly manager = this.role === 'admin' || this.role === 'academy_admin';
  data: Overview | null = null;
  loading = false;
  error = '';
  constructor() { this.load(); }
  load(): void {
    if (this.loading) return;
    this.loading = true; this.error = ''; this.data = null;
    this.http.get<unknown>(`${environment.apiBaseUrl}/account/overview`).subscribe({
      next: response => { this.data = unwrapApiResponse<Overview>(response); this.loading = false; },
      error: () => { this.error = 'No se pudo cargar tu información. Inténtalo nuevamente.'; this.loading = false; }
    });
  }
  status(value: string): string {
    return ({ PRESENT: 'Presente', LATE: 'Atrasado', ABSENT: 'Ausente', EXCUSED: 'Justificado' } as Record<string, string>)[value] ?? value;
  }
}
