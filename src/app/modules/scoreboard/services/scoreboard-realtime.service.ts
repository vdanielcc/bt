import { Injectable, OnDestroy } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel
} from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ScoreboardRealtimeEvent {
  type: string;
  payload: unknown;
}
@Injectable({ providedIn: 'root' })
export class ScoreboardRealtimeService implements OnDestroy {
  readonly events$ = new Subject<ScoreboardRealtimeEvent>();
  private connection?: HubConnection;
  async connect(
    eventId: number,
    areaId?: number,
    matchId?: string
  ): Promise<void> {
    await this.disconnect();
    const hubUrl = environment.apiBaseUrl.replace(
      /\/api\/?$/,
      '/hubs/scoreboard'
    );
    this.connection = new HubConnectionBuilder()
      .withUrl(hubUrl, { accessTokenFactory: () => this.token() })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();
    [
      'MatchLoaded',
      'MatchStarted',
      'TimerChanged',
      'ScoreChanged',
      'PenaltyChanged',
      'MatchStateChanged',
      'MatchFinished',
      'ResultConfirmed',
      'NextMatchLoaded'
    ].forEach((type) =>
      this.connection?.on(type, (payload) =>
        this.events$.next({ type, payload })
      )
    );
    try {
      await this.connection.start();
      await this.connection.invoke('Subscribe', { eventId, areaId, matchId });
    } catch {
      /* IndexedDB and BroadcastChannel remain authoritative offline. */
    }
  }
  async disconnect(): Promise<void> {
    if (
      this.connection &&
      this.connection.state !== HubConnectionState.Disconnected
    )
      await this.connection.stop();
    this.connection = undefined;
  }
  ngOnDestroy(): void {
    void this.disconnect();
    this.events$.complete();
  }
  private token(): string {
    try {
      const raw = sessionStorage.getItem('bte-impersonated-session') ?? localStorage.getItem('bte-auth-session');
      const s = raw ? JSON.parse(raw) : {};
      const p = s.data ?? s.Data ?? s;
      return p.token ?? p.Token ?? p.accessToken ?? p.AccessToken ?? '';
    } catch {
      return '';
    }
  }
}
