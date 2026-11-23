import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { AuthService } from '../../../core/auth/auth.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { EventInvitation } from '../invitations/event-invitation.model';
import { EventInvitationsService } from '../invitations/event-invitations.service';

@Component({
  selector: 'bte-my-events', standalone: true,
  templateUrl: './my-events.component.html', styleUrls: ['./my-events.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, MatButtonModule, MatCardModule, MatIconModule,
    MatProgressSpinnerModule, VexBreadcrumbsComponent, VexPageLayoutComponent,
    VexPageLayoutContentDirective, VexPageLayoutHeaderDirective, TranslatePipe]
})
export class MyEventsComponent implements OnInit {
  events: EventInvitation[] = [];
  loading = true;
  loadError = false;
  private readonly academyId: number;
  private readonly isAdmin: boolean;

  constructor(private eventsService: EventInvitationsService, auth: AuthService,
    private cdr: ChangeDetectorRef) {
    this.academyId = auth.getCurrentUser()?.academieId ?? 0;
    this.isAdmin = auth.getCurrentUser()?.rol === 'admin';
  }

  ngOnInit(): void { this.loadEvents(); }

  loadEvents(): void {
    this.loading = true; this.loadError = false;
    this.eventsService.getEvents().pipe(finalize(() => {
      this.loading = false; this.cdr.markForCheck();
    })).subscribe({
      next: (events) => { this.events = this.isAdmin ? events : events.filter((event) => Number(event.academyId) === Number(this.academyId) || (event.coOrganizerAcademyIds ?? []).includes(Number(this.academyId))); },
      error: () => { this.events = []; this.loadError = true; }
    });
  }

  trackById(_: number, event: EventInvitation): number { return event.id; }
  onPosterError(event: Event): void { (event.target as HTMLImageElement).classList.add('poster-error'); }
}
