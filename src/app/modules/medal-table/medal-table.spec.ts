import { unzipSync, strFromU8 } from 'fflate';
import { MedalState, MedalTableService } from './medal-table.service';
import { MedalTableComponent } from './medal-table.component';
import { MedalTableExportService } from './medal-table-export.service';

const state = (): MedalState => ({
  event: { id: 10, name: 'Campeonato de prueba', eventDateStart: '2026-10-30', eventDateEnd: '2026-10-30' },
  revision: 2, isPublic: false, bronzeCount: 1, serverConfirmedAt: '2026-10-30T12:00:00Z',
  categories: [{ categoryId: 20, name: 'Kata' }], entrants: [],
  ranking: [{ academyId: 1, name: '=SUM(A1:A4) & Dojo', gold: 1, silver: 0, bronze: 0, total: 1 }],
  podiums: [
    { categoryId: 20, source: 'manual', published: true, awards: [{ competitorId: 1, academyId: 1, name: 'Ana', medal: 'gold' }] },
    { categoryId: 21, source: 'manual', published: false, awards: [{ competitorId: 2, academyId: 1, name: 'No publicado', medal: 'gold' }] }
  ]
});

describe('Medallero: exportaciones y copia local', () => {
  it('genera un XLSX con clasificación, marca, texto seguro y solo detalle publicado', async () => {
    const pixel = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlS8AAAAASUVORK5CYII='), c => c.charCodeAt(0));
    spyOn(window, 'fetch').and.returnValue(Promise.resolve(new Response(pixel, { status: 200 })));
    let downloaded!: Blob;
    const api = { download: (blob: Blob) => downloaded = blob } as unknown as MedalTableService;
    await new MedalTableExportService(api).export(state(), 'excel');
    const files = unzipSync(new Uint8Array(await downloaded.arrayBuffer()));
    expect(files['[Content_Types].xml']).toBeTruthy();
    expect(files['xl/media/logo.png']).toBeTruthy();
    expect(strFromU8(files['xl/worksheets/_rels/sheet1.xml.rels'])).toContain('drawing1.xml');
    for (const [path, bytes] of Object.entries(files)) {
      if (path.endsWith('.xml') || path.endsWith('.rels'))
        expect(new DOMParser().parseFromString(strFromU8(bytes), 'application/xml').querySelector('parsererror')).toBeNull();
    }
    const ranking = strFromU8(files['xl/worksheets/sheet1.xml']);
    expect(ranking).toContain('Budo Tournaments');
    expect(ranking).toContain('=SUM(A1:A4) &amp; Dojo');
    expect(ranking).not.toContain('<f>');
    const detail = strFromU8(files['xl/worksheets/sheet2.xml']);
    expect(detail).toContain('Ana'); expect(detail).not.toContain('No publicado');
  });

  it('exporta el JSON local si se pierde la conexión al solicitar el respaldo', async () => {
    let downloaded!: Blob;
    const api = { get: () => Promise.reject({ status: 0 }), local: () => null,
      download: (blob: Blob) => downloaded = blob } as unknown as MedalTableService;
    const component = new MedalTableComponent({ snapshot: { data: {} } } as any, api,
      { open: () => undefined } as any, {} as any, {} as any);
    component.eventId = 10; component.state = state();
    await component.backup();
    const result = JSON.parse(await downloaded.text());
    expect(result.eventId).toBe(10); expect(result.localCopy).toBeTrue();
    expect(result.lastServerConfirmedAt).toBe(state().serverConfirmedAt);
    expect(component.offline).toBeTrue();
  });

  it('aísla los respaldos por usuario y campeonato', async () => {
    let userId = 70101;
    const auth = { getCurrentUser: () => ({ id: userId }) };
    const service = new MedalTableService({} as any, auth as any);
    const backup = { formatVersion: 1, eventId: 10, exportedAt: '', revision: 2, isPublic: false, bronzeCount: 1, podiums: [] };
    spyOn(service, 'get').and.returnValue(Promise.resolve(backup));
    try {
      await service.cache(10, state());
      expect(service.local(10)?.backup.eventId).toBe(10);
      expect(service.local(11)).toBeNull();
      userId = 70102; expect(service.local(10)).toBeNull();
    } finally { userId = 70101; service.purge(10); }
  });
});
