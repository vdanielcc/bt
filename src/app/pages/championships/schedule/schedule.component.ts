import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem
} from '@angular/cdk/drag-drop';
import { MatMenuModule } from '@angular/material/menu';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize, firstValueFrom, forkJoin } from 'rxjs';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { AuthService } from '../../../core/auth/auth.service';
import { EventInvitation } from '../invitations/event-invitation.model';
import { EventInvitationsService } from '../invitations/event-invitations.service';
import { isScheduleKumite, orderScheduleCategories } from './schedule-order';
import { SchedulePdfService } from './schedule-pdf.service';
import { scheduleStart, scheduleTimes } from './schedule-times';

interface ScheduleItem {
  key: string;
  type: 'category' | 'break';
  id: number;
  name: string;
  code: string;
  competitorCount: number;
  durationMinutes: number | null;
}

interface CompetitionArea {
  number: number;
  items: ScheduleItem[];
}

interface BreakDialogData {
  description: string;
  durationMinutes: number;
}

@Component({
  selector: 'bte-schedule',
  standalone: true,
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    MatButtonModule,
    MatCardModule,
    MatMenuModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    VexBreadcrumbsComponent,
    VexPageLayoutComponent,
    VexPageLayoutContentDirective,
    VexPageLayoutHeaderDirective
  ]
})
export class ScheduleComponent implements OnInit {
  events: EventInvitation[] = [];
  selectedEventId: number | null = null;
  areas: CompetitionArea[] = [];
  loadingEvents = true;
  loadingCategories = false;
  loadError = false;
  categoriesError = false;
  saving = false;
  recalculating = false;
  downloadingPdf = false;
  loadingSavedSchedule = false;
  selectedDay = 1;
  private loadedEventId: number | null = null;
  private dayAreas = new Map<number, CompetitionArea[]>();
  private allCategories: ScheduleItem[] = [];

  get days(): number[] {
    return Array.from({ length: this.selectedEvent?.days || 1 }, (_, i) => i + 1);
  }

  get dayStart(): string | undefined {
    return scheduleStart(this.selectedEvent?.eventDateStart)?.plus({ days: this.selectedDay - 1 }).toISO() ?? undefined;
  }

  selectDay(day: number): void {
    this.dayAreas.set(this.selectedDay, this.areas);
    this.selectedDay = day;
    const cached = this.dayAreas.get(day);
    if (cached) { this.areas = cached; return; }
    this.loadCategories();
  }

  areaEnd(area: CompetitionArea): string {
    const times = scheduleTimes(this.dayStart, area.items);
    return times[times.length - 1]?.end ?? this.eventStartTime;
  }

  areaParticipants(area: CompetitionArea): number {
    return area.items.reduce((sum, item) => sum + item.competitorCount, 0);
  }

  async moveToDay(area: CompetitionArea, index: number, day: number): Promise<void> {
    if (day === this.selectedDay || !this.selectedEventId) return;
    const eventId = this.selectedEventId;
    const item = area.items[index];
    let target = this.dayAreas.get(day);
    if (!target) {
      this.loadingSavedSchedule = true;
      try {
        const saved = await firstValueFrom(this.eventsService.getEventSchedule(eventId, day));
        if (eventId !== this.selectedEventId) return;
        target = this.readAreas(saved);
      } catch {
        this.snackBar.open('No fue posible cargar el día de destino.', undefined, { duration: 5000 });
        return;
      } finally {
        this.loadingSavedSchedule = false;
        this.cdr.markForCheck();
      }
    }
    // Save the source first; the API rejects categories assigned to two days.
    const sourceIndex = area.items.indexOf(item);
    if (sourceIndex < 0) return;
    area.items.splice(sourceIndex, 1);
    target.find(a => a.number === area.number)?.items.push(item);
    this.dayAreas.set(day, target);
    this.snackBar.open('Guarda este día y luego selecciona el día de destino para guardar la categoría.', undefined, { duration: 6500 });
    this.cdr.markForCheck();
  }

  private readAreas(schedule: any): CompetitionArea[] {
    const areas = this.createAreas(this.selectedEvent?.numberOfAreas ?? 0);
    for (const savedArea of schedule?.areas ?? schedule?.Areas ?? []) {
      const area = areas.find(a => a.number === Number(savedArea.areaNumber ?? savedArea.AreaNumber));
      if (!area) continue;
      area.items = (savedArea.items ?? savedArea.Items ?? []).flatMap((saved: any) => {
        if ((saved.type ?? saved.Type) === 'break') return [{
          key: `break-${saved.id ?? saved.Id}`, type: 'break', id: 0,
          name: saved.description ?? saved.Description ?? 'Receso', code: 'RECESO', competitorCount: 0,
          durationMinutes: Number(saved.durationMinutes ?? saved.DurationMinutes ?? 0)
        }];
        const category = this.allCategories.find(c => c.id === Number(saved.categoryId ?? saved.CategoryId));
        return category ? [{ ...category, durationMinutes: Number(saved.durationMinutes ?? saved.DurationMinutes ?? category.durationMinutes) }] : [];
      });
    }
    return areas;
  }

