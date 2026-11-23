const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('src/app/modules/scoreboard/pages/demo/scoreboard-demo.component.ts', 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true }
}).outputText;
const storage = new Map();
const listeners = new Map();
const context = {
  exports: {},
  require: () => ({ Component: () => target => target }),
  localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
  window: { addEventListener: (key, value) => listeners.set(key, value), removeEventListener: key => listeners.delete(key) },
  setInterval: () => 1, clearInterval: () => {}, Date, URL, location: { href: 'https://example.test/app/scoreboard/events/58/areas/2/demo' }
};
vm.runInNewContext(javascript, context);
const Demo = context.exports.ScoreboardDemoComponent;
const route = display => ({ snapshot: {
  paramMap: new Map([['eventId', '58'], ['areaId', '2']]),
  queryParamMap: new Map([['association', 'WKF'], ['display', display ? '1' : '0']])
}});
const control = new Demo(route(false));
control.ngOnInit();
assert.equal(control.match.associationCode, 'WKF');
assert.equal(control.match.areaId, 2);
assert.equal(control.match.categoryId, 0);
control.score('AKA', 1);
control.score('SHIRO', -1);
assert.equal(control.match.scores.AKA, 1);
assert.equal(control.match.scores.SHIRO, 0);
control.toggle();
assert.equal(control.match.timer.running, true);
control.toggle();
assert.equal(control.match.timer.running, false);
const screen = new Demo(route(true));
screen.ngOnInit();
assert.equal(screen.match.scores.AKA, 1);
screen.score('AKA', 1);
assert.equal(screen.match.scores.AKA, 1, 'Display must remain read-only');
control.reset('KATA');
control.setKata(8.5);
screen.receive({ key: control.key, newValue: storage.get(control.key) });
assert.equal(screen.match.modality, 'KATA');
assert.equal(screen.match.kataScores[0], 8.5);
control.reset('KUMITE');
assert.equal(control.match.scores.AKA, 0);
assert.equal(control.remaining, 180000);
control.ngOnDestroy();
screen.ngOnDestroy();
assert.equal(listeners.size, 0);
console.log('Scoreboard demo: scoring, timer, reset, read-only display and tab synchronization OK.');

const dashboardSource = fs.readFileSync('src/app/modules/scoreboard/pages/dashboard/scoreboard-dashboard.component.ts', 'utf8');
const dashboardJs = ts.transpileModule(dashboardSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true }
}).outputText;
const dashboardContext = { exports: {}, require: () => ({ Component: () => target => target, ChangeDetectionStrategy: { OnPush: 0 } }) };
vm.runInNewContext(dashboardJs, dashboardContext);
const navigations = [];
const dashboard = new dashboardContext.exports.ScoreboardDashboardComponent({ navigate: (...args) => navigations.push(args) });
dashboard.openDemo();
assert.equal(navigations.length, 0, 'An event is required');
dashboard.events = [{ id: 58, associationCode: 'KUDO' }];
dashboard.selectedEventId = 58;
dashboard.openDemo();
assert.equal(navigations[0][1].queryParams.areaId, 1, 'Demo works without a selected tatami');
assert.equal(navigations[0][0].at(-1), 'kudo');
dashboard.events[0].associationCode = 'WKF';
dashboard.openDemo();
assert.equal(navigations[1][0].at(-1), 'demo');
assert.equal(navigations[1][1].queryParams.areaId, 1);
dashboard.selectedAreaId = 2;
dashboard.openDemo();
assert.equal(navigations[2][1].queryParams.areaId, 2, 'Selected tatami is preserved');
assert(dashboardSource.includes('[disabled]="!selectedEventId">Abrir mesa demo'));
console.log('Demo entry: no tatami required, Kudo and generic routing, selected tatami preserved OK.');
