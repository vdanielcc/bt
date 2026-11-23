import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

interface AcademyChoice { id: number; name: string; }

@Component({
  standalone: true,
  selector: 'bte-impersonate-dialog',
  imports: [CommonModule, ReactiveFormsModule, MatAutocompleteModule, MatButtonModule,
    MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Ingresar como</h2>
    <mat-dialog-content>
      <p>Selecciona una academia para ingresar como su usuario principal con perfil academy_admin.</p>
      <mat-form-field class="w-full">
        <mat-label>Buscar academia</mat-label>
        <input matInput [formControl]="choice" [matAutocomplete]="academies" autocomplete="off"
          [readonly]="busy || loading" />
        <mat-autocomplete #academies="matAutocomplete" [displayWith]="display">
          <mat-option *ngFor="let academy of filtered" [value]="academy">{{ academy.name }} · #{{ academy.id }}</mat-option>
          <mat-option *ngIf="!loading && !filtered.length" disabled>No se encontraron academias</mat-option>
        </mat-autocomplete>
      </mat-form-field>
      <p *ngIf="loading" role="status">Cargando academias…</p>
      <p *ngIf="error" role="alert" class="text-red-600">{{ error }}</p>
      <button *ngIf="loadFailed" mat-button (click)="load()">Reintentar</button>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="busy">Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="!selected || busy || loading" (click)="enter()">
        {{ busy ? 'Ingresando…' : 'Ingresar como academia' }}
      </button>
    </mat-dialog-actions>`
})
export class ImpersonateDialogComponent implements OnInit {
  choice = new FormControl<string | AcademyChoice>('');
  options: AcademyChoice[] = [];
  loading = true;
  busy = false;
  error = '';
  loadFailed = false;
  constructor(private http: HttpClient, private auth: AuthService,
    private dialog: MatDialogRef<ImpersonateDialogComponent>) {}
  ngOnInit(): void { this.load(); }
  display = (value: AcademyChoice | null): string => value?.name ?? '';
  private normalize(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }
  get filtered(): AcademyChoice[] {
    const query = this.normalize(typeof this.choice.value === 'string' ? this.choice.value : '');
    return this.options.filter(a => this.normalize(`${a.name} ${a.id}`).includes(query));
  }
  get selected(): AcademyChoice | undefined {
    const value = this.choice.value;
    return typeof value === 'object' && value ? this.options.find(a => a.id === value.id) : undefined;
  }
  load(): void {
    this.loading = true; this.error = ''; this.loadFailed = false;
    this.http.get<any[]>(`${environment.apiBaseUrl}/admin/user-academies`).subscribe({
      next: rows => {
        this.options = rows.map(a => ({ id: Number(a.id ?? a.Id), name: a.name ?? a.Name }));
        this.loading = false;
      },
      error: () => { this.loading = false; this.loadFailed = true; this.error = 'No fue posible cargar las academias.'; }
    });
  }
  enter(): void {
    if (!this.selected || this.busy) return;
    this.busy = true; this.error = ''; this.dialog.disableClose = true;
    this.auth.impersonate(this.selected.id).subscribe({
      next: session => {
        window.location.assign(new URL(`academies/${session.academieId}/dashboard`, document.baseURI).href);
      },
      error: error => {
        this.busy = false; this.dialog.disableClose = false; this.error = error.message;
      }
    });
  }
}
