import { Component, DestroyRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize, Subscription } from 'rxjs';
import { AcademyUser, AcademyUsersService, ADMIN_USER_ROLES, UserAcademyOption, userManagementError } from './academy-users.service';
import { AcademyUserDialogComponent } from './academy-user-dialog.component';

@Component({
  selector: 'bte-academy-users', standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatIconModule, MatPaginatorModule, MatTableModule, MatProgressSpinnerModule, MatSnackBarModule],
  templateUrl: './academy-users.component.html',
  styles: [`:host{display:block;padding:24px}.heading{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:24px}h1{font-size:26px;font-weight:600;margin:0}.subtitle{margin-top:8px;color:var(--mat-secondary-text)}.card{padding:24px}.table-scroll{overflow:auto}table{width:100%}.state{padding:40px;text-align:center}.state mat-spinner{margin:auto}.error{color:#b91c1c}.status{border-radius:16px;padding:4px 12px;background:#f3f4f6;color:#374151}.active{background:#dcfce7;color:#166534}mat-form-field{width:100%;max-width:450px}`]
})
export class AcademyUsersComponent implements OnInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private loadRequest?: Subscription;
  readonly isSystemAdmin = this.route.snapshot.data?.['systemAdmin'] === true;
  academies: UserAcademyOption[] = [];
  academySearch = '';
  loadingAcademies = false;
  academiesError = '';
  academyId = Number(this.route.snapshot.paramMap.get('academyId') ?? this.route.parent?.snapshot.paramMap.get('academyId') ?? 0);
  loading = false;
  error = '';
  filter = '';
  columns = ['name', 'email', 'role', 'status', 'actions'];
  data = new MatTableDataSource<AcademyUser>();
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) { this.data.paginator = value; }
  constructor(private readonly route: ActivatedRoute, private readonly api: AcademyUsersService,
    private readonly dialog: MatDialog, private readonly snack: MatSnackBar) {}
  ngOnInit(): void {
    this.data.filterPredicate = (row, term) =>
      `${row.firstName} ${row.lastName} ${row.email} ${this.roleLabel(row.role)}`.toLocaleLowerCase().includes(term);
    if (this.isSystemAdmin) this.loadAcademies();
    else this.load();
  }
  get filteredAcademies(): UserAcademyOption[] {
    const term = this.academySearch.trim().toLocaleLowerCase();
    return this.academies.filter(a => `${a.name} ${a.id}`.toLocaleLowerCase().includes(term));
  }
  get selectedAcademyName(): string | undefined { return this.academies.find(a => a.id === this.academyId)?.name; }
  loadAcademies(): void {
    this.loadingAcademies = true;
    this.academiesError = '';
    this.api.academies().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loadingAcademies = false))
      .subscribe({ next: rows => this.academies = rows, error: error => this.academiesError = userManagementError(error) });
  }
  selectAcademy(id: number): void {
    this.academyId = id;
    this.filter = '';
    this.load();
  }
  roleLabel(role: string): string { return ADMIN_USER_ROLES.find(item => item.value === role)?.label ?? role; }
  applyFilter(): void { this.data.filter = this.filter.trim().toLocaleLowerCase(); this.data.paginator?.firstPage(); }
  load(): void {
    this.loadRequest?.unsubscribe();
    this.data.data = [];
    if (!this.academyId) return;
    this.loading = true;
    this.error = '';
    this.loadRequest = this.api.list(this.academyId).pipe(finalize(() => this.loading = false)).subscribe({
      next: users => { this.data.data = users; this.applyFilter(); },
      error: error => this.error = userManagementError(error)
    });
  }
  open(user?: AcademyUser): void {
    if (!this.academyId || this.loading || this.academiesError) return;
    this.dialog.open(AcademyUserDialogComponent, { width: '700px', maxWidth: '96vw',
      data: { academyId: this.academyId, academyName: this.selectedAcademyName,
        systemAdmin: this.isSystemAdmin, user } }).afterClosed().subscribe(saved => {
      if (saved) {
        this.snack.open(user ? 'Usuario actualizado.' : 'Usuario creado.', 'Cerrar', { duration: 4000 });
        this.load();
      }
    });
  }
  ngOnDestroy(): void { this.loadRequest?.unsubscribe(); }
}
