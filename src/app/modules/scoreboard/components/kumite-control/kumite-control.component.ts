import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  RuleControl,
  ScoreOption,
  ScoreboardMatchState,
  ScoreboardRuleSet,
  ScoreboardSide
} from '../../models/scoreboard.models';
import {
  CompetitorCardComponent,
  RuleControlsComponent,
  ScoreControlsComponent,
  TimerComponent
} from '../scoreboard-components';

@Component({
  selector: 'bte-kumite-control',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    CompetitorCardComponent,
    ScoreControlsComponent,
    RuleControlsComponent,
    TimerComponent
  ],
  template: ` <section *ngIf="match && ruleSet" class="control">
    <header>
      <div>
        <b>Tatami {{ match.areaId }}</b
        ><span
          >{{ match.categoryName }} · Combate
          {{ match.matchNumber || match.matchId }}</span
        >
      </div>
      <div>{{ match.associationCode }} · {{ match.status }}</div>
    </header>
    <bte-scoreboard-timer
      [milliseconds]="timerMs"
      (start)="timerAction.emit('START')"
      (pause)="timerAction.emit('PAUSE')"
      (adjust)="timerAdjust.emit($event)" />
    <p *ngIf="scores.length === 0" class="rule-warning">
      TODO_REGLAMENTO: falta configurar los controles
      {{ match.associationCode }} Kumite. La llave y los competidores ya están
      cargados.
    </p>
    <div class="corners">
      <div>
        <bte-competitor-card
          side="AKA"
          [competitor]="match.aka"
          [score]="match.scores?.AKA || 0" /><bte-score-controls
          [options]="scores"
          [disabled]="locked"
          (score)="scored.emit({ side: 'AKA', option: $event })" />
        <h3>Faltas y penalizaciones</h3>
        <bte-rule-controls
          [controls]="penalties"
          [disabled]="locked"
          (selected)="penalized.emit({ side: 'AKA', control: $event })" />
        <h3>Controles especiales</h3>
        <bte-rule-controls
          [controls]="special"
          [disabled]="locked"
          (selected)="specialized.emit({ side: 'AKA', control: $event })" />
      </div>
      <div>
        <bte-competitor-card
          side="SHIRO"
          [competitor]="match.shiro"
          [score]="match.scores?.SHIRO || 0" /><bte-score-controls
          [options]="scores"
          [disabled]="locked"
          (score)="scored.emit({ side: 'SHIRO', option: $event })" />
        <h3>Faltas y penalizaciones</h3>
        <bte-rule-controls
          [controls]="penalties"
          [disabled]="locked"
          (selected)="penalized.emit({ side: 'SHIRO', control: $event })" />
        <h3>Controles especiales</h3>
        <bte-rule-controls
          [controls]="special"
          [disabled]="locked"
          (selected)="specialized.emit({ side: 'SHIRO', control: $event })" />
      </div>
    </div>
  </section>`,
  styles: [
    `
      .control {
        display: grid;
        gap: 1.25rem;
      }
      .control header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
      }
      .control header div:first-child {
        display: flex;
        flex-direction: column;
      }
      .corners {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.25rem;
      }
      .corners > div {
        display: grid;
        gap: 0.8rem;
      }
      h3 {
        font-size: 0.85rem;
        margin: 0.5rem 0 0;
        color: var(--vex-text-color-secondary);
      }
      .rule-warning {
        padding: 0.8rem 1rem;
        border-radius: 0.5rem;
        background: #fff7ed;
        color: #9a3412;
      }
      @media (max-width: 800px) {
        .corners {
          grid-template-columns: 1fr;
        }
        .control header {
          flex-direction: column;
        }
      }
      @media (max-height: 800px) and (min-width: 801px) {
        .control {
          gap: 0.6rem;
        }
        .control header {
          line-height: 1.15;
        }
        .corners {
          gap: 0.75rem;
        }
        .corners > div {
          gap: 0.35rem;
        }
        h3 {
          margin: 0.1rem 0 0;
          font-size: 0.72rem;
        }
        .rule-warning {
          margin: 0;
          padding: 0.5rem 0.75rem;
          font-size: 0.78rem;
        }
      }
    `
  ]
})
export class KumiteControlComponent {
  @Input({ required: true }) match!: ScoreboardMatchState;
  @Input({ required: true }) ruleSet!: ScoreboardRuleSet;
  @Input() timerMs = 0;
  @Output() scored = new EventEmitter<{
    side: ScoreboardSide;
    option: ScoreOption;
  }>();
  @Output() penalized = new EventEmitter<{
    side: ScoreboardSide;
    control: RuleControl;
  }>();
  @Output() specialized = new EventEmitter<{
    side: ScoreboardSide;
    control: RuleControl;
  }>();
  @Output() timerAction = new EventEmitter<string>();
  @Output() timerAdjust = new EventEmitter<number>();
  get scores() {
    return this.ruleSet.configuration.scoring?.availableScores ?? [];
  }
  get penalties() {
    return this.ruleSet.configuration.penalties ?? [];
  }
  get special() {
    return this.ruleSet.configuration.specialControls ?? [];
  }
  get locked() {
    return ['FINISHED', 'CONFIRMED'].includes(this.match.status);
  }
}
