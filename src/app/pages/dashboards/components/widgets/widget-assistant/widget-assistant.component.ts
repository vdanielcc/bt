import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../../core/auth/auth.service';
import { EventInvitationsService } from '../../../../championships/invitations/event-invitations.service';
import { EventInvitation } from '../../../../championships/invitations/event-invitation.model';
import { environment } from '../../../../../../environments/environment';

export function nextEventsToFinish(events: EventInvitation[], academyId: number,
  isAdmin: boolean, now = Date.now()): EventInvitation[] {
  return events.filter(event => (isAdmin || (academyId > 0 && Number(event.academyId) === academyId))
      && !!event.eventDateEnd && Number.isFinite(Date.parse(event.eventDateEnd))
      && Date.parse(event.eventDateEnd) >= now)
    .sort((a, b) => Date.parse(a.eventDateEnd!) - Date.parse(b.eventDateEnd!) || a.id - b.id)
    .slice(0, 3);
}

@Component({
  selector: 'vex-widget-assistant',
  templateUrl: './widget-assistant.component.html',
  styleUrls: ['./widget-assistant.component.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink]
})
export class WidgetAssistantComponent implements OnInit {
  firstName = '';
  events: EventInvitation[] = [];
  loading = true;
  nameError = false;
  eventsError = false;
  private readonly destroyRef = inject(DestroyRef);

  constructor(private readonly auth: AuthService, private readonly http: HttpClient,
    private readonly eventsService: EventInvitationsService) {}

  ngOnInit(): void {
    this.auth.currentUser$.pipe(
      tap(() => {
        this.firstName = ''; this.events = []; this.loading = true;
        this.nameError = false; this.eventsError = false;
      }),
      switchMap(user => {
        if (!user) return of({ firstName: '', events: [], nameError: false, eventsError: false });
        return forkJoin({
          person: this.http.get<any>(`${environment.apiBaseUrl}/persons/${user.personId}`).pipe(
            map(response => {
              const person = response?.data ?? response?.Data ?? response;
              return { firstName: String(person?.firstName ?? person?.FirstName ?? '').trim(), error: false };
            }),
            catchError(() => of({ firstName: '', error: true }))
          ),
          events: this.eventsService.getEvents().pipe(
            map(events => ({ items: nextEventsToFinish(events, Number(user.academieId), user.rol === 'admin'), error: false })),
            catchError(() => of({ items: [] as EventInvitation[], error: true }))
          )
        }).pipe(map(result => ({ firstName: result.person.firstName, events: result.events.items,
          nameError: result.person.error, eventsError: result.events.error })));
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(result => {
      this.firstName = result.firstName; this.events = result.events;
      this.nameError = result.nameError; this.eventsError = result.eventsError;
      this.loading = false;
    });
  }
}
