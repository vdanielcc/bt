import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { finalize } from 'rxjs';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { AuthService } from '../../../core/auth/auth.service';
import { AcademyDashboard, AcademyDashboardSession } from '../models/academy-management.models';
import { AcademyManagementService } from '../services/academy-management.service';

@Component({
  selector: 'bte-academy-dashboard', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, MatButtonModule, MatCardModule, MatChipsModule, MatIconModule, MatProgressBarModule, MatTableModule, VexBreadcrumbsComponent, VexPageLayoutComponent, VexPageLayoutContentDirective, VexPageLayoutHeaderDirective],
  templateUrl: './academy-dashboard.component.html', styleUrls: ['./academy-dashboard.component.scss']
})
export class AcademyDashboardComponent implements OnInit {
  academyId = 0; dashboard?: AcademyDashboard; loading = true; errorMessage = '';
  readonly sessionColumns = ['time','class','modality','room','instructor','enrolled','attendance','status','actions'];
  readonly todayLabel = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(new Date());
  constructor(private route: ActivatedRoute, private auth: AuthService, private service: AcademyManagementService, private cdr: ChangeDetectorRef) {}
  ngOnInit(): void { this.academyId = Number(this.route.snapshot.paramMap.get('academyId')) || this.auth.getCurrentUser()?.academieId || 0; this.load(); }
  load(): void { if (!this.academyId) { this.loading=false; this.errorMessage='No se pudo determinar la academia de la sesión.'; return; } this.loading=true; this.errorMessage=''; this.service.getDashboard(this.academyId).pipe(finalize(()=>{this.loading=false;this.cdr.markForCheck();})).subscribe({next:value=>this.dashboard=value,error:error=>this.errorMessage=error?.error?.message??'No fue posible cargar el resumen de la academia.'}); }
  money(value:number):string{return new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(value);}
  statusLabel(value:string):string{return ({SCHEDULED:'Programada',IN_PROGRESS:'En curso',COMPLETED:'Completada',CANCELLED:'Cancelada',PENDING:'Pendiente',PROCESSING:'Procesando',SENT:'Enviada',DELIVERED:'Entregada',READ:'Leída',FAILED:'Fallida'} as Record<string,string>)[value]??value;}
  statusClass(value:string):string{return `status-${value.toLowerCase()}`;}
  canTakeAttendance(session:AcademyDashboardSession):boolean{return session.status!=='CANCELLED';}
}
