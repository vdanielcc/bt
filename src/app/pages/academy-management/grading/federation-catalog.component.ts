import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize, forkJoin } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { requiredTrimmed } from '../catalog/academy-catalog.validators';
import { AcademyConfirmDialogComponent } from '../shared/academy-confirm-dialog.component';

export interface Federation {
  id: number; name: string; address: string; email: string; phoneNumber: string | null;
  rut: string | null; dv: string | null; logo: string | null; communeId: number; legalRepresentativeId: number;
}
interface Option { id: number; name: string; documentNumber?: string; }

@Component({
  standalone: true, selector: 'bte-federation-catalog',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `<div class="flex flex-wrap items-center gap-4 mb-4">
    <mat-form-field class="flex-auto"><mat-label>Buscar federación por nombre, RUT o email</mat-label>
      <input matInput [(ngModel)]="search" /></mat-form-field>
    <button mat-flat-button color="primary" [disabled]="loading || saving || !!loadError" (click)="edit()">Nueva federación</button>
  </div>
  <p *ngIf="loading">Cargando federaciones...</p>
  <p *ngIf="loadError" role="alert">{{ loadError }} <button mat-button (click)="load()">Reintentar</button></p>
  <form *ngIf="editing" [formGroup]="form" (ngSubmit)="save()" class="border rounded p-4 mb-6">
    <h3 class="text-xl mb-4">{{ selectedId ? 'Editar' : 'Nueva' }} federación</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <mat-form-field><mat-label>Nombre</mat-label><input matInput formControlName="name" maxlength="100" /><mat-error>Nombre obligatorio, hasta 100 caracteres.</mat-error></mat-form-field>
      <mat-form-field><mat-label>Email</mat-label><input matInput type="email" formControlName="email" maxlength="100" /><mat-error>Ingresa un email válido.</mat-error></mat-form-field>
      <mat-form-field><mat-label>Dirección</mat-label><input matInput formControlName="address" maxlength="255" /><mat-error>Ingresa la dirección.</mat-error></mat-form-field>
      <mat-form-field><mat-label>Comuna</mat-label><mat-select formControlName="communeId"><mat-option *ngFor="let item of communes" [value]="item.id">{{ item.name }}</mat-option></mat-select><mat-error>Selecciona una comuna.</mat-error></mat-form-field>
      <mat-form-field><mat-label>Buscar representante por nombre o identificación</mat-label><input matInput [ngModel]="representativeSearch" (ngModelChange)="representativeSearch = $event" [ngModelOptions]="{standalone:true}" /></mat-form-field>
      <mat-form-field><mat-label>Representante legal</mat-label><mat-select formControlName="legalRepresentativeId"><mat-option *ngFor="let item of filteredRepresentatives" [value]="item.id">{{ item.name }} · {{ item.documentNumber }}</mat-option></mat-select><mat-error>Selecciona un representante legal.</mat-error></mat-form-field>
      <mat-form-field><mat-label>Teléfono (opcional)</mat-label><input matInput formControlName="phoneNumber" maxlength="15" /></mat-form-field>
      <div class="flex gap-3"><mat-form-field class="flex-auto"><mat-label>RUT sin dígito (opcional)</mat-label><input matInput formControlName="rut" maxlength="12" /></mat-form-field>
      <mat-form-field class="w-20"><mat-label>DV</mat-label><input matInput formControlName="dv" maxlength="1" /></mat-form-field></div>
      <mat-form-field><mat-label>Ruta del logo (opcional)</mat-label><input matInput formControlName="logo" maxlength="255" /></mat-form-field>
    </div>
    <p *ngIf="saveError" role="alert" class="mb-3">{{ saveError }}</p>
    <button mat-flat-button color="primary" type="submit" [disabled]="saving">{{ saving ? 'Guardando...' : 'Guardar' }}</button>
    <button mat-button type="button" [disabled]="saving" (click)="editing = false">Cancelar</button>
  </form>
  <div class="overflow-x-auto" *ngIf="!loading && !loadError"><table class="w-full">
    <thead><tr><th class="text-left p-3">ID</th><th class="text-left p-3">Federación</th><th class="text-left p-3">Email</th><th class="text-left p-3">RUT</th><th></th></tr></thead>
    <tbody><tr *ngFor="let item of filtered"><td class="p-3">{{ item.id }}</td><td class="p-3">{{ item.name }}</td><td class="p-3">{{ item.email }}</td><td class="p-3">{{ item.rut ? item.rut + '-' + item.dv : '—' }}</td>
    <td class="whitespace-nowrap"><button mat-button [disabled]="saving" (click)="edit(item)">Editar</button><button mat-button color="warn" [disabled]="saving" (click)="remove(item)">Eliminar</button></td></tr></tbody>
  </table><p *ngIf="!filtered.length" class="p-3">No hay federaciones para mostrar.</p></div>
  <p class="mt-4 text-secondary">Las federaciones utilizadas por academias, estilos o sistemas de grados conservan su historial y no pueden eliminarse.</p>`
})
export class FederationCatalogComponent implements OnInit {
  private http = inject(HttpClient);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private api = `${environment.apiBaseUrl}/SportsAssociations`;
  readonly form = inject(FormBuilder).group({
    name: ['', [requiredTrimmed, Validators.maxLength(100)]],
    email: ['', [requiredTrimmed, Validators.email, Validators.maxLength(100)]],
    address: ['', [requiredTrimmed, Validators.maxLength(255)]],
    communeId: [null as number | null, [Validators.required, Validators.min(1)]],
    legalRepresentativeId: [null as number | null, [Validators.required, Validators.min(1)]],
    phoneNumber: ['', Validators.maxLength(15)], rut: ['', Validators.maxLength(12)],
    dv: ['', Validators.maxLength(1)], logo: ['', Validators.maxLength(255)]
  });
  federations: Federation[] = []; communes: Option[] = []; representatives: Option[] = [];
  search = ''; representativeSearch = ''; selectedId = 0;
  loading = false; saving = false; editing = false; loadError = ''; saveError = '';
  get filtered(): Federation[] {
    const query = this.search.trim().toLocaleLowerCase('es');
    return this.federations.filter(x => `${x.name} ${x.email} ${x.rut || ''}-${x.dv || ''}`.toLocaleLowerCase('es').includes(query));
  }
  get filteredRepresentatives(): Option[] {
    const query = this.representativeSearch.trim().toLocaleLowerCase('es');
    return this.representatives.filter(x => x.id === this.form.controls.legalRepresentativeId.value || `${x.name} ${x.documentNumber || ''}`.toLocaleLowerCase('es').includes(query));
  }
  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true; this.loadError = '';
    forkJoin({ values: this.http.get<Federation[]>(this.api), options: this.http.get<{ communes: Option[]; representatives: Option[] }>(`${this.api}/editor-options`) })
      .pipe(finalize(() => this.loading = false)).subscribe({
        next: ({ values, options }) => { this.federations = values; this.communes = options.communes; this.representatives = options.representatives; },
        error: () => this.loadError = 'No fue posible cargar las federaciones y sus opciones.'
      });
  }
  edit(value?: Federation): void {
    if (this.saving) return;
    this.selectedId = value?.id || 0; this.saveError = ''; this.representativeSearch = '';
    this.form.reset(value || { name: '', email: '', address: '', communeId: null, legalRepresentativeId: null, phoneNumber: '', rut: '', dv: '', logo: '' });
    this.editing = true;
  }
  save(): void {
    if (this.saving) return;
    const raw = this.form.getRawValue();
    for (const key of ['name', 'email', 'address', 'phoneNumber', 'rut', 'dv', 'logo'] as const) raw[key] = raw[key]?.trim() || '';
    raw.dv = raw.dv!.toUpperCase(); this.form.patchValue(raw);
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (!!raw.rut !== !!raw.dv) { this.saveError = 'Completa RUT y dígito verificador juntos.'; return; }
    const value = { ...raw, id: this.selectedId };
    this.saving = true; this.saveError = ''; this.form.disable();
    const request = this.selectedId ? this.http.put(`${this.api}/${this.selectedId}`, value) : this.http.post(this.api, value);
    request.pipe(finalize(() => { this.saving = false; this.form.enable(); })).subscribe({
      next: () => { this.editing = false; this.snack.open('Federación guardada.', 'Cerrar', { duration: 3500 }); this.load(); },
      error: error => this.saveError = error.error?.message || 'No fue posible guardar la federación. Revisa los datos.'
    });
  }
  remove(value: Federation): void {
    this.dialog.open(AcademyConfirmDialogComponent, { data: { title: 'Confirmar eliminación', action: 'Eliminar', message: `¿Eliminar la federación «${value.name}»? Solo se permite si no está en uso.` } })
      .afterClosed().subscribe(confirmed => {
        if (!confirmed || this.saving) return;
        this.saving = true;
        this.http.delete(`${this.api}/${value.id}`).pipe(finalize(() => this.saving = false)).subscribe({
          next: () => { if (this.selectedId === value.id) this.editing = false; this.load(); this.snack.open('Federación eliminada.', 'Cerrar', { duration: 3500 }); },
          error: error => this.snack.open(error.error?.message || 'No fue posible eliminar la federación.', 'Cerrar', { duration: 6000 })
        });
      });
  }
}
