import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, finalize, of } from 'rxjs';
import { addMonths } from 'date-fns';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { stagger40ms } from '@vex/animations/stagger.animation';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { EventInvitation } from './event-invitation.model';
import { EventInvitationsService } from './event-invitations.service';

@Component({
  selector: 'bte-event-invitations',
  standalone: true,
  templateUrl: './event-invitations.component.html',
  styleUrls: ['./event-invitations.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeInUp400ms, stagger40ms],
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    VexBreadcrumbsComponent,
    VexPageLayoutComponent,
    VexPageLayoutContentDirective,
    VexPageLayoutHeaderDirective,
    TranslatePipe
  ]
})
export class EventInvitationsComponent implements OnInit {
  events: EventInvitation[] = [];
  loading = true;
  loadError = false;

  constructor(
    private readonly invitationsService: EventInvitationsService,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.loading = true;
    this.loadError = false;

    this.invitationsService
      .getEvents()
      .pipe(
        catchError(() => {
          this.loadError = true;
          return of([]);
        }),
        finalize(() => {
          this.loading = false;
          this.changeDetectorRef.markForCheck();
        })
      )
      .subscribe((events) => {
        this.events = events;
        this.changeDetectorRef.markForCheck();
      });
  }

  isAvailable(event: EventInvitation): boolean {
    const checkin = new Date(event.eventDateCheckin);
    return !Number.isNaN(checkin.getTime()) && checkin.getTime() > Date.now();
  }

  canViewDetails(event: EventInvitation): boolean {
    const end = new Date(event.eventDateEnd || '');
    if (Number.isNaN(end.getTime())) return this.isAvailable(event);
    return Date.now() < addMonths(end, 1).getTime();
  }

  trackByEventId(_: number, event: EventInvitation): number {
    return event.id;
  }

  onPosterError(event: Event): void {
    (event.target as HTMLImageElement).classList.add('poster-unavailable');
  }
}
