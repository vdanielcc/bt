import { Injectable } from '@angular/core';
import {
  ScoreboardAction,
  ScoreboardMatchState,
  ScoreboardRuleSet,
  ScoreboardSyncOperation
} from '../models/scoreboard.models';

type StoreName =
  | 'events'
  | 'areas'
  | 'matches'
  | 'match_states'
  | 'actions'
  | 'sync_queue'
  | 'rule_sets'
  | 'terminals';

@Injectable({ providedIn: 'root' })
export class ScoreboardDbService {
  private readonly dbName = 'bte-scoreboard';
  private readonly version = 1;
  private dbPromise?: Promise<IDBDatabase>;

  private open(): Promise<IDBDatabase> {
    return (this.dbPromise ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      request.onupgradeneeded = () => {
        const db = request.result;
        const stores: Array<[StoreName, string]> = [
          ['events', 'id'],
          ['areas', 'id'],
          ['matches', 'matchId'],
          ['match_states', 'matchId'],
          ['actions', 'operationId'],
          ['sync_queue', 'operationId'],
          ['rule_sets', 'id'],
          ['terminals', 'id']
        ];
        stores.forEach(([name, keyPath]) => {
          if (!db.objectStoreNames.contains(name))
            db.createObjectStore(name, { keyPath });
        });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }));
  }
  async put<T>(store: StoreName, value: T): Promise<void> {
    await this.request(store, 'readwrite', (s) => s.put(value));
  }
  async get<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
    return this.request(store, 'readonly', (s) => s.get(key));
  }
  async getAll<T>(store: StoreName): Promise<T[]> {
    return this.request(store, 'readonly', (s) => s.getAll());
  }
  async delete(store: StoreName, key: IDBValidKey): Promise<void> {
    await this.request(store, 'readwrite', (s) => s.delete(key));
  }
  saveMatch(state: ScoreboardMatchState): Promise<void> {
    return this.put('match_states', state);
  }
  async findMatch(
    eventId: number,
    areaId: number
  ): Promise<ScoreboardMatchState | undefined> {
    const matches = await this.getAll<ScoreboardMatchState>('match_states');
    return matches
      .filter((match) => match.eventId === eventId && match.areaId === areaId)
      .sort((a, b) => b.sequence - a.sequence)[0];
  }
  async getRuleSet(id: number): Promise<ScoreboardRuleSet | undefined> {
    return this.get<ScoreboardRuleSet>('rule_sets', id);
  }
  async findRuleSet(
    associationCode: string,
    modality: ScoreboardRuleSet['modality']
  ): Promise<ScoreboardRuleSet | undefined> {
    return (await this.getAll<ScoreboardRuleSet>('rule_sets')).find(
      (ruleSet) =>
        ruleSet.associationCode.toUpperCase() === associationCode.toUpperCase() &&
        ruleSet.modality === modality
    );
  }
  async getActions(matchId: string): Promise<ScoreboardAction[]> {
    return (await this.getAll<ScoreboardAction>('actions'))
      .filter((action) => action.matchId === matchId)
      .sort((a, b) => a.sequence - b.sequence);
  }
  saveRuleSet(ruleSet: ScoreboardRuleSet): Promise<void> {
    return this.put('rule_sets', ruleSet);
  }
  saveAction(action: ScoreboardAction): Promise<void> {
    return this.put('actions', action);
  }
  queue(operation: ScoreboardSyncOperation): Promise<void> {
    return this.put('sync_queue', operation);
  }
  pending(): Promise<ScoreboardSyncOperation[]> {
    return this.getAll<ScoreboardSyncOperation>('sync_queue').then((x) =>
      x
        .filter((o) => o.status !== 'SYNCED')
        .sort((a, b) => a.sequence - b.sequence)
    );
  }

  private async request<T>(
    store: StoreName,
    mode: IDBTransactionMode,
    command: (store: IDBObjectStore) => IDBRequest
  ): Promise<T> {
    const db = await this.open();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const request = command(tx.objectStore(store));
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error);
    });
  }
}
