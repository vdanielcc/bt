import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ScoreboardMatchState } from '../../models/scoreboard.models';
import {
  CompetitorCardComponent,
  TimerComponent
} from '../scoreboard-components';

@Component({
  selector: 'bte-kumite-display',
  standalone: true,
  imports: [CommonModule, CompetitorCardComponent, TimerComponent],
  template: `<main class="display">
    <header>
      TATAMI {{ match.areaId }} · {{ match.categoryName }} ·
      {{ match.associationCode }}
    </header>
    <bte-scoreboard-timer [milliseconds]="timerMs" [controls]="false" />
    <div class="corners">
      <bte-competitor-card
        side="AKA"
        [competitor]="match.aka"
        [score]="match.scores?.AKA || 0" /><bte-competitor-card
        side="SHIRO"
        [competitor]="match.shiro"
        [score]="match.scores?.SHIRO || 0" />
    </div>
  </main>`,
  styles: [
    `
      .display {
        min-height: 100vh;
        background: #070b14;
        color: #fff;
        padding: 3vw;
        display: grid;
        align-content: center;
        gap: 4vh;
      }
      .display header {
        text-align: center;
        font-size: clamp(1.2rem, 2vw, 2.4rem);
        font-weight: 800;
      }
      .corners {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 3vw;
      }
      @media (max-width: 700px) {
        .corners {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class KumiteDisplayComponent {
  @Input({ required: true }) match!: ScoreboardMatchState;
  @Input() timerMs = 0;
}

@Component({
  selector: 'bte-kata-display',
  standalone: true,
  imports: [CommonModule, CompetitorCardComponent],
  template: `<main class="display">
    <header>
      TATAMI {{ match.areaId }} · KATA · {{ match.associationCode }}
    </header>
    <bte-competitor-card side="AKA" [competitor]="match.aka" />
    <div class="kata">{{ match.kataName || 'Kata por definir' }}</div>
    <div class="scores">
      <span *ngFor="let score of match.kataScores">{{
        score | number: '1.1-2'
      }}</span>
    </div>
    <strong class="total">{{ total | number: '1.1-2' }}</strong>
  </main>`,
  styles: [
    `
      .display {
        min-height: 100vh;
        background: #070b14;
        color: #fff;
        padding: 3vw;
        display: grid;
        place-content: center;
        gap: 3vh;
        text-align: center;
      }
      .display header,
      .kata {
        font-size: clamp(1.5rem, 3vw, 3rem);
      }
      .scores {
        display: flex;
        justify-content: center;
        gap: 2vw;
        font-size: clamp(1.5rem, 4vw, 4rem);
      }
      .total {
        font-size: clamp(5rem, 14vw, 12rem);
      }
    `
  ]
})
export class KataDisplayComponent {
  @Input({ required: true }) match!: ScoreboardMatchState;
  get total() {
    return (this.match.kataScores ?? []).reduce((a, b) => a + b, 0);
  }
}
