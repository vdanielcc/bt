const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.argv[2] || process.cwd();
const ts = require(path.join(root, 'node_modules/typescript'));
const source = fs.readFileSync(path.join(root, 'src/app/modules/scoreboard/pages/wkf/wkf-scoreboard.component.ts'), 'utf8');
const javascript = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true } }).outputText;
const storage = new Map();
const context = {
  exports: {}, require: name => name === 'rxjs' ? { firstValueFrom: x => x } : name.includes('environment') ? { environment: { apiBaseUrl: '/api' } } : { Component: () => target => target },
  sessionStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
  crypto: require('node:crypto').webcrypto, Date, URL, window: { confirm: () => true }, setInterval: () => 1, clearInterval() {}
};
vm.runInNewContext(javascript, context);
const Component = context.exports.WkfScoreboardComponent;
const fighter = () => ({ yuko: 0, wazaAri: 0, ippon: 0, penalty: 0, senshu: false, kiken: false, kata: '', judges: [null, null, null, null, null], remainingMs: 300000, total: 0, kataTotal: 0 });
const snapshot = revision => ({ revision, serverTime: new Date().toISOString(), state: { modality: 'KUMITE', aka: fighter(), ao: fighter(), remainingMs: 120000, startedAt: null, activeSide: null, displaySide: null, bunkai: false, showLogo: true, medicalMs: 180000, medicalStartedAt: null, winner: null, decision: null, akaFlags: 0, aoFlags: 0, status: 'READY' } });
const component = http => { const c = new Component({}, http, {}); c.eventId = 1; c.categoryId = 2; c.selected = '4'; c.snapshot = snapshot(0); return c; };
(async () => {
  const requests = []; let fail = true;
  const c = component({ post: async (_url, body) => { requests.push(body); if (fail) throw { status: 0, message: 'Sin conexión' }; const s = snapshot(1); s.state.aka.total = 3; return { data: s }; } });
  await c.act('ADD_IPPON', 'AKA');
  assert.equal(c.retry, true); assert.equal(c.state.aka.total, 0, 'No se calcula el puntaje oficial en el cliente');
  fail = false; await c.send();
  assert.equal(requests[0].operationId, requests[1].operationId, 'El reintento usa la misma operación');
  assert.equal(c.state.aka.total, 3); assert.equal(c.retry, false);
  c.display = true; await c.act('ADD_IPPON', 'AKA'); assert.equal(requests.length, 2, 'El display no escribe');

  let resolve;
  const old = component({ get: () => new Promise(r => { resolve = r; }) });
  const pending = old.load(false); old.snapshot = snapshot(3); resolve({ data: snapshot(1) }); await pending;
  assert.equal(old.snapshot.revision, 3, 'El polling antiguo no pisa una revisión posterior');

  const switching = component({ get: () => new Promise(r => { resolve = r; }) });
  const loading = switching.load(false); switching.selected = '5'; switching.snapshot = undefined;
  resolve({ data: snapshot(1) }); await loading;
  assert.equal(switching.snapshot, undefined, 'Se descarta la respuesta del combate anterior');

  const clock = component({}); clock.state.modality = 'KATA'; clock.state.activeSide = 'AKA';
  clock.state.startedAt = '2026-11-05T12:00:00Z'; clock.now = Date.parse('2026-11-05T12:00:10Z');
  assert.equal(clock.clockMs('AKA'), 290000); assert.equal(clock.clockMs('AO'), 300000);
  console.log('WKF frontend: 6 comprobaciones aprobadas (reintentos, autoridad API, display, polling, cambio de combate y cronómetros).');
})().catch(error => { console.error(error); process.exitCode = 1; });
