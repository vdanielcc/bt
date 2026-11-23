import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';
import { EventInvitationsService } from '../invitations/event-invitations.service';
import { enrollmentErrorMessage } from '../invitations/enrollment-error-message';
import { enrolledCategoryIds } from './competitor-category-dialog.component';

export function isTeamEntry(item: any): boolean {
  return ['team', 'equipo'].includes(String(item.role ?? item.rol ?? item.Rol ?? '').trim().toLowerCase());
}

export function isTeamCategory(category: any): boolean {
  const modalityId = Number(category.modalityId ?? category.ModalityId ?? category.modality?.id ?? category.Modality?.Id);
  const modality = category.modality?.name ?? category.Modality?.Name ?? category.modalityName ?? category.ModalityName ?? category.modality ?? category.Modality ?? '';
  return [4, 5, 6, 7].includes(modalityId) || /equipo|team/i.test(String(modality));
}

export function acceptsCategoryEntry(category: any, item: any): boolean {
  if (isTeamCategory(category)) return isTeamEntry(item);
  if (isTeamEntry(item)) return false;
  const gender = String(item.gender ?? item.Gender ?? item.genero ?? item.Genero ?? '').trim().toLowerCase();
  const categoryGender = String(category.gender ?? category.Gender ?? '').trim().toLowerCase();
  return categoryGender === 'mixto' || categoryGender === 'mixed'
    ? ['male', 'female'].includes(gender)
    : ['male', 'female'].includes(categoryGender) && gender === categoryGender;
}

