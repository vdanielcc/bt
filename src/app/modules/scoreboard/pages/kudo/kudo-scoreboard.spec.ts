import { of, Subject, throwError } from 'rxjs';
import { KudoScoreboardComponent } from './kudo-scoreboard.component';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { ScoreboardFixtureResultsService } from '../../services/scoreboard-fixture-results.service';

function snapshot(): any {
  const fighter = () => ({ koka: 0, doubleKoka: 0, yuko: 0, wazaAri: 0, ippon: 0, hansoku: 0, shikkaku: false, groundCount: 0, groundStartedAt: null });
  return { fixtureMatchId: 100, revision: 7, serverTime: new Date().toISOString(), remainingMs: 180000,
    state: { aka: fighter(), shiro: fighter(), round: 1, elapsedMs: 0, startedAt: null, status: 'READY', winner: null, decision: null } };
}
describe('Control Kudo Chile', () => {
  let component: KudoScoreboardComponent;
  let http: any;
  let dialogs: any;
  beforeEach(() => {
    http = { post: jasmine.createSpy('post') }; dialogs = { open: jasmine.createSpy('open') };
    component = new KudoScoreboardComponent({} as any, http, {} as any, dialogs);
    component.snapshot = snapshot(); component.selected = 100; component.base = '/kudo';
    component.matches = [{ id: 100, choices: [{ name: 'Ana' }, { name: 'Beatriz' }] }];
    (component as any).audio = { resume: () => Promise.resolve(), close: () => Promise.resolve() };
  });
  afterEach(() => component.ngOnDestroy());
  it('pregunta por el desempate, cumple el descanso y limita el encuentro a tres rounds', async () => {
    component.demo = true; spyOn(localStorage,'setItem');
    component.snapshot!.state.elapsedMs = 180000;
    dialogs.open.and.returnValue({afterClosed: () => of(true)});
    await component.promptNextRound();
    expect(component.snapshot!.state.round).toBe(2); expect(component.restRemaining()).toBe(60000);
    await component.act('START'); expect(component.snapshot!.state.startedAt).toBeNull();
    await component.promptNextRound(); expect(dialogs.open).toHaveBeenCalledTimes(1);
    component.now += 60000;
    await component.act('START'); expect(component.remaining()).toBe(180000);
    component.now += 180000;
    await component.promptNextRound(true);
    expect(component.snapshot!.state.round).toBe(3); expect(component.restRemaining()).toBe(60000);
    component.now += 60000; await component.act('START'); component.now += 180000;
    await component.promptNextRound(true); expect(dialogs.open).toHaveBeenCalledTimes(2);
    await component.act('NEXT_ROUND'); expect(component.snapshot!.state.round).toBe(3);
  });
  it('permite Hantei en lugar de otro round y no pregunta en pantalla externa', async () => {
    component.demo = true; spyOn(localStorage,'setItem'); component.snapshot!.state.elapsedMs = 180000;
    component.display = true; await component.promptNextRound(); expect(dialogs.open).not.toHaveBeenCalled();
    component.display = false;
    dialogs.open.and.returnValues({afterClosed: () => of(false)},{afterClosed: () => of('SHIRO')});
    await component.promptNextRound(); expect(component.snapshot!.state.winner).toBe('SHIRO');
    expect(component.snapshot!.state.round).toBe(1);
  });
  it('desarrolla semifinales y final demo, avanza y muestra el podio sin llamadas a producción', async () => {
    component.demo = true; spyOn(localStorage, 'setItem');
    (component as any).route = { snapshot: { queryParamMap: { get: () => null } } };
    component.startDemo();
    expect(component.canAdvance).toBeFalse();
    await component.act('ADD_AWARD','AKA','IPPON'); await component.publish();
    expect(component.canAdvance).toBeTrue();
    await component.nextEncounter(); expect(component.selected).toBe(2);
    await component.act('ADD_AWARD','SHIRO','IPPON'); await component.publish();
    await component.nextEncounter(); expect(component.selected).toBe(3);
    expect(component.matches[2].choices.map((c: any) => c.id)).toEqual([1,4]);
    expect(component.progress?.complete).toBeFalse();
    await component.act('ADD_AWARD','AKA','IPPON'); await component.publish();
    expect(component.progress?.complete).toBeTrue(); expect(component.canAdvance).toBeFalse();
    expect(component.progress?.awards.map(a => [a.competitorId,a.medal])).toEqual([[1,'gold'],[4,'silver'],[2,'bronze'],[3,'bronze']]);
    expect(http.post).not.toHaveBeenCalled();
  });
  it('muestra AO y SHIRO tanto en la mesa como en el display con el estado existente', () => {
    for (const display of [false, true]) {
      component.display = display;
      expect(component.sideLabel('AKA')).toBe('AO');
      expect(component.sideLabel('SHIRO')).toBe('SHIRO');
      expect(component.competitor('AKA')).toBe('Ana');
      component.demo = true;
      expect(component.competitor('AKA')).toBe('Ana');
      component.demo = false;
    }
  });
  it('Hantei de AO conserva el identificador del lado en la API', async () => {
    dialogs.open.and.returnValue({ afterClosed: () => of('AKA') });
    const accepted = snapshot(); accepted.state.winner = 'AKA';
    http.post.and.returnValue(of({ data: accepted }));
    await component.hantei();
    expect(http.post.calls.mostRecent().args[1]).toEqual(jasmine.objectContaining({ action: 'HANTEI', side: 'AKA' }));
    expect(component.sideLabel(component.snapshot!.state.winner!)).toBe('AO');
  });
  it('ajusta segundos en pausa y respeta los limites del reloj', async () => {
    component.demo = true; spyOn(localStorage, 'setItem');
    await component.adjustTime(1); expect(component.remaining()).toBe(181000);
    await component.adjustTime(-1); expect(component.remaining()).toBe(180000);
    component.snapshot!.state.elapsedMs = 180000;
    await component.adjustTime(-1); expect(component.remaining()).toBe(0);
    await component.adjustTime(1); expect(component.remaining()).toBe(1000);
    component.snapshot!.state.elapsedMs = 180000 - 5999000;
    await component.adjustTime(1); expect(component.remaining()).toBe(5999000);
    component.snapshot!.state.startedAt = new Date().toISOString();
    const revision = component.snapshot!.revision;
    await component.adjustTime(-1); expect(component.snapshot!.revision).toBe(revision);
  });
  it('envia el tiempo restante al servidor y rechaza formatos invalidos o reloj en marcha', async () => {
    component.editedTime = '02:60'; await component.setTime();
    expect(http.post).not.toHaveBeenCalled(); expect(component.error).toContain('mm:ss');
    component.editedTime = '02:15'; component.snapshot!.state.startedAt = new Date().toISOString();
    await component.setTime(); expect(http.post).not.toHaveBeenCalled();
    component.snapshot!.state.startedAt = null;
    const accepted = snapshot(); accepted.state.elapsedMs = 45000;
    http.post.and.returnValue(of({ data: accepted })); await component.setTime();
    expect(http.post.calls.mostRecent().args[1]).toEqual(jasmine.objectContaining({ action: 'SET_TIME', seconds: 135, expectedRevision: 7 }));
    expect(component.remaining()).toBe(135000);
  });
  it('sincroniza la correccion demo con la pantalla externa y mantiene puntajes', async () => {
    component.demo = true; component.snapshot!.state.aka.koka = 2;
    const storage = spyOn(localStorage, 'setItem');
    component.editedTime = '05:00'; await component.setTime();
    expect(component.remaining()).toBe(300000); expect(component.fighter('AKA').koka).toBe(2);
    const saved = JSON.parse(storage.calls.mostRecent().args[1]);
    expect(saved.state.elapsedMs).toBe(-120000); expect(saved.state.startedAt).toBeNull();
  });
  it('espera aceptación del servidor y usa su revisión para evitar puntajes duplicados', async () => {
    const response = new Subject<any>(); http.post.and.returnValue(response);
    const request = component.act('ADD_HANSOKU', 'SHIRO');
    expect(component.fighter('SHIRO').hansoku).toBe(0);
    expect(http.post.calls.mostRecent().args[1].expectedRevision).toBe(7);
    await component.act('ADD_HANSOKU', 'SHIRO'); expect(http.post).toHaveBeenCalledTimes(1);
    const accepted = snapshot(); accepted.revision = 8; accepted.state.shiro.hansoku = 1;
    response.next({ data: accepted }); response.complete(); await request;
    expect(component.fighter('SHIRO').hansoku).toBe(1); expect(component.snapshot!.revision).toBe(8);
  });
  it('mantiene el estado confirmado si el servidor rechaza un tercer Ne-waza', async () => {
    component.snapshot!.state.groundCount = 2;
    http.post.and.returnValue(throwError(() => ({ error: { message: 'Límite de Ne-waza alcanzado para este encuentro (máximo 2)' } })));
    await component.act('GROUND_START');
    expect(component.error).toContain('máximo 2'); expect(component.snapshot!.revision).toBe(7);
    expect(component.groundCount()).toBe(2); expect(component.groundStartedAt()).toBeNull();
  });
  it('comparte dos Ne-waza entre ambos lados en demo y conserva el contador en segundo round', async () => {
    component.demo = true; spyOn(localStorage, 'setItem');
    await component.act('START'); await component.act('GROUND_START');
    expect(component.groundCount()).toBe(1); expect(component.groundStartedAt()).toBeTruthy();
    await component.act('GROUND_START', 'SHIRO'); expect(component.groundCount()).toBe(1);
    await component.act('GROUND_END'); await component.act('GROUND_START', 'SHIRO');
    expect(component.groundCount()).toBe(2);
    await component.act('GROUND_END'); await component.act('SECOND_ROUND'); await component.act('START');
    await component.act('GROUND_START');
    expect(component.groundCount()).toBe(2); expect(component.error).toContain('máximo 2');
    expect(component.groundStartedAt()).toBeNull();
  });
  it('Hantei requiere selección en modal y registra el competidor votado aunque tenga menos puntos', async () => {
    component.snapshot!.state.aka.wazaAri = 2;
    dialogs.open.and.returnValue({ afterClosed: () => of('SHIRO') });
    const accepted = snapshot(); accepted.state.winner = 'SHIRO'; accepted.state.decision = 'HANTEI';
    http.post.and.returnValue(of({ data: accepted }));
    await component.hantei();
    expect(dialogs.open).toHaveBeenCalled(); expect(http.post.calls.mostRecent().args[1]).toEqual(jasmine.objectContaining({ action: 'HANTEI', side: 'SHIRO' }));
    expect(component.snapshot!.state.winner).toBe('SHIRO');
  });
  it('cancelar Hantei y abrir una pantalla de visualización no envían acciones', async () => {
    dialogs.open.and.returnValue({ afterClosed: () => of(undefined) }); await component.hantei();
    component.display = true; await component.act('ADD_AWARD', 'AKA', 'IPPON');
    expect(http.post).not.toHaveBeenCalled(); expect(component.snapshot!.state.winner).toBeNull();
  });
});

