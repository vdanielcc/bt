import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { ScoreboardMatchState } from '../models/scoreboard.models';

@Injectable()
export class ScoreboardChannelService implements OnDestroy {
  readonly messages$ = new Subject<ScoreboardMatchState>();
  private channel?: BroadcastChannel;
  connect(eventId: number, areaId: number): void {
    this.channel?.close();
    if (!('BroadcastChannel' in window)) return;
    this.channel = new BroadcastChannel(`scoreboard-${eventId}-${areaId}`);
    this.channel.onmessage = (event) =>
      this.messages$.next(event.data as ScoreboardMatchState);
  }
  publish(state: ScoreboardMatchState): void {
    this.channel?.postMessage(state);
  }
  ngOnDestroy(): void {
    this.channel?.close();
    this.messages$.complete();
  }
}
