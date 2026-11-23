import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { GradingManagementService } from '../services/grading-management.service';
import { MartialArtStyle } from '../models/academy-management.models';
import { AcademyStyleDialogComponent } from './academy-style-dialog.component';

@Component({
  standalone: true,
  selector: 'bte-style-catalog',
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `<div class="flex flex-wrap items-center gap-4 mb-4">
    <mat-form-field class="flex-auto"><mat-label>Buscar estilo por código o nombre</mat-label>
      <input matInput [(ngModel)]="search" /></mat-form-field>
    <button mat-flat-button color="primary" (click)="edit()">Nuevo estilo</button>
  </div>
  <p *ngIf="loading">Cargando estilos...</p>
  <p *ngIf="error" role="alert">{{ error }} <button mat-button (click)="load()">Reintentar</button></p>
  <div class="overflow-x-auto" *ngIf="!loading && !error"><table class="w-full">
    <thead><tr><th class="text-left p-3">Código</th><th class="text-left p-3">Nombre</th>
    <th class="text-left p-3">Descripción</th><th class="text-left p-3">Estado</th><th></th></tr></thead>
    <tbody><tr *ngFor="let style of filtered"><td class="p-3">{{ style.code }}</td>
    <td class="p-3">{{ style.name }}</td><td class="p-3">{{ style.description || '—' }}</td>
    <td class="p-3">{{ style.isActive ? 'Activo' : 'Inactivo' }}</td>
    <td><button mat-button (click)="edit(style)">Editar</button></td></tr></tbody>
  </table><p *ngIf="!filtered.length" class="p-3">No hay estilos para mostrar.</p></div>`
})
export class StyleCatalogComponent implements OnInit {
  private service = inject(GradingManagementService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  styles: MartialArtStyle[] = [];
  search = '';
  loading = false;
  error = '';
  get filtered(): MartialArtStyle[] {
    const query = this.search.trim().toLocaleLowerCase('es');
    return this.styles.filter(x => `${x.code || ''} ${x.name || ''}`.toLocaleLowerCase('es').includes(query));
  }
  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true; this.error = '';
    this.service.getMartialArtStyles().pipe(finalize(() => this.loading = false)).subscribe({
      next: styles => this.styles = styles,
      error: () => this.error = 'No fue posible cargar los estilos.'
    });
  }
  edit(style?: MartialArtStyle): void {
    this.dialog.open(AcademyStyleDialogComponent, {
      width: '560px', maxWidth: '95vw', disableClose: true,
      data: { kind: 'catalog', academyId: 0, style, styles: [], federations: [] }
    }).afterClosed().subscribe(saved => {
      if (saved) { this.snack.open('Estilo guardado.', 'Cerrar', { duration: 3500 }); this.load(); }
    });
  }
}
