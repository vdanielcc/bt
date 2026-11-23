import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  ScoreboardMatchState,
  ScoreboardRuleSet
} from '../../models/scoreboard.models';
import { ScoreboardRuleService } from '../../services/scoreboard-rule.service';
import {
  CompetitorCardComponent,
  RuleControlsComponent
} from '../scoreboard-components';

@Component({
  selector: 'bte-kata-control',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    CompetitorCardComponent,
    RuleControlsComponent
  ],
  template: `<section *ngIf="match && ruleSet" class="kata">
    <header>
      <b>Tatami {{ match.areaId }} · {{ match.categoryName }}</b
      ><span>{{ match.associationCode }} · {{ match.status }}</span>
    </header>
    <bte-competitor-card side="AKA" [competitor]="match.aka" /><mat-form-field
      appearance="outline"
      ><mat-label>Kata</mat-label
      ><input matInput [(ngModel)]="kataName" [disabled]="locked"
    /></mat-form-field>
    <p *ngIf="judgeCount === 0" class="rule-warning">
      TODO_REGLAMENTO: falta configurar el panel {{ match.associationCode }}
      Kata. La llave y el competidor ya están cargados, pero el resultado no se
      puede confirmar todavía.
    </p>
    <div class="judges">
      <mat-form-field
        *ngFor="let score of judgeScores; index as i"
        appearance="outline"
        ><mat-label>Juez {{ i + 1 }}</mat-label
        ><input
          matInput
          type="number"
          step="0.1"
          [(ngModel)]="judgeScores[i]"
          [disabled]="locked"
      /></mat-form-field>
    </div>
    <bte-rule-controls
      [controls]="ruleSet.configuration.penalties || []"
      [disabled]="locked"
      (selected)="penalty.emit($event)" />
    <div class="total">
      Total <strong>{{ total }}</strong>
    </div>
    <button
      mat-flat-button
      color="primary"
      [disabled]="locked || judgeCount === 0 || judgeScores.length !== judgeCount"
      (click)="confirmed.emit({ kataName, scores: judgeScores, total })">
      Confirmar resultado
    </button>
  </section>`,
  styles: [
    `
      .kata {
        display: grid;
        gap: 1rem;
        max-width: 900px;
        margin: auto;
      }
      .kata header {
        display: flex;
        justify-content: space-between;
      }
      .judges {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 0.75rem;
      }
      .total {
        text-align: center;
        font-size: 1.5rem;
      }
      .total strong {
        display: block;
        font-size: 4rem;
      }
      .rule-warning {
        padding: 0.8rem 1rem;
        border-radius: 0.5rem;
        background: #fff7ed;
        color: #9a3412;
      }
    `
  ]
})
export class KataControlComponent implements OnChanges {
  @Input({ required: true }) match!: ScoreboardMatchState;
  @Input({ required: true }) ruleSet!: ScoreboardRuleSet;
  @Output() penalty = new EventEmitter<unknown>();
  @Output() confirmed = new EventEmitter<unknown>();
  judgeScores: number[] = [];
  kataName = '';
  constructor(private readonly rules: ScoreboardRuleService) {}
  ngOnChanges() {
    this.judgeScores = Array.from(
      { length: this.judgeCount },
      (_, i) => this.match?.kataScores?.[i] ?? 0
    );
    this.kataName = this.match?.kataName ?? '';
  }
  get judgeCount() {
    return this.ruleSet?.configuration.kata?.judgeCount ?? 0;
  }
  get total() {
    return this.rules.calculateKata(
      this.judgeScores,
      this.ruleSet.configuration.kata?.scoringConfiguration ?? {
        strategy: 'SUM'
      }
    );
  }
  get locked() {
    return ['FINISHED', 'CONFIRMED'].includes(this.match.status);
  }
}
