import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../../core/auth/auth.service';
import { OnlineUsersDialogComponent } from './online-users-dialog.component';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer, switchMap, catchError, of, expand } from 'rxjs';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { defaultChartOptions } from '@vex/utils/default-chart-options';
import {
  Order,
  tableSalesData
} from '../../../../static-data/table-sales-data';
import { TableColumn } from '@vex/interfaces/table-column.interface';
import { WidgetTableComponent } from '../components/widgets/widget-table/widget-table.component';
import { WidgetLargeChartComponent } from '../components/widgets/widget-large-chart/widget-large-chart.component';
import { WidgetQuickValueCenterComponent } from '../components/widgets/widget-quick-value-center/widget-quick-value-center.component';
import { WidgetLargeGoalChartComponent } from '../components/widgets/widget-large-goal-chart/widget-large-goal-chart.component';
import { WidgetQuickLineChartComponent } from '../components/widgets/widget-quick-line-chart/widget-quick-line-chart.component';
import { WidgetAssistantComponent } from '../components/widgets/widget-assistant/widget-assistant.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexSecondaryToolbarComponent } from '@vex/components/vex-secondary-toolbar/vex-secondary-toolbar.component';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'vex-dashboard-analytics',
  templateUrl: './dashboard-analytics.component.html',
  styleUrls: ['./dashboard-analytics.component.scss'],
  standalone: true,
  imports: [
    CommonModule, MatDialogModule,
    VexSecondaryToolbarComponent,
    VexBreadcrumbsComponent,
    MatButtonModule,
    MatIconModule,
    WidgetAssistantComponent,
    WidgetQuickLineChartComponent,
    WidgetLargeGoalChartComponent,
    WidgetQuickValueCenterComponent,
    WidgetLargeChartComponent,
    WidgetTableComponent
    ,TranslatePipe
  ]
})
export class DashboardAnalyticsComponent implements OnInit {
  visitsToday = '…';
  visitsDetail = 'Cargando visitas de hoy';
  onlineUsers = '…';
  onlineDetail = new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago' }).format(new Date());
  private onlineRefreshSeconds = 300;
  private readonly onlineSamples: number[] = [];
  private readonly onlineTimes: string[] = [];
  private readonly destroyRef = inject(DestroyRef);
  constructor(private readonly analytics: AnalyticsService) {}

  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  get canManageOnlineUsers(): boolean { return this.auth.getCurrentUser()?.rol === "admin"; }
  showOnlineUsers(): void { this.dialog.open(OnlineUsersDialogComponent, { width: "800px", maxWidth: "95vw" }); }

  ngOnInit(): void {
    timer(1000, 60000).pipe(
      switchMap(() => this.analytics.getToday().pipe(catchError(() => of(null)))),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(data => {
      this.visitsToday = data ? String(data.uniqueVisitors) : '—';
      const seconds = Math.round(data?.averageSessionSeconds ?? 0);
      this.visitsDetail = data ? `${data.sessions} sesiones · Promedio ${Math.floor(seconds / 60)} min ${seconds % 60} s` : 'No se pudieron cargar las visitas';
      this.pageViewsSeries = data ? [{ name: 'Visitantes únicos por hora', data: data.hourly }] : [];
    });
    this.analytics.getOnline().pipe(
      catchError(() => of(null)),
      expand(data => {
        if (data) this.onlineRefreshSeconds = data.refreshSeconds;
        return timer(this.onlineRefreshSeconds * 1000).pipe(
          switchMap(() => this.analytics.getOnline()), catchError(() => of(null))
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(data => {
      if (!data) {
        this.onlineUsers = '—';
        this.onlineDetail = `${new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago' }).format(new Date())} · No se pudo actualizar`;
        return;
      }
      this.onlineUsers = String(data.onlineUsers);
      this.onlineDetail = `${data.date.split('-').reverse().join('/')} · Actualización cada ${data.refreshSeconds % 60 === 0 ? data.refreshSeconds / 60 + ' min' : data.refreshSeconds + ' s'}`;
      this.onlineSamples.push(data.onlineUsers);
      this.onlineTimes.push(new Intl.DateTimeFormat('es-CL', { timeZone: data.timeZone, hour: '2-digit', minute: '2-digit' }).format(new Date(data.asOf)));
      if (this.onlineSamples.length > 12) { this.onlineSamples.shift(); this.onlineTimes.shift(); }
      this.uniqueUsersSeries = [{ name: 'Usuarios en línea', data: [...this.onlineSamples] }];
      this.uniqueUsersOptions = defaultChartOptions({ chart: { type: 'area', height: 100 }, colors: ['#ff9800'], xaxis: { categories: [...this.onlineTimes] } });
    });
  }
  tableColumns: TableColumn<Order>[] = [
    {
      label: '',
      property: 'status',
      type: 'badge'
    },
    {
      label: 'PRODUCT',
      property: 'name',
      type: 'text'
    },
    {
      label: '$ PRICE',
      property: 'price',
      type: 'text',
      cssClasses: ['font-medium']
    },
    {
      label: 'DATE',
      property: 'timestamp',
      type: 'text',
      cssClasses: ['text-secondary']
    }
  ];
  tableData = tableSalesData;

  series: ApexAxisChartSeries = [
    {
      name: 'Subscribers',
      data: [28, 40, 36, 0, 52, 38, 60, 55, 67, 33, 89, 44]
    }
  ];

  userSessionsSeries: ApexAxisChartSeries = [
    {
      name: 'Users',
      data: [10, 50, 26, 50, 38, 60, 50, 25, 61, 80, 40, 60]
    },
    {
      name: 'Sessions',
      data: [5, 21, 42, 70, 41, 20, 35, 50, 10, 15, 30, 50]
    }
  ];

  salesSeries: ApexAxisChartSeries = [
    {
      name: 'Sales',
      data: [28, 40, 36, 0, 52, 38, 60, 55, 99, 54, 38, 87]
    }
  ];

  pageViewsSeries: ApexAxisChartSeries = [
    {
      name: 'Visitantes únicos por hora',
      data: []
    }
  ];
  pageViewsOptions = defaultChartOptions({
    chart: { type: 'area', height: 100 },
    xaxis: { categories: Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`) }
  });

  uniqueUsersSeries: ApexAxisChartSeries = [
    {
      name: 'Usuarios en línea',
      data: []
    }
  ];

  uniqueUsersOptions = defaultChartOptions({
    chart: {
      type: 'area',
      height: 100
    },
    colors: ['#ff9800']
  });
}