@Component({
  selector: 'bte-add-category-competitors-dialog', standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatAutocompleteModule, MatInputModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>Agregar deportista</h2>
    <mat-dialog-content>
      <p><strong>{{ data.category.code ?? data.category.Code }} · {{ data.category.name ?? data.category.Name }}</strong></p>
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Dojo</mat-label>
        <input matInput type="text" [ngModel]="academySearch" (ngModelChange)="searchAcademies($event)"
          [matAutocomplete]="dojoAutocomplete" [disabled]="loadingAcademies || saving"
          placeholder="Buscar dojo por nombre" autocomplete="off" />
        <mat-autocomplete #dojoAutocomplete="matAutocomplete" [displayWith]="displayAcademy" autoActiveFirstOption
          (optionSelected)="selectAcademy($event.option.value)">
          <mat-option *ngFor="let academy of filteredAcademies" [value]="id(academy)">{{ academy.name ?? academy.Name }}</mat-option>
          <mat-option *ngIf="!loadingAcademies && !academiesError && !filteredAcademies.length" disabled>No se encontraron dojos.</mat-option>
        </mat-autocomplete>
      </mat-form-field>
      <div *ngIf="loadingAcademies || loadingStudents" class="flex items-center gap-3"><mat-spinner diameter="24"></mat-spinner>Cargando...</div>
      <button *ngIf="academiesError" mat-button (click)="loadAcademies()">Reintentar carga de dojos</button>
      <button *ngIf="studentsError" mat-button (click)="loadStudents()">Reintentar carga de alumnos</button>
      <p *ngIf="!loadingAcademies && !academiesError && !academies.length">No hay dojos disponibles.</p>
      <ng-container *ngIf="academyId && !loadingStudents && !studentsError">
        <p>{{ teams ? 'Selecciona uno o más equipos.' : 'Selecciona uno o más alumnos.' }}</p>
        <div class="flex flex-col gap-2" style="max-height: 340px; overflow: auto">
          <mat-checkbox *ngFor="let student of students" [checked]="selected.has(id(student))" [disabled]="saving || enrolled.has(id(student))" (change)="toggle(student, $event.checked)">
            {{ name(student) }} <span *ngIf="enrolled.has(id(student))" class="text-secondary">(Ya inscrito)</span>
          </mat-checkbox>
        </div>
        <p *ngIf="!students.length">No hay {{ teams ? 'equipos' : 'alumnos' }} que cumplan las condiciones de esta categoría en el dojo seleccionado.</p>
      </ng-container>
      <p *ngIf="addedCount" role="status">Inscripciones agregadas: {{ addedCount }}.</p>
      <p *ngIf="saving" role="status">Agregando {{ progress }} de {{ total }}...</p>
      <p *ngIf="error" class="text-red-600" role="alert">{{ error }}</p>
      <p *ngFor="let failure of failures" class="text-red-600" role="alert">{{ failure }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [disabled]="saving" (click)="dialogRef.close()">{{ addedCount ? 'Cerrar' : 'Cancelar' }}</button>
      <button mat-flat-button color="primary" [disabled]="saving || loadingStudents || studentsError || !selected.size" (click)="save()">{{ saving ? 'Agregando...' : 'Agregar' }}</button>
    </mat-dialog-actions>`
})
export class AddCategoryCompetitorsDialogComponent implements OnInit {
  academies: any[] = []; students: any[] = [];
  academyId: number | null = null;
  academySearch: string | number = '';
  selected = new Set<number>(); enrolled = new Set<number>();
  loadingAcademies = true; loadingStudents = false; saving = false;
  academiesError = false; studentsError = false;
  addedCount = 0; progress = 0; total = 0; error = ''; failures: string[] = [];
  private loadSequence = 0;
  get teams(): boolean { return isTeamCategory(this.data.category); }
  constructor(@Inject(MAT_DIALOG_DATA) public readonly data: { eventId: number; category: any },
    public readonly dialogRef: MatDialogRef<AddCategoryCompetitorsDialogComponent>, private readonly service: EventInvitationsService) {}
  ngOnInit(): void { void this.loadAcademies(); }
  id(item: any): number { return Number(item.id ?? item.Id); }
  name(item: any): string {
    return item.fullName ?? item.FullName ?? `${item.nombres ?? item.Nombres ?? item.firstName ?? item.FirstName ?? ''} ${item.apellidos ?? item.Apellidos ?? item.lastName ?? item.LastName ?? ''}`.trim();
  }
  readonly displayAcademy = (value: string | number | null): string => {
    if (typeof value === 'string') return value;
    const academy = this.academies.find(item => this.id(item) === value);
    return academy?.name ?? academy?.Name ?? '';
  };
  get filteredAcademies(): any[] {
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const terms = normalize(typeof this.academySearch === 'string' ? this.academySearch : '').split(/\s+/).filter(Boolean);
    return this.academies.filter(academy => {
      const name = normalize(String(academy.name ?? academy.Name ?? ''));
      return terms.every(term => name.includes(term));
    });
  }
  searchAcademies(value: string | number): void {
    this.academySearch = value;
    if (typeof value === 'string' && this.academyId !== null) {
      this.academyId = null;
      void this.loadStudents();
    }
  }
  selectAcademy(id: number): void {
    if (this.saving || !this.academies.some(academy => this.id(academy) === id)) return;
    this.academySearch = id;
    this.academyId = id;
    void this.loadStudents();
  }
  private person(item: any): any { return this.teams ? { teamId: this.id(item) } : { studentId: this.id(item) }; }
  toggle(item: any, checked: boolean): void {
    if (this.saving || this.enrolled.has(this.id(item))) return;
    checked ? this.selected.add(this.id(item)) : this.selected.delete(this.id(item));
  }
  async loadAcademies(): Promise<void> {
    this.loadingAcademies = true; this.academiesError = false; this.error = '';
    try { this.academies = await firstValueFrom(this.service.getAcademies(this.data.eventId)); }
    catch { this.academiesError = true; this.error = 'No fue posible cargar los dojos.'; }
    finally { this.loadingAcademies = false; }
  }
  async loadStudents(): Promise<void> {
    if (this.saving) return;
    const sequence = ++this.loadSequence;
    this.selected.clear(); this.enrolled.clear(); this.students = []; this.error = ''; this.failures = [];
    this.studentsError = false; this.loadingStudents = true;
    try {
      if (!this.academyId) return;
      const [students, roster] = await Promise.all([
        firstValueFrom(this.service.getAcademyStudents(this.academyId, this.data.eventId)),
        firstValueFrom(this.service.getEventEnrollmentCategories(this.data.eventId))
      ]);
      if (sequence !== this.loadSequence) return;
      this.students = [...new Map(students.filter(item => acceptsCategoryEntry(this.data.category, item)).map(item => [this.id(item), item])).values()];
      this.enrolled = new Set(this.students.filter(item => enrolledCategoryIds(roster, this.person(item)).includes(this.id(this.data.category))).map(item => this.id(item)));
    } catch { if (sequence === this.loadSequence) { this.studentsError = true; this.error = 'No fue posible cargar los alumnos y sus inscripciones.'; } }
    finally { if (sequence === this.loadSequence) this.loadingStudents = false; }
  }
  async save(): Promise<void> {
    if (this.saving || this.loadingStudents || this.studentsError || !this.academyId || !this.selected.size) return;
    const selected = this.students.filter(item => this.selected.has(this.id(item)) && acceptsCategoryEntry(this.data.category, item));
    if (!selected.length) return;
    this.saving = true; this.dialogRef.disableClose = true; this.failures = []; this.progress = 0; this.total = selected.length;
    try {
      for (const student of selected) {
        this.progress++;
        try {
          const roster = await firstValueFrom(this.service.getEventEnrollmentCategories(this.data.eventId));
          const ids = enrolledCategoryIds(roster, this.person(student));
          const categoryId = this.id(this.data.category);
          if (!ids.includes(categoryId)) {
            const request = this.teams
              ? this.service.enrollTeam(this.data.eventId, this.id(student), [...ids, categoryId])
              : this.service.enroll(this.data.eventId, this.id(student), [...ids, categoryId], this.academyId);
            await firstValueFrom(request);
            this.addedCount++;
          }
          this.enrolled.add(this.id(student)); this.selected.delete(this.id(student));
        } catch (error) { this.failures.push(`${this.name(student)}: ${error instanceof Error ? error.message : enrollmentErrorMessage(error)}`); }
      }
      if (!this.failures.length) this.dialogRef.close();
    } finally { this.saving = false; this.dialogRef.disableClose = false; }
  }
}
