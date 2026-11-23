import { of, throwError } from 'rxjs';
import { WkfScoreboardComponent } from './wkf-scoreboard.component';
import { WkfAuditEntry } from '../../services/wkf-audit.service';

describe('WKF: auditoría y recuperación de envío', () => {
  let component: WkfScoreboardComponent;
  let rows: WkfAuditEntry[];
  let http: any;
  let audit: any;
  beforeEach(() => {
    rows = [];
    audit = {
      entries: jasmine.createSpy().and.callFake(async () => structuredClone(rows)),
      enqueue: jasmine.createSpy().and.callFake(async (e: WkfAuditEntry) => { rows.push(structuredClone(e)); }),
      save: jasmine.createSpy().and.callFake(async (e: WkfAuditEntry) => { rows = rows.filter(x => x.operationId !== e.operationId); rows.push(structuredClone(e)); }),
      cache: jasmine.createSpy().and.resolveTo(undefined)
    };
    http = { post: jasmine.createSpy(), get: jasmine.createSpy() };
    component = new WkfScoreboardComponent({} as any, http, {} as any, audit, { getCurrentUser: () => ({ id: 1, nombreCompleto: 'Operador' }) } as any, { run: (fn: () => void) => fn() } as any, {} as any);
    component.eventId = 1; component.categoryId = 2; component.selected = '4';
    component.snapshot = { revision: 0, serverTime: new Date().toISOString(), state: { status: 'READY' } as any };
  });
  it('no envía una acción si falla la persistencia local', async () => {
    audit.enqueue.and.rejectWith(new Error('QuotaExceededError'));
    await component.act('ADD_YUKO', 'AKA');
    expect(http.post).not.toHaveBeenCalled();
    expect(component.storageError).toBeTruthy();
  });
  it('reintenta un envío sin respuesta con el mismo identificador y no lo marca confirmado antes del ACK', async () => {
    http.post.and.returnValue(throwError(() => ({ status: 0 })));
    await component.act('ADD_YUKO', 'AKA');
    expect(rows[0].status).toBe('PENDING');
    const id = rows[0].operationId;
    http.post.and.returnValue(of({ data: { ...component.snapshot, revision: 1 } }));
    await component.send();
    expect(http.post.calls.mostRecent().args[1].operationId).toBe(id);
    expect(rows[0].status).toBe('SYNCED');
    expect(rows[0].attempts).toBe(2);
  });
  it('guarda rechazos de negocio en el historial sin perder la operación', async () => {
    http.post.and.returnValue(throwError(() => ({ status: 422, error: { message: 'No hay acciones para deshacer' } })));
    await component.act('UNDO');
    expect(rows[0].status).toBe('REJECTED');
    expect(rows[0].error).toContain('No hay acciones');
    expect(component.retry).toBeFalse();
  });
  it('bloquea nuevas acciones mientras la anterior está pendiente', async () => {
    http.post.and.returnValue(throwError(() => ({ status: 0 })));
    await component.act('ADD_YUKO', 'AKA');
    await component.act('ADD_IPPON', 'AO');
    expect(rows.length).toBe(1);
    expect(http.post.calls.count()).toBe(1);
  });
  it('mantiene pendiente si la API respondió pero no se pudo persistir la confirmación', async () => {
    audit.save.and.callFake(async (e: WkfAuditEntry) => {
      if (e.status === 'SYNCED') throw new Error('QuotaExceededError');
      rows = [structuredClone(e)];
    });
    http.post.and.returnValue(of({ data: { ...component.snapshot, revision: 1 } }));
    await component.act('ADD_YUKO', 'AKA');
    expect(rows[0].status).toBe('PENDING');
    expect(component.retry).toBeTrue();
  });
  it('no reenvía bajo otro operador una acción pendiente', async () => {
    http.post.and.returnValue(throwError(() => ({ status: 0 })));
    await component.act('ADD_YUKO', 'AKA');
    (component as any).auth = { getCurrentUser: () => ({ id: 99 }) };
    await component.send();
    expect(http.post.calls.count()).toBe(1);
    expect(component.error).toContain('otro operador');
    expect(rows[0].status).toBe('PENDING');
  });
  it('avisa al display inmediatamente después de finalizar con confirmación de API', async () => {
    const postMessage = jasmine.createSpy();
    (component as any).displayChannel = { postMessage };
    http.post.and.returnValue(of({ data: { ...component.snapshot, revision: 1, state: { status: 'FINISHED', winner: 'AKA' } } }));
    await component.act('FINISH');
    expect(postMessage).toHaveBeenCalledWith({ type: 'MATCH_UPDATED', categoryId: 2, matchId: '4' });
    expect(component.state!.status).toBe('FINISHED');
  });
  it('recibe los avisos entre ventanas del mismo tatami', async () => {
    component.display = true;
    const sender = new BroadcastChannel('bte-wkf-display-1-1');
    try {
      const received = new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('El display no recibió el aviso')), 2000);
        spyOn<any>(component, 'refreshDisplay').and.callFake(async (id: string) => { clearTimeout(timer); resolve(id); });
      });
      (component as any).connectDisplay();
      sender.postMessage({ type: 'MATCH_UPDATED', matchId: '5' });
      expect(await received).toBe('5');
    } finally { sender.close(); component.ngOnDestroy(); }
  });
  it('el display consulta la API y muestra el ganador sin enviar acciones', async () => {
    component.display = true;
    (component as any).api = { getFixtureContext: () => of({ matches: [{ matchId: '4', associationCode: 'WKF', modality: 'KUMITE' }] }) };
    http.get.and.returnValue(of({ data: { ...component.snapshot, revision: 2, state: { status: 'CONFIRMED', winner: 'AO' } } }));
    await (component as any).refreshDisplay('4');
    expect(component.state!.winner).toBe('AO');
    expect(component.state!.status).toBe('CONFIRMED');
    expect(http.post).not.toHaveBeenCalled();
  });
  it('al cambiar encuentro el display acepta su revisión inicial y actualiza competidores oficiales', async () => {
    component.display = true; component.snapshot!.revision = 20;
    (component as any).api = { getFixtureContext: () => of({ matches: [{ matchId: '5', associationCode: 'WKF', modality: 'KUMITE', aka: { name: 'Siguiente AKA' }, shiro: { name: 'Siguiente AO' } }] }) };
    http.get.and.returnValue(of({ data: { ...component.snapshot, revision: 0, state: { status: 'READY', winner: null } } }));
    await (component as any).refreshDisplay('5');
    expect(component.selected).toBe('5');
    expect(component.snapshot!.revision).toBe(0);
    expect(component.name('AKA')).toBe('Siguiente AKA');
    expect(component.name('AO')).toBe('Siguiente AO');
  });
  it('no considera finalizada la categoría mientras quede un encuentro sin confirmar', () => {
    component.matches = [{ matchId: '4', status: 'CONFIRMED' }, { matchId: '5', status: 'FINISHED' }] as any;
    expect(component.categoryCompleted).toBeFalse();
    component.matches[1].status = 'CONFIRMED';
    expect(component.categoryCompleted).toBeTrue();
  });
  it('selecciona la siguiente pendiente en el cronograma y registra el cambio antes de navegar', async () => {
    component.categories = [2, 3, 4].map(id => ({ id, label: String(id), completed: id < 4, hasFixture: true, verified: true }));
    expect(component.nextCategory!.id).toBe(4);
    const navigate = spyOn<any>(component, 'navigateCategory');
    await component.changeCategory(4);
    expect(rows[0].operation.action).toBe('SELECT_CATEGORY');
    expect(rows[0].operation.value).toBe(4);
    expect(rows[0].categoryId).toBe(2);
    expect(navigate).toHaveBeenCalledWith(4);
  });
  it('no cambia de categoría con una acción pendiente de API', async () => {
    component.categories = [{ id: 3, label: 'Siguiente', completed: false, hasFixture: true, verified: true }];
    http.post.and.returnValue(throwError(() => ({ status: 0 })));
    await component.act('ADD_YUKO', 'AKA');
    const navigate = spyOn<any>(component, 'navigateCategory');
    await component.changeCategory(3);
    expect(navigate).not.toHaveBeenCalled();
    expect(rows.length).toBe(1);
  });
  it('el display sigue el cambio de categoría conservando el mismo tatami', async () => {
    component.display = true;
    const sender = new BroadcastChannel('bte-wkf-display-1-1');
    try {
      const received = new Promise<number>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('No recibió el cambio de categoría')), 2000);
        spyOn<any>(component, 'navigateCategory').and.callFake((id: number, matchId: string) => {
          clearTimeout(timer); expect(matchId).toBe('9'); resolve(id);
        });
      });
      (component as any).connectDisplay();
      sender.postMessage({ type: 'MATCH_UPDATED', categoryId: 3, matchId: '9' });
      expect(await received).toBe(3);
    } finally { sender.close(); component.ngOnDestroy(); }
  });
});
