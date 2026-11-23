import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { OverlayContainer } from '@angular/cdk/overlay';
import { ScoreOnlyFixtureComponent } from './score-only-fixture.component';

@Component({
  standalone: true,
  imports: [ScoreOnlyFixtureComponent, MatButtonModule, MatMenuModule],
  styleUrls: ['./event-summary.component.scss'],
  template: `
    <mat-menu #menu="matMenu">
      <ng-template matMenuContent let-slot="slot">
        <button mat-menu-item (click)="select('move', slot.competitorId)">Mover</button>
        <button mat-menu-item (click)="select('remove', slot.competitorId)">Eliminar</button>
        <button mat-menu-item (click)="select('profile', slot.competitorId)">Ver ficha</button>
      </ng-template>
    </mat-menu>
    <ng-template #actions let-slot>
      <button mat-icon-button class="competitor-menu-button" [matMenuTriggerFor]="menu"
        [matMenuTriggerData]="{slot: slot}" [attr.aria-label]="'Opciones de ' + slot.name">⋮</button>
    </ng-template>
    <bte-score-only-fixture [rounds]="rounds" [actionsTemplate]="actions"></bte-score-only-fixture>
  `
})
class ScoreOnlyActionsHost {
  selected: { action: string; id: number } | null = null;
  rounds = [{ matches: [
    { position: 1, top: { competitorId: 10, name: 'Ana', academy: 'Dojo' } },
    { position: 2, top: { competitorId: 20, name: 'Luis', academy: 'Dojo' } }
  ] }];
  select(action: string, id: number): void { this.selected = { action, id }; }
}

describe('Solo Puntaje participant menu', () => {
  it('anchors the menu button inside each participant cell and opens all three actions for that athlete', async () => {
    await TestBed.configureTestingModule({ imports: [ScoreOnlyActionsHost, NoopAnimationsModule] }).compileComponents();
    const fixture = TestBed.createComponent(ScoreOnlyActionsHost);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('tbody .competitor-menu-button') as NodeListOf<HTMLButtonElement>;
    expect(buttons.length).toBe(2);
    for (const button of Array.from(buttons)) {
      expect(getComputedStyle(button).position).toBe('absolute');
      expect(getComputedStyle(button.closest('td')!).position).toBe('relative');
    }
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    for (const [row, id] of [[0, 10], [1, 20]]) {
      for (const [index, action] of ['move', 'remove', 'profile'].entries()) {
        buttons[row].click(); fixture.detectChanges(); await fixture.whenStable();
        const actions = overlay.querySelectorAll<HTMLButtonElement>('[mat-menu-item]');
        expect(Array.from(actions).map(button => button.textContent?.trim())).toEqual(['Mover', 'Eliminar', 'Ver ficha']);
        actions[index].click(); fixture.detectChanges(); await fixture.whenStable();
        expect(fixture.componentInstance.selected).toEqual({ action, id });
      }
    }
    fixture.destroy();
  });
});
