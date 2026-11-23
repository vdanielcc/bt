import { Injectable, OnDestroy } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ScoreboardApiService } from './scoreboard-api.service';
import { ScoreboardDbService } from './scoreboard-db.service';
import { ScoreboardStateService } from './scoreboard-state.service';

@Injectable({ providedIn: 'root' })
export class ScoreboardSyncService implements OnDestroy {
  private syncing = false;
  private retry?: ReturnType<typeof setTimeout>;
  private readonly online = () => {
    this.store.setConnection('ONLINE');
    void this.flush();
  };
  private readonly offline = () => this.store.setConnection('OFFLINE');
  constructor(
    private readonly api: ScoreboardApiService,
    private readonly db: ScoreboardDbService,
    private readonly store: ScoreboardStateService
  ) {
    window.addEventListener('online', this.online);
    window.addEventListener('offline', this.offline);
    void this.refresh();
  }
  async enqueueChanged(): Promise<void> {
    await this.refresh();
    if (navigator.onLine) void this.flush();
  }
  async flush(): Promise<void> {
    if (this.syncing || !navigator.onLine) return;
    const pending = await this.db.pending();
    this.store.setPending(pending.length);
    if (!pending.length) return;
    this.syncing = true;
    this.store.setConnection('SYNCING');
    pending.forEach((o) => {
      o.status = 'SYNCING';
      void this.db.queue(o);
    });
    try {
      const result = await firstValueFrom(this.api.sync(pending));
      const ids = new Set(
        result.processedOperationIds ?? pending.map((o) => o.operationId)
      );
      await Promise.all(
        pending
          .filter((o) => ids.has(o.operationId))
          .map((o) => this.db.delete('sync_queue', o.operationId))
      );
      this.store.setConnection('ONLINE');
    } catch {
      await Promise.all(
        pending.map((o) =>
          this.db.queue({ ...o, status: 'ERROR', retryCount: o.retryCount + 1 })
        )
      );
      this.store.setConnection('ERROR');
      this.retry = setTimeout(
        () => void this.flush(),
        Math.min(30000, 1000 * 2 ** Math.min(pending[0].retryCount, 5))
      );
    } finally {
      this.syncing = false;
      await this.refresh();
    }
  }
  ngOnDestroy(): void {
    window.removeEventListener('online', this.online);
    window.removeEventListener('offline', this.offline);
    if (this.retry) clearTimeout(this.retry);
  }
  private async refresh(): Promise<void> {
    this.store.setPending((await this.db.pending()).length);
  }
}
