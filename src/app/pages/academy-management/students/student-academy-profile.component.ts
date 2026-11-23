import {GradingPageComponent} from '../grading/grading-page.component';
import { BillingAccountStatementComponent } from '../billing/billing-account-statement.component';
import { AttendanceHistoryComponent } from '../attendance/attendance-history.component';
import { StudentClassesComponent } from './student-classes.component';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { finalize, forkJoin, of, switchMap } from 'rxjs';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import {
  BillingCharge,
  BillingPayment,
  StudentGradeHistory,
  StudentGradingProfile
} from '../models/academy-management.models';
import { BillingManagementService } from '../services/billing-management.service';
import { StudentAcademyProfileService } from '../services/student-academy-profile.service';
import { AuthService } from '../../../core/auth/auth.service';
import { AcademyOperationsService } from '../services/academy-operations.service';

@Component({
  selector: 'bte-student-academy-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GradingPageComponent, BillingAccountStatementComponent, StudentClassesComponent, AttendanceHistoryComponent,
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    VexBreadcrumbsComponent,
    VexPageLayoutComponent,
    VexPageLayoutContentDirective,
    VexPageLayoutHeaderDirective
  ],
  template: `<vex-page-layout
    ><vex-page-layout-header class="pb-16"
      ><div class="px-6">
        <vex-breadcrumbs
          [crumbs]="['Academia', 'Alumnos', 'Perfil']"></vex-breadcrumbs>
        <h1 class="title mt-2 mb-0">{{ studentName }}</h1>
      </div></vex-page-layout-header
    ><vex-page-layout-content class="-mt-6"
      ><div *ngIf="loading" class="state">
        <mat-spinner diameter="44"></mat-spinner>
      </div>
      <mat-card *ngIf="!loading"
        ><mat-tab-group
          ><mat-tab label="Resumen"
            ><div class="summary">
              <div>
                <small>Alumno</small><strong>{{ studentName }}</strong>
              </div>
              <div>
                <small>Finanzas</small
                ><strong>Cargos y deuda</strong>
              </div>
              <div>
                <small>Cuenta académica</small
                ><strong>Ver Finanzas</strong>
              </div>
              <div>
                <small>Progresión técnica</small
                ><strong>Ver Grados / Progresión</strong>
              </div>
            </div></mat-tab
          ><mat-tab label="Clases"><ng-template matTabContent><bte-student-classes [studentId]="studentId" /></ng-template></mat-tab><mat-tab label="Finanzas"><ng-template matTabContent><bte-billing-account-statement [studentId]="studentId" /></ng-template></mat-tab
          ><mat-tab label="Grados / Progresión"><ng-template matTabContent><bte-grading-page [studentId]="studentId"/></ng-template></mat-tab
          ><mat-tab label="Asistencia"><ng-template matTabContent><bte-attendance-history [studentId]="studentId" /></ng-template></mat-tab
          ></mat-tab-group
        ></mat-card
      ></vex-page-layout-content
    ></vex-page-layout
  >`,
  styles: [
    `
      .state {
        min-height: 16rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .compact {
        min-height: 9rem;
        color: var(--vex-text-color-secondary);
      }
      .summary {
        padding: 1.5rem;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
      }
      .summary div {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }
      .summary strong {
        font-size: 1.4rem;
      }
      .tab {
        padding: 1.5rem;
      }
      .row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
        padding: 0.7rem 0;
        border-bottom: 1px solid var(--vex-divider-color);
      }
      .balance pre {
        white-space: pre-wrap;
        background: var(--vex-background-hover);
        padding: 1rem;
        border-radius: 0.5rem;
      }
      .profile {
        padding: 1rem 0;
        border-bottom: 1px solid var(--vex-divider-color);
      }
      .timeline {
        display: grid;
        grid-template-columns: 150px 1fr 2fr;
        gap: 1rem;
        padding: 0.6rem;
        border-left: 3px solid rgb(var(--vex-color-primary-500));
      }
      @media (max-width: 800px) {
        .summary,
        .row {
          grid-template-columns: 1fr 1fr;
        }
      }
    `
  ]
})
export class StudentAcademyProfileComponent implements OnInit {
  studentId = 0;
  student: Record<string, unknown> = {};
  balance: unknown = {};
  charges: BillingCharge[] = [];
  payments: BillingPayment[] = [];
  profiles: StudentGradingProfile[] = [];
  histories: Record<number, StudentGradeHistory[]> = {};
  attendance: Record<string, unknown>[] = [];
  attendanceSummary: Record<string, number> = {};
  loading = true;
  get studentName(): string {
    const composed =
      `${this.student['firstName'] ?? this.student['nombres'] ?? ''} ${this.student['lastName'] ?? this.student['apellidos'] ?? ''}`.trim();
    return String(
      this.student['nombreCompleto'] ??
        this.student['fullName'] ??
        (composed || `Alumno ${this.studentId}`)
    );
  }
  constructor(
    private route: ActivatedRoute,
    private profileService: StudentAcademyProfileService,
    private billing: BillingManagementService,
    private auth: AuthService,
    private operations: AcademyOperationsService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}
  ngOnInit(): void {
    this.studentId = Number(this.route.snapshot.paramMap.get('studentId'));
    this.profileService.getStudent(this.studentId).pipe(finalize(()=>{this.loading=false;this.cdr.markForCheck();})).subscribe({next:student=>this.student=student,error:()=>this.student={}});
  }

}
