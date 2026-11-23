import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, TemplateRef } from '@angular/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';

@Component({
  selector: 'bte-kata-jka-fixture', standalone: true, imports: [CommonModule, DragDropModule],
  templateUrl: './kata-jka-fixture.component.html', styleUrls: ['./kata-jka-fixture.component.scss']
})
export class KataJkaFixtureComponent {
  @Input() rounds: any[] = [];
  @Input() editable = false;
  @Input() actionsTemplate: TemplateRef<any> | null = null;
  @Output() slotDropped = new EventEmitter<CdkDragDrop<any>>();
  readonly judges = ['J1', 'J2', 'J3', 'J4', 'J5'];
  matches(round: any): any[] { return round.matches ?? round.Matches ?? []; }
  side(match: any, top: boolean): any { return top ? match.top ?? match.Top : match.bottom ?? match.Bottom; }
  name(side: any): string {
    const value = String(side?.name ?? side?.Name ?? '').trim();
    return /^(bye|bay|libre|ganador encuentro\b.*)$/i.test(value) ? '' : value;
  }
  canDrag(side: any): boolean { return this.editable && Boolean(side?.competitorId ?? side?.CompetitorId); }
  location(roundIndex: number, matchIndex: number, position: 'top' | 'bottom'): any { return { roundIndex, matchIndex, position }; }
  academy(side: any): string { return side?.academy ?? side?.academyName ?? side?.AcademyName ?? ''; }
  number(match: any): number { return Number(match.matchNumber ?? match.MatchNumber); }
  id(match: any): number { return Number(match.id ?? match.Id); }
  nextId(match: any): number { return Number(match.nextMatchId ?? match.NextMatchId); }
  get height(): number { return Math.max(320, ...this.rounds.map(round => this.matches(round).length * 124)); }
  bye(match: any): boolean { return Boolean(match.isBye ?? match.IsBye); }
  connector(roundIndex: number, match: any, index: number): string {
    const next = this.rounds[roundIndex + 1];
    if (!next) return '';
    const target = this.matches(next).findIndex(candidate => this.id(candidate) === this.nextId(match));
    if (target < 0) return '';
    const from = (index + .5) * 100 / this.matches(this.rounds[roundIndex]).length;
    const to = (target + .5) * 100 / this.matches(next).length;
    return `M 0 ${from} H 50 V ${to} H 100`;
  }
}