  private readonly academyId: number;
  private readonly isAdmin: boolean;

  constructor(
    auth: AuthService,
    private readonly eventsService: EventInvitationsService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly cdr: ChangeDetectorRef,
    private readonly schedulePdf: SchedulePdfService
  ) {
    this.academyId = Number(auth.getCurrentUser()?.academieId ?? 0);
    this.isAdmin = auth.getCurrentUser()?.rol === 'admin';
  }

  ngOnInit(): void {
    this.loadEvents();
  }

  get selectedEvent(): EventInvitation | undefined {
    return this.events.find((event) => event.id === this.selectedEventId);
  }

  get connectedAreaIds(): string[] {
    return this.areas.map((area) => this.areaDropListId(area.number));
  }

  loadEvents(): void {
    this.loadingEvents = true;
    this.loadError = false;
    this.eventsService
      .getEvents()
      .pipe(
        finalize(() => {
          this.loadingEvents = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (events) => {
          this.events = events
            .filter(
              (event) =>
                this.isAdmin ||
                ((Number(event.academyId) === this.academyId || (event.coOrganizerAcademyIds ?? []).includes(this.academyId)) &&
                  this.finishedLessThanOneMonthAgo(event))
            )
            .sort(
              (left, right) =>
                this.eventDate(right).getTime() - this.eventDate(left).getTime()
            );
          this.selectedEventId = this.events[0]?.id ?? null;
          this.loadCategories();
        },
        error: () => {
          this.events = [];
          this.loadError = true;
        }
      });
  }

  loadCategories(): void {
    const event = this.selectedEvent;
    if (this.loadedEventId !== this.selectedEventId) {
      this.loadedEventId = this.selectedEventId;
      this.selectedDay = 1;
      this.dayAreas.clear();
    }
    this.loadingSavedSchedule = false;
    this.areas = this.createAreas(event?.numberOfAreas ?? 0);
    this.categoriesError = false;

    if (!event) {
      this.cdr.markForCheck();
      return;
    }

    this.loadingCategories = true;
    this.eventsService
      .getEventCategories(event.id)
      .pipe(
        finalize(() => {
          this.loadingCategories = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (categories) => {
          const mapped = orderScheduleCategories(categories)
            .map((category) => this.mapCategory(category))
            .filter((category) => category.competitorCount >= 1);
          this.allCategories = mapped;
          mapped.filter(category => this.selectedDay === 1 && !Array.from(this.dayAreas.values()).some(areas => areas.some(area => area.items.some(item => item.id === category.id)))).forEach((category, index) => {
            if (this.areas.length) {
              this.areas[index % this.areas.length].items.push(category);
            }
          });
          this.loadSavedSchedule(mapped);
        },
        error: () => {
          this.categoriesError = true;
        }
      });
  }

  drop(event: CdkDragDrop<ScheduleItem[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
    this.cdr.markForCheck();
  }

  removeItem(area: CompetitionArea, itemIndex: number): void {
    area.items.splice(itemIndex, 1);
    this.cdr.markForCheck();
  }

  addBreak(area: CompetitionArea): void {
    this.dialog
      .open<ScheduleBreakDialogComponent, BreakDialogData, BreakDialogData>(
        ScheduleBreakDialogComponent,
        {
          width: '420px',
          data: { description: '', durationMinutes: 15 }
        }
      )
      .afterClosed()
      .subscribe((result) => {
        if (!result?.description?.trim() || Number(result.durationMinutes) <= 0) {
          return;
        }
        area.items.push({
          key: `break-${Date.now()}-${area.number}`,
          type: 'break',
          id: 0,
          name: result.description.trim(),
          code: 'RECESO',
          competitorCount: 0,
          durationMinutes: Number(result.durationMinutes)
        });
        this.cdr.markForCheck();
      });
  }

  recalculate(): void {
    const event = this.selectedEvent;
    if (!event || this.recalculating || this.loadingCategories || this.loadingSavedSchedule || this.categoriesError || this.saving || !this.areas.length) return;
    const areas = this.areas;
    this.recalculating = true;
    this.eventsService.getEventCategories(event.id)
      .pipe(finalize(() => { this.recalculating = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: categories => {
          if (this.selectedEventId !== event.id || this.areas !== areas) return;
          const latest = new Map(categories.map(category => {
            const item = this.mapCategory(category);
            return [item.id, item] as const;
          }));
          let missing = 0;
          this.areas = this.areas.map(area => ({ ...area, items: area.items.map(item => {
            if (item.type === 'break') return item;
            const updated = latest.get(item.id);
            if (!updated) { missing++; return item; }
            return { ...item, competitorCount: updated.competitorCount, durationMinutes: updated.durationMinutes };
          }) }));
          this.snackBar.open(missing
            ? `Tiempos recalculados. ${missing} categorías no disponibles conservaron sus tiempos. Presiona Guardar para conservar los cambios.`
            : 'Tiempos recalculados. Presiona Guardar para conservar los cambios.', undefined, { duration: 5500 });
        },
        error: () => {
          if (this.selectedEventId === event.id && this.areas === areas)
            this.snackBar.open('No fue posible recalcular los tiempos. Inténtalo nuevamente.', undefined, { duration: 5500 });
        }
      });
  }

  async downloadPdf(areaNumber?: number): Promise<void> {
    const event = this.selectedEvent;
    if (!event || this.downloadingPdf || this.recalculating || this.loadingCategories || this.loadingSavedSchedule || this.categoriesError || this.saving || !this.areas.length) return;
    const areas = this.areas
      .filter(area => areaNumber == null || area.number === areaNumber)
      .map(area => ({ ...area, items: area.items.map(item => ({ ...item })) }));
    if (!areas.length) return;
    this.downloadingPdf = true;
    try {
      await this.schedulePdf.download({ ...event, name: `${event.name} · Día ${this.selectedDay}`, eventDateStart: this.dayStart }, areas, `dia-${this.selectedDay}${areaNumber == null ? "-todo" : `-area-${areaNumber}`}`);
    } catch (error) {
      this.snackBar.open(error instanceof Error ? error.message : 'No fue posible descargar el cronograma.', undefined, { duration: 6000 });
    } finally {
      this.downloadingPdf = false;
      this.cdr.markForCheck();
    }
  }

  saveSchedule(): void {
    const event = this.selectedEvent;
    if (!event || this.saving || this.recalculating) {
      return;
    }

    const payload = {
      day: this.selectedDay,
      areas: this.areas.map((area) => ({
          areaNumber: area.number,
          items: area.items.map((item, sequence) => ({
            sequence: sequence + 1,
            type: item.type,
            categoryId: item.type === 'category' ? item.id : null,
            description: item.type === 'break' ? item.name : null,
            durationMinutes: item.durationMinutes
          }))
        }))
    };

    this.saving = true;
    this.eventsService
      .saveEventSchedule(event.id, payload)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () =>
          this.snackBar.open('Cronograma guardado correctamente.', undefined, {
            duration: 3500
          }),
        error: (error) =>
          this.snackBar.open(
            error?.error?.message ??
              error?.error?.Message ??
              'No fue posible guardar el cronograma.',
            undefined,
            { duration: 5500 }
          )
      });
  }

  private loadSavedSchedule(categories: ScheduleItem[]): void {
    const eventId = this.selectedEventId;
    const day = this.selectedDay;
    if (!eventId) return;
    this.loadingSavedSchedule = true;
    forkJoin(this.days.map(d => this.eventsService.getEventSchedule(eventId, d)))
      .pipe(finalize(() => {
        if (eventId === this.selectedEventId) this.loadingSavedSchedule = false;
        this.cdr.markForCheck();
      })).subscribe({
        next: schedules => {
          if (eventId !== this.selectedEventId || day !== this.selectedDay) return;
          const hasSavedItems = schedules.some(schedule =>
            (schedule?.areas ?? schedule?.Areas ?? []).some((area: any) => (area.items ?? area.Items ?? []).length));
          if (hasSavedItems) this.areas = this.readAreas(schedules[day - 1]);
          this.cdr.markForCheck();
        },
        error: () => { this.categoriesError = true; }
      });
  }

  areaDropListId(areaNumber: number): string {
    return `schedule-area-${areaNumber}`;
  }

  areaDuration(area: CompetitionArea): string {
    const total = area.items.reduce(
      (sum, item) => sum + (item.durationMinutes ?? 0),
      0
    );
    return this.formatDuration(total);
  }

  get eventStartTime(): string {
    return scheduleStart(this.dayStart)?.toFormat('HH:mm') ?? 'Por definir';
  }

  itemTime(area: CompetitionArea, index: number): string {
    return scheduleTimes(this.dayStart, area.items)[index]?.start ?? 'Por definir';
  }

  itemDuration(item: ScheduleItem): string {
    return item.durationMinutes == null
      ? 'Por definir'
      : this.formatDuration(item.durationMinutes);
  }

  trackArea(_: number, area: CompetitionArea): number {
    return area.number;
  }

  trackItem(_: number, item: ScheduleItem): string {
    return item.key;
  }

  private createAreas(total: number): CompetitionArea[] {
    return Array.from(
      { length: Math.max(0, Math.trunc(Number(total) || 0)) },
      (_, index) => ({ number: index + 1, items: [] })
    );
  }

  private mapCategory(category: any): ScheduleItem {
    const competitorCount = Number(
      category.competitorCount ??
        category.CompetitorCount ??
        category.totalCompetitors ??
        category.TotalCompetitors ??
        category.competitors?.length ??
        category.Competitors?.length ??
        0
    );
    const matchDuration = this.durationInMinutes(
      category.matchDuration ?? category.MatchDuration ?? category.match_duration
    );
    const fixtureType = category.fixtureType ?? 'ELIMINACION';
    const matches = fixtureType === 'ROUNDROBIN' ? competitorCount * (competitorCount - 1) / 2
      : fixtureType === 'KUDOREPECHAGE' ? Math.max(0, 2 * competitorCount - 1)
      : fixtureType === 'MEJORDETRES' ? (competitorCount === 2 ? 3 : 0) : Math.max(0, competitorCount - 1);

    const id = Number(category.id ?? category.Id ?? category.categoryId ?? category.CategoryId);
    return {
      key: `category-${id}`,
      type: 'category',
      id,
      name: category.name ?? category.Name ?? 'Categoría sin nombre',
      code: category.code ?? category.Code ?? '',
      competitorCount,
      durationMinutes:
        matchDuration == null
          ? null
          : Math.max(
              1,
              this.isKumite(category)
                ? matchDuration * 2 * matches + competitorCount
                : matchDuration * (['ELIMINACION', 'ELIMINACIONKUDO'].includes(fixtureType) ? competitorCount : matches * 2)
            )
    };
  }

  private isKumite(category: any): boolean {
    return isScheduleKumite(category);
  }

  private durationInMinutes(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value !== 'string' || !value.trim()) {
      return null;
    }
    const parts = value.trim().split(':').map(Number);
    if (parts.some((part) => !Number.isFinite(part))) {
      return null;
    }
    if (parts.length === 1) {
      return parts[0];
    }
    if (parts.length === 2) {
      return parts[0] + parts[1] / 60;
    }
    return parts[0] * 60 + parts[1] + parts[2] / 60;
  }

  private formatDuration(minutes: number): string {
    const totalMinutes = Math.max(0, Math.round(minutes));
    const hours = Math.floor(totalMinutes / 60);
    const remaining = totalMinutes % 60;
    return hours ? `${hours} h ${remaining} min` : `${remaining} min`;
  }

  private finishedLessThanOneMonthAgo(event: EventInvitation): boolean {
    const endDate = this.eventDate(event);
    if (Number.isNaN(endDate.getTime())) {
      return true;
    }
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return endDate >= oneMonthAgo;
  }

  private eventDate(event: EventInvitation): Date {
    return new Date(
      event.eventDateEnd ?? event.eventDateStart ?? event.eventDateCheckin
    );
  }
}

@Component({
  selector: 'bte-schedule-break-dialog',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Agregar receso</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline">
        <mat-label>Descripción</mat-label>
        <input matInput [(ngModel)]="data.description" maxlength="200" autofocus />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Duración</mat-label>
        <input matInput type="number" min="1" step="1" [(ngModel)]="data.durationMinutes" />
        <span matTextSuffix>min</span>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="dialogRef.close()">Cancelar</button>
      <button mat-flat-button color="primary" type="button" [disabled]="!valid" (click)="dialogRef.close(data)">Agregar</button>
    </mat-dialog-actions>
  `,
  styles: ['mat-form-field { display: block; width: 100%; }']
})
export class ScheduleBreakDialogComponent {
  constructor(
    public readonly dialogRef: MatDialogRef<ScheduleBreakDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: {
      description: string;
      durationMinutes: number;
    }
  ) {}

  get valid(): boolean {
    return Boolean(this.data.description.trim()) && Number(this.data.durationMinutes) > 0;
  }
}
