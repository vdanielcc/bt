import { eventMapUrl } from '../../../core/security/safe-map-url';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import { EventInvitation } from '../../championships/invitations/event-invitation.model';
import { EventInvitationsService } from '../../championships/invitations/event-invitations.service';

@Component({
  selector: 'bte-public-event-detail',
  standalone: true,
  templateUrl: './public-event-detail.component.html',
  styleUrls: ['./public-event-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule]
})
export class PublicEventDetailComponent implements OnInit {
  event?: EventInvitation;
  description?: string;
  mapUrl?: SafeResourceUrl;
  loading = true;
  loadError = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly service: EventInvitationsService,
    private readonly sanitizer: DomSanitizer,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const eventId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(eventId) || eventId <= 0) {
      this.loading = false;
      this.loadError = true;
      return;
    }

    this.service.getEvent(eventId).pipe(finalize(() => {
      this.loading = false;
      this.cdr.markForCheck();
    })).subscribe({
      next: (event) => {
        this.event = event;
        this.description = event.descriptions || '';
        const map = eventMapUrl(event);
        this.mapUrl = map ? this.sanitizer.bypassSecurityTrustResourceUrl(map) : undefined;
      },
      error: () => { this.loadError = true; }
    });
  }
}
