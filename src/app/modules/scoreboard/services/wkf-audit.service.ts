import { Injectable } from '@angular/core';

export interface WkfOperation {
  operationId: string;
  revision: number;
  action: string;
  side?: 'AKA' | 'AO';
  value?: number;
  kata?: string;
  judges?: (number | null)[];
  clientOccurredAt?: string;
}
export type WkfAuditStatus = 'PENDING' | 'SYNCED' | 'REJECTED' | 'CONFLICT' | 'LOCAL';
export interface WkfAuditEntry {
  operationId: string;
  eventId: number;
  categoryId: number;
  matchId: string;
  occurredAt: string;
  operation: WkfOperation;
  status: WkfAuditStatus;
  attempts: number;
  actorId?: number;
  actorName?: string;
  serverOffsetMs?: number;
  lastAttemptAt?: string;
  acknowledgedAt?: string;
  serverRevision?: number;
  error?: string;
  before?: unknown;
  after?: unknown;
}

@Injectable({ providedIn: 'root' })
export class WkfAuditService {
  private opening?: Promise<IDBDatabase>;
  private open(): Promise<IDBDatabase> {
    return this.opening ??= new Promise((resolve, reject) => {
      const request = indexedDB.open('bte-wkf-audit', 1);
      request.onupgradeneeded = () => {
        const entries = request.result.createObjectStore('entries', { keyPath: 'operationId' });
        entries.createIndex('category', ['eventId', 'categoryId']);
        request.result.createObjectStore('cache');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => { this.opening = undefined; reject(request.error); };
      request.onblocked = () => { this.opening = undefined; reject(new Error('Cierre otras pestañas para habilitar el historial WKF.')); };
    });
  }
  private async transact<T>(store: string, mode: IDBTransactionMode, command: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.open();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const request = command(tx.objectStore(store));
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = tx.onerror = () => reject(tx.error ?? request.error ?? new Error('No se pudo guardar el historial local.'));
    });
  }
  async entries(eventId: number, categoryId: number): Promise<WkfAuditEntry[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('entries', 'readonly');
      const request = tx.objectStore('entries').index('category').getAll(IDBKeyRange.only([eventId, categoryId]));
      tx.oncomplete = () => resolve((request.result as WkfAuditEntry[]).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)));
      tx.onabort = tx.onerror = () => reject(tx.error);
    });
  }
  // Save before sending; resolve only after the transaction has committed.
  async enqueue(entry: WkfAuditEntry): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('entries', 'readwrite');
      const store = tx.objectStore('entries');
      let blocked = false;
      const request = store.index('category').getAll(IDBKeyRange.only([entry.eventId, entry.categoryId]));
      request.onsuccess = () => {
        if ((request.result as WkfAuditEntry[]).some(x => x.status === 'PENDING' && x.operationId !== entry.operationId)) {
          blocked = true; tx.abort(); return;
        }
        store.add(entry);
      };
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () => reject(new Error(blocked ? 'Hay una operación pendiente en otra pestaña. Sincronice antes de continuar.' : 'No se pudo guardar la acción en el navegador.'));
    });
  }
  async save(entry: WkfAuditEntry): Promise<void> { await this.transact('entries', 'readwrite', s => s.put(entry)); }
  async cache<T>(key: string, value: T): Promise<void> { await this.transact('cache', 'readwrite', s => s.put(value, key)); }
  async cached<T>(key: string): Promise<T | undefined> { return this.transact('cache', 'readonly', s => s.get(key)); }
}