describe('Ne-waza global en la mesa y pantalla', () => {
  it('muestra un único control junto al cronómetro y ninguno en las tarjetas de competidores', async () => {
    const route = { snapshot: { paramMap: { get: () => '1' }, queryParamMap: { get: (key: string) => key === 'demo' ? '1' : null } } };
    await TestBed.configureTestingModule({ imports: [KudoScoreboardComponent], providers: [
      { provide: ActivatedRoute, useValue: route }, { provide: HttpClient, useValue: {} },
      { provide: MatDialog, useValue: {} }, { provide: ScoreboardFixtureResultsService, useValue: {} }
    ] }).compileComponents();
    const fixture = TestBed.createComponent(KudoScoreboardComponent);
    try {
      fixture.detectChanges();
      const root: HTMLElement = fixture.nativeElement;
      expect(root.querySelectorAll('.timing-area .ground-control').length).toBe(1);
      expect(root.querySelectorAll('.fighters .ground, .fighters .ground-control').length).toBe(0);
      expect(Array.from(root.querySelectorAll('button')).filter(b => b.textContent?.includes('Iniciar Ne-waza')).length).toBe(1);
      fixture.componentInstance.display = true; fixture.detectChanges();
      expect(root.querySelectorAll('.ground-control').length).toBe(1);
      expect(root.querySelectorAll('.ground-control button').length).toBe(0);
    } finally { fixture.destroy(); TestBed.resetTestingModule(); }
  });
});
