import { WkfAuditEntry, WkfAuditService } from './wkf-audit.service';

describe('WkfAuditService (IndexedDB)', () => {
  let service: WkfAuditService;
  let eventId: number;
  function entry(): WkfAuditEntry {
    const operationId = crypto.randomUUID();
    return { operationId, eventId, categoryId: 2, matchId: '4', occurredAt: new Date().toISOString(),
      operation: { operationId, revision: 0, action: 'ADD_YUKO', side: 'AKA' }, status: 'PENDING', attempts: 0 };
  }
  beforeEach(() => { service = new WkfAuditService(); eventId = Math.floor(Math.random() * 1e9); });
  it('recupera acciones pendientes desde una nueva instancia y conserva la confirmación', async () => {
    const action = entry(); await service.enqueue(action);
    const reopened = new WkfAuditService();
    expect((await reopened.entries(eventId, 2))[0].status).toBe('PENDING');
    await reopened.save({ ...action, status: 'SYNCED', serverRevision: 1 });
    expect((await service.entries(eventId, 2))[0].serverRevision).toBe(1);
  });
  it('impide en forma atómica dos acciones pendientes de la misma categoría', async () => {
    const results = await Promise.allSettled([service.enqueue(entry()), service.enqueue(entry())]);
    expect(results.filter(x => x.status === 'fulfilled').length).toBe(1);
    expect((await service.entries(eventId, 2)).length).toBe(1);
  });
  it('conserva rechazos y conflictos y permite operar tras resolver una pendiente', async () => {
    const first = entry(); await service.enqueue(first);
    await service.save({ ...first, status: 'CONFLICT', error: 'La mesa cambió' });
    await service.enqueue(entry());
    const rows = await service.entries(eventId, 2);
    expect(rows.length).toBe(2);
    expect(rows.some(x => x.status === 'CONFLICT' && !!x.error)).toBeTrue();
  });
});
