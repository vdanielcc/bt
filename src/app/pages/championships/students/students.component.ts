import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { AcademyStudent, StudentDialogMode } from './students.models';
import { DeleteStudentDialogComponent } from './delete-student-dialog.component';
import { StudentDialogComponent } from './student-dialog.component';
import { StudentsService } from './students.service';
import { StudentListExportService } from './student-list-export.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { LanguageService } from '../../../core/i18n/language.service';
import { RouterLink } from '@angular/router';

@Component({ selector: 'bte-students', standalone: true, templateUrl: './students.component.html', styleUrls: ['./students.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule,
    MatInputModule, MatPaginatorModule, MatSnackBarModule, MatSortModule, MatTableModule, MatTooltipModule,
    VexBreadcrumbsComponent, VexPageLayoutComponent, VexPageLayoutContentDirective, VexPageLayoutHeaderDirective,
    TranslatePipe, RouterLink] })
export class StudentsComponent implements OnInit, AfterViewInit {
  displayedColumns = ['firstName', 'lastName', 'role', 'birthDate', 'actions'];
  dataSource = new MatTableDataSource<AcademyStudent>([]);
  searchControl = new FormControl('', { nonNullable: true });
  loading = true; errorMessage = '';
  exporting: 'excel' | 'pdf' | null = null;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  constructor(private service: StudentsService, private dialog: MatDialog, private snackBar: MatSnackBar,
    private language: LanguageService, private readonly exports: StudentListExportService) {}
  get exportStudents(): AcademyStudent[] {
    const rows = this.dataSource.filteredData.filter(student => !this.isTeam(student));
    return this.dataSource.sort ? this.dataSource.sortData([...rows], this.dataSource.sort) : rows;
  }
  async downloadList(format: 'excel' | 'pdf'): Promise<void> {
    if (this.loading || this.errorMessage || this.exporting) return;
    const students = this.exportStudents;
    if (!students.length) return;
    this.exporting = format;
    try { await this.exports.download(format, this.service.academyId, students); }
    catch (error) {
      this.snackBar.open(this.language.translate(error instanceof Error ? error.message : 'No fue posible descargar el listado.'),
        this.language.translate('Cerrar'), { duration: 5000 });
    } finally { this.exporting = null; }
  }
  ngOnInit(): void { this.load(); this.searchControl.valueChanges.pipe(debounceTime(200), distinctUntilChanged()).subscribe(value => this.dataSource.filter = value.trim().toLowerCase()); }
  ngAfterViewInit(): void { this.dataSource.paginator = this.paginator; this.dataSource.sort = this.sort; }
  load(): void { this.loading = true; this.errorMessage = ''; this.service.getStudents().pipe(finalize(() => this.loading = false)).subscribe({ next: students => this.dataSource.data = students, error: error => this.errorMessage = error?.error?.message ?? this.language.translate('No fue posible cargar los deportistas.') }); }
  open(mode: StudentDialogMode, student?: AcademyStudent): void { this.dialog.open(StudentDialogComponent, { width: '760px', maxWidth: '95vw', data: { mode, students: this.dataSource.data, student } }).afterClosed().subscribe(saved => { if (saved) { this.snackBar.open(this.language.translate('Información guardada correctamente.'), this.language.translate('Cerrar'), { duration: 3500 }); this.load(); } }); }
  edit(student: AcademyStudent): void {
    this.service.getStudent(student.id).subscribe({
      next: details => this.open('edit', { ...student, ...details, id: student.id }),
      error: () => this.snackBar.open(this.language.translate('No fue posible cargar los datos del alumno.'), this.language.translate('Cerrar'), { duration: 4500 })
    });
  }
  delete(student: AcademyStudent): void {
    this.dialog.open(DeleteStudentDialogComponent, {
      width: '440px', maxWidth: '95vw', data: student, autoFocus: 'first-tabbable'
    }).afterClosed().subscribe(deleted => {
      if (!deleted) return;
      this.snackBar.open(this.language.translate('Registro eliminado.'), this.language.translate('Cerrar'), { duration: 3000 });
      this.load();
    });
  }
  roleLabel(role: string): string { return role === 'Sportman' || role === 'D' ? 'Deportista' : (role === 'Team' || role === 'Equipo') ? 'Equipo' : 'Coach'; }
  isTeam(student: AcademyStudent): boolean { return student.role === 'Team' || student.role === 'Equipo'; }
}
