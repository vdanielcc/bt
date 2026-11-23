import { jsPDF } from 'jspdf';
import { KataJkaFixtureComponent } from './kata-jka-fixture.component';
import { kataJkaPages, renderKataJkaPdf } from './kata-jka-pdf';
import { EventSummaryComponent } from './event-summary.component';
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({ standalone: true, imports: [CommonModule, KataJkaFixtureComponent], template: `
  <ng-template #actions let-slot><ng-container *ngIf="slot?.competitorId">
    <button class="move-action" (click)="selected = slot.competitorId">Mover</button>
    <button class="remove-action" (click)="selected = slot.competitorId">Eliminar</button>
  </ng-container></ng-template>
  <bte-kata-jka-fixture [rounds]="rounds" [actionsTemplate]="actions"></bte-kata-jka-fixture>
` })
class KataActionsHost {
  selected = 0;
  rounds = [
    { number: 1, matches: [{ id: 1, top: { competitorId: 1, name: 'Ana' }, bottom: { competitorId: 2, name: 'Luis' } }] },
    { number: 2, matches: [{ id: 2, top: { competitorId: 3, name: 'Eva' }, bottom: {} }] }
  ];
}

describe('Kata JKA presentation', () => {
  it('provides both actions for AKA, SHIRO and individual scoring athletes', async () => {
    await TestBed.configureTestingModule({ imports: [KataActionsHost] }).compileComponents();
    const fixture = TestBed.createComponent(KataActionsHost); fixture.detectChanges();
    const moves = fixture.nativeElement.querySelectorAll('.move-action');
    const removes = fixture.nativeElement.querySelectorAll('.remove-action');
    expect(moves.length).toBe(3); expect(removes.length).toBe(3);
    moves[1].click(); expect(fixture.componentInstance.selected).toBe(2);
    removes[2].click(); expect(fixture.componentInstance.selected).toBe(3);
    expect(fixture.nativeElement.querySelectorAll('.judges span').length).toBe(5);
  });
  function bracket(count: number): any[] {
    const rounds: any[] = []; let nextId = 1;
    let sources = Array.from({ length: count }, (_, i) => ({ competitorId: i + 1, name: `Deportista ${i + 1}` }));
    let previous: any[] = [];
    while (sources.length > 5) {
      const matches = Array.from({ length: Math.ceil(sources.length / 2) }, (_, i) => ({ id: nextId++, matchNumber: i + 1, position: i + 1, top: sources[i * 2], bottom: sources[i * 2 + 1] ?? {} }));
      previous.forEach((m, i) => { m.nextMatchId = matches[Math.floor(i / 2)].id; m.nextMatchPosition = i % 2 ? 'bottom' : 'top'; });
      rounds.push({ number: rounds.length + 1, matches }); previous = matches;
      sources = matches.map(() => ({} as any));
    }
    const matches = sources.map((top, i) => ({ id: nextId++, matchNumber: i + 1, position: i + 1, top, bottom: {} }));
    previous.forEach((m, i) => { m.nextMatchId = matches[i].id; m.nextMatchPosition = 'top'; });
    rounds.push({ number: rounds.length + 1, matches }); return rounds;
  }
  for (const [count, expected] of [[5, 1], [11, 1], [16, 1], [17, 1], [20, 1], [21, 2], [32, 2], [64, 5]]) {
    it(`keeps all official encounters for ${count} participants in ${expected} pool pages`, () => {
      const official = bracket(count); const pages = kataJkaPages(official);
      expect(pages.length).toBe(expected);
      const ids = pages.flatMap(page => page.flatMap(section => section.matches.map(match => match.id)));
      expect(ids.length).toBe(new Set(ids).size);
      const poolById = new Map<number, number>();
      pages.forEach((page, pool) => page.forEach(section => section.matches.forEach(match => poolById.set(match.id, pool))));
      for (const round of official) for (const match of round.matches)
        if (match.nextMatchId && round.number % 4 !== 0) expect(poolById.get(match.id)).toBe(poolById.get(match.nextMatchId));
      expect(ids.sort((a, b) => a - b)).toEqual(official.flatMap(r => r.matches.map((m: any) => m.id)).sort((a, b) => a - b));
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [330, 216] });
      const rect = spyOn(doc, 'rect').and.callThrough();
      renderKataJkaPdf(doc, official, pool => { if (pool > 1) doc.addPage([330, 216], 'landscape'); });
      expect(doc.getNumberOfPages()).toBe(expected);
      expect(doc.internal.pageSize.getWidth()).toBeCloseTo(330, 1);
      expect(doc.internal.pageSize.getHeight()).toBeCloseTo(216, 1);
      for (const [x, y, w, h] of rect.calls.allArgs()) {
        expect(x).toBeGreaterThanOrEqual(10); expect(x + w).toBeLessThanOrEqual(320);
        expect(y).toBeGreaterThan(42); expect(y + h).toBeLessThan(202);
      }
    });
  }
  const rounds = [
    { number: 1, matches: [1, 2, 3].map(id => ({ id, matchNumber: id, position: id, nextMatchId: id + 10, nextMatchPosition: 'top',
      top: { competitorId: id * 2 - 1, name: `Alumno ${id * 2 - 1}`, academyName: 'Dojo' },
      bottom: { competitorId: id * 2, name: `Alumno ${id * 2}`, academyName: 'Dojo' } })) },
    { number: 2, matches: [11, 12, 13].map((id, i) => ({ id, matchNumber: i + 1, position: i + 1, top: {}, bottom: {}, isBye: false })) }
  ];
  it('uses the saved links for qualifier placeholders and five judge boxes', () => {
    const component = new KataJkaFixtureComponent(); component.rounds = rounds;
    expect(component.judges).toEqual(['J1', 'J2', 'J3', 'J4', 'J5']);
    expect(component.name({ name: 'Ganador encuentro 2 · Ronda 1' })).toBe('');
    expect(component.connector(0, rounds[0].matches[0], 0)).toContain('H 100');
    for (const name of ['BYE', 'bay', 'Libre']) expect(component.name({ name })).toBe('');
  });
  it('renders an individual score card with J1 to J5 for every direct finalist', async () => {
    await TestBed.configureTestingModule({ imports: [KataJkaFixtureComponent] }).compileComponents();
    const fixture = TestBed.createComponent(KataJkaFixtureComponent);
    fixture.componentInstance.rounds = [{ number: 1, matches: rounds[0].matches }];
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.score-card').length).toBe(3);
    expect(fixture.nativeElement.querySelectorAll('.judges span').length).toBe(15);
    expect(fixture.nativeElement.querySelectorAll('.corner').length).toBe(0);
    fixture.nativeElement.style.width = '1000px';
    const scroll = fixture.nativeElement.querySelector('.kata-scroll') as HTMLElement;
    const card = fixture.nativeElement.querySelector('.score-card') as HTMLElement;
    expect(card.getBoundingClientRect().width).toBeLessThanOrEqual(scroll.getBoundingClientRect().width / 2);
    expect(fixture.componentInstance.canDrag(rounds[0].matches[0].top)).toBeFalse();
    fixture.componentInstance.editable = true;
    expect(fixture.componentInstance.canDrag(rounds[0].matches[0].top)).toBeTrue();
  });
  it('saves scoring slots without converting them into byes or changing their links', () => {
    const component = new EventSummaryComponent({} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    component.fixture = { fixtureType: 'KATAJKA' };
    component.fixtureRounds = (component as any).buildFixtureRounds({ rounds });
    const saved = (component as any).fixtureMatchesForSave();
    expect(saved[0].nextMatchNumber).toBe(1);
    expect(saved[0].nextMatchPosition).toBe('top');
    expect(saved.filter((m: any) => m.round === 2).every((m: any) => !m.isBye && m.nextMatchNumber === null)).toBeTrue();
    expect(component.eventColorSystem).toBe('aka-ao-white');
  });
  for (const mixed of [false, true]) {
    it(`prints ${mixed ? 'mixed elimination and scores' : 'scores directly'} with five blank judge cells per athlete`, () => {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [330, 216] });
      const rect = spyOn(doc, 'rect').and.callThrough();
      const fill = spyOn(doc, 'setFillColor').and.callThrough();
      const sheets = mixed ? rounds : [{ number: 1, matches: rounds[0].matches.map(m => ({ ...m, nextMatchId: null, bottom: {} })) }];
      renderKataJkaPdf(doc, sheets, () => {});
      const pdf = doc.output();
      expect(pdf).not.toContain('Ganador');
      expect(pdf).not.toContain('(Libre)');
      for (const judge of ['J1', 'J2', 'J3', 'J4', 'J5']) expect(pdf).toContain(`(${judge})`);
      expect(pdf).not.toContain('(AO)');
      if (mixed) {
        expect(pdf).toContain('(SHIRO)');
        expect(fill.calls.allArgs().some(args => String(args[0]) === '#dc2626')).toBeTrue();
      }
      for (const [x, y, w, h] of rect.calls.allArgs()) {
        expect(x).toBeGreaterThanOrEqual(10); expect(x + w).toBeLessThanOrEqual(320);
        expect(y).toBeGreaterThan(42); expect(y + h).toBeLessThan(202);
        if (!mixed) expect(x + w).toBeLessThanOrEqual(165);
      }
      expect(rect.calls.count()).toBe(mixed ? 45 : 33);
    });
  }
  it('uses direct elimination drag behavior, dojo warnings and undo for Kata JKA', () => {
    const messages = jasmine.createSpyObj('snackBar', ['open']);
    const component = new EventSummaryComponent({} as any, {} as any, {} as any, { markForCheck() {} } as any, messages, {} as any, {} as any, {} as any);
    component.fixture = { fixtureType: 'KATAJKA' };
    component.selectedCategory = { fixtureType: 'KATAJKA' };
    component.fixtureRounds = (component as any).buildFixtureRounds({ rounds });
    const drop = (source: any, target: any) => component.dropFixtureSlot({ previousContainer: { data: source }, container: { data: target } } as any);
    drop(component.slotLocation(0, 0, 'top'), component.slotLocation(0, 1, 'bottom'));
    expect(component.fixtureRounds[0].matches[1].bottom.competitorId).toBe(1);
    expect(messages.open).toHaveBeenCalled();
    component.undoFixtureChange();
    expect(component.fixtureRounds[0].matches[0].top.competitorId).toBe(1);
    drop(component.slotLocation(0, 0, 'top'), component.slotLocation(1, 0, 'top'));
    expect(component.fixtureRounds[1].matches[0].top.competitorId).toBe(1);
    expect(component.fixtureRounds[1].matches[0].isBye).toBeFalse();
    expect(component.fixtureRounds[0].matches[0].winnerCompetitorId).toBe(1);
    component.selectedCategory.fixtureType = 'ELIMINACION';
    drop(component.slotLocation(0, 1, 'top'), component.slotLocation(1, 1, 'top'));
    expect(component.fixtureRounds[1].matches[1].top.competitorId).toBeNull();
  });
});
