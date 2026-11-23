import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { firstValueFrom } from 'rxjs';
import { StudentDialogComponent } from '../championships/students/student-dialog.component';
import { StudentsService } from '../championships/students/students.service';
import { StudentManagementService, ManagedStudent, StudentAcademyOption, StudentSearchCriterion, StudentSearchResults } from './student-management.service';

@Component({ selector: 'bte-student-management', standalone: true,
  templateUrl: './student-management.component.html', styleUrls: ['./student-management.component.scss'],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatAutocompleteModule, MatButtonModule, MatDialogModule,
    MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, MatPaginatorModule] })
export class StudentManagementComponent implements OnInit {
  mode: 'create' | 'edit' | 'move' | null = null;
  academies: StudentAcademyOption[] = [];
  sourceAcademyId: number | null = null; destinationAcademyId: number | null = null;
  sourceSearch: string | number = ''; destinationSearch: string | number = '';
  selected: ManagedStudent | null = null; results: StudentSearchResults | null = null;
  loadingAcademies = false; searching = false; saving = false; opening = false;
  error = ''; academyError = ''; success = '';
  private sequence = 0;
  readonly form = this.fb.nonNullable.group({ criterion: ['documentNumber' as StudentSearchCriterion, Validators.required], query: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]] });
  constructor(private readonly fb: FormBuilder, private readonly service: StudentManagementService,
    private readonly students: StudentsService, private readonly dialog: MatDialog) {}
  ngOnInit(): void { void this.loadAcademies(); }
  async loadAcademies(): Promise<void> {
    this.loadingAcademies = true; this.academyError = '';
    try { this.academies = await firstValueFrom(this.service.getAcademies()); }
    catch (error) { this.academyError = this.message(error, 'No fue posible cargar los dojos.'); }
    finally { this.loadingAcademies = false; }
  }
  readonly displayAcademy = (value: string | number | null): string => typeof value === 'string' ? value : this.academies.find(a => a.id === value)?.name ?? '';
  private filterAcademies(value: string | number): StudentAcademyOption[] {
    const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const terms = normalize(typeof value === 'string' ? value : '').split(/\s+/).filter(Boolean);
    return this.academies.filter(a => terms.every(term => normalize(a.name).includes(term)));
  }
  get sourceOptions() { return this.filterAcademies(this.sourceSearch); }
  get destinationOptions() { return this.filterAcademies(this.destinationSearch).filter(a => !this.selected?.academies.some(source => source.id === a.id)); }
  get transferSourceName(): string { return this.selected?.academies.find(a => a.id === this.sourceAcademyId)?.name ?? ''; }
  chooseMode(mode: 'create' | 'edit' | 'move'): void {
    if (this.saving || this.opening) return;
    this.mode = mode; this.sourceAcademyId = this.destinationAcademyId = null;
    this.sourceSearch = this.destinationSearch = ''; this.form.reset({ criterion: 'documentNumber', query: '' });
    this.resetResults(); this.success = '';
  }
  resetResults(): void { ++this.sequence; this.results = null; this.selected = null; this.searching = false; this.error = ''; this.destinationAcademyId = null; this.destinationSearch = ''; if (this.mode === 'move') this.sourceAcademyId = null; }
  changeSource(value: string | number): void {
    this.sourceSearch = value;
    if (typeof value === 'string') { this.sourceAcademyId = null; this.resetResults(); }
  }
  selectSource(id: number): void {
    if (!this.academies.some(a => a.id === id)) return;
    this.sourceSearch = id; this.sourceAcademyId = id; this.resetResults();
    if (this.mode === 'create') void this.openStudent('student');
  }
  changeDestination(value: string | number): void {
    this.destinationSearch = value;
    this.destinationAcademyId = typeof value === 'number' && this.destinationOptions.some(a => a.id === value) ? value : null;
  }
  async search(page = 1): Promise<void> {
    if (this.saving || this.opening || this.form.invalid) { this.form.markAllAsTouched(); return; }
    const query = this.form.getRawValue(); const sequence = ++this.sequence;
    this.searching = true; this.results = null; this.selected = null; this.destinationAcademyId = null; this.destinationSearch = ''; this.error = ''; this.success = '';
    if (this.mode === 'move') this.sourceAcademyId = null;
    try {
      const results = await firstValueFrom(this.service.search(query.criterion, query.query.trim(), null, page));
      if (sequence === this.sequence) this.results = results;
    } catch (error) { if (sequence === this.sequence) this.error = this.message(error, 'No fue posible buscar alumnos.'); }
    finally { if (sequence === this.sequence) this.searching = false; }
  }
  changePage(event: PageEvent): void { void this.search(event.pageIndex + 1); }
  selectStudent(student: ManagedStudent): void {
    if (this.saving || this.searching || this.opening) return;
    this.selected = student; this.sourceAcademyId = student.academies.length === 1 ? student.academies[0].id : null;
    this.destinationAcademyId = null; this.destinationSearch = ''; this.success = ''; this.error = '';
  }
  selectTransferSource(id: number): void {
    if (this.saving || !this.selected?.academies.some(a => a.id === id)) return;
    this.sourceAcademyId = id; this.destinationAcademyId = null; this.destinationSearch = ''; this.error = '';
  }
  async openStudent(mode: 'student' | 'edit', row?: ManagedStudent): Promise<void> {
    if (this.opening || this.saving) return;
    const academy = mode === 'student' ? this.academies.find(a => a.id === this.sourceAcademyId)
      : row?.academies[0] ?? (row ? { id: 0, name: 'Sin dojo asociado' } : undefined);
    if (!academy) { this.error = 'El alumno no tiene un dojo activo asociado.'; return; }
    this.opening = true; this.error = '';
    try {
      const student = row ? await firstValueFrom(this.students.getStudent(row.id, true)) : undefined;
      const saved = await firstValueFrom(this.dialog.open(StudentDialogComponent, { width: '760px', maxWidth: '95vw',
        data: { mode, students: [], student, academyId: academy.id, academyName: academy.name, systemAdmin: true } }).afterClosed());
      if (saved) { this.success = mode === 'student' ? `Alumno inscrito en ${academy.name}.` : 'Datos del alumno actualizados.'; }
    } catch (error) { this.error = this.message(error, 'No fue posible cargar el formulario del alumno.'); }
    finally { this.opening = false; }
    if (mode === 'edit' && this.success) { const success = this.success; await this.search(this.results?.page ?? 1); this.success = success; }
  }
  async move(): Promise<void> {
    if (this.saving || this.searching || !this.selected || !this.sourceAcademyId || !this.destinationAcademyId || this.sourceAcademyId === this.destinationAcademyId) return;
    this.saving = true; this.error = ''; this.success = '';
    const name = `${this.selected.firstName} ${this.selected.lastName}`;
    const destination = this.displayAcademy(this.destinationAcademyId);
    try {
      await firstValueFrom(this.service.move(this.selected.id, this.sourceAcademyId, this.destinationAcademyId));
      this.resetResults(); this.success = `${name} fue trasladado a ${destination}.`;
    } catch (error) { this.error = this.message(error, 'No fue posible mover al alumno.'); }
    finally { this.saving = false; }
  }
  private message(error: any, fallback: string): string { return Object.values(error?.error?.errors ?? {}).flat().join(' ') || error?.error?.message || fallback; }
}
