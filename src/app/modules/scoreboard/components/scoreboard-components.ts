import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  ConnectionStatus,
  RuleControl,
  ScoreOption,
  ScoreboardCompetitor,
  ScoreboardSide,
  SyncStatus
} from '../models/scoreboard.models';

@Component({
  selector: 'bte-competitor-card',
  standalone: true,
  imports: [CommonModule],
  template: `<article
    class="competitor"
    [class.aka]="side === 'AKA'"
    [class.shiro]="side === 'SHIRO'">
    <span>{{ side }}</span>
    <h2>{{ competitor?.name || 'Por definir' }}</h2>
    <p>{{ competitor?.academy || '—' }}</p>
    <strong>{{ score }}</strong>
  </article>`,
  styles: [
    `
      .competitor {
        padding: 1.25rem;
        border-radius: 1rem;
        background: var(--vex-card-background);
        border-top: 8px solid #64748b;
        text-align: center;
      }
      .aka {
        border-color: #dc2626;
      }
      .shiro {
        border-color: #2563eb;
      }
      .competitor span {
        font-weight: 800;
      }
      .competitor h2 {
        margin: 0.4rem 0;
      }
      .competitor p {
        color: var(--vex-text-color-secondary);
      }
      .competitor strong {
        font-size: 4rem;
        line-height: 1;
      }
      @media (max-height: 800px) {
        .competitor {
          padding: 0.65rem;
          border-top-width: 5px;
          border-radius: 0.65rem;
        }
        .competitor h2 {
          margin: 0.15rem 0;
          font-size: 1rem;
          line-height: 1.1;
        }
        .competitor p {
          margin: 0.1rem 0;
          font-size: 0.75rem;
        }
        .competitor strong {
          font-size: 2.5rem;
        }
      }
    `
  ]
})
export class CompetitorCardComponent {
  @Input() competitor?: ScoreboardCompetitor;
  @Input() side: ScoreboardSide = 'AKA';
  @Input() score = 0;
}

@Component({
  selector: 'bte-score-controls',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `<div class="controls">
    <button
      mat-flat-button
      color="primary"
      *ngFor="let option of options"
      [disabled]="disabled"
      (click)="score.emit(option)">
      {{ option.label }}
    </button>
  </div>`,
  styles: [
    `
      .controls {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
        gap: 0.75rem;
      }
      .controls button {
        min-height: 64px;
        font-size: 1.15rem;
        font-weight: 800;
      }
      @media (max-height: 800px) {
        .controls {
          gap: 0.4rem;
        }
        .controls button {
          min-height: 40px;
          font-size: 0.9rem;
        }
      }
    `
  ]
})
export class ScoreControlsComponent {
  @Input() options: ScoreOption[] = [];
  @Input() disabled = false;
  @Output() score = new EventEmitter<ScoreOption>();
}

@Component({
  selector: 'bte-rule-controls',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `<div class="controls">
    <button
      mat-stroked-button
      *ngFor="let item of controls"
      [disabled]="disabled"
      (click)="selected.emit(item)">
      {{ item.label }}
    </button>
  </div>`,
  styles: [
    `
      .controls {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
      }
      .controls button {
        min-height: 52px;
      }
      @media (max-height: 800px) {
        .controls {
          gap: 0.35rem;
        }
        .controls button {
          min-height: 36px;
        }
      }
    `
  ]
})
export class RuleControlsComponent {
  @Input() controls: RuleControl[] = [];
  @Input() disabled = false;
  @Output() selected = new EventEmitter<RuleControl>();
}

@Component({
  selector: 'bte-connection-status',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `<span class="status" [attr.data-status]="status"
    ><mat-icon>{{ icon }}</mat-icon
    >{{ label
    }}<ng-container *ngIf="pending">
      · {{ pending }} cambios pendientes</ng-container
    ></span
  >`,
  styles: [
    `
      .status {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        font-weight: 700;
      }
      .status[data-status='ONLINE'] {
        color: #15803d;
      }
      .status[data-status='OFFLINE'],
      .status[data-status='ERROR'] {
        color: #dc2626;
      }
      .status[data-status='SYNCING'] {
        color: #ca8a04;
      }
    `
  ]
})
export class ConnectionStatusComponent {
  @Input() status: ConnectionStatus = 'ONLINE';
  @Input() pending = 0;
  get label() {
    return {
      ONLINE: 'Sincronizado',
      OFFLINE: 'Sin conexión',
      SYNCING: 'Sincronizando',
      ERROR: 'Error de sincronización'
    }[this.status];
  }
  get icon() {
    return this.status === 'ONLINE'
      ? 'check_circle'
      : this.status === 'SYNCING'
        ? 'sync'
        : 'cloud_off';
  }
}

@Component({
  selector: 'bte-sync-status',
  standalone: true,
  imports: [CommonModule],
  template: `<span
    >Estado: {{ status
    }}<ng-container *ngIf="pending">
      · {{ pending }} pendiente(s)</ng-container
    ></span
  >`
})
export class SyncStatusComponent {
  @Input() status: SyncStatus = 'SYNCED';
  @Input() pending = 0;
}

@Component({
  selector: 'bte-scoreboard-timer',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `<div class="timer">{{ formatted }}</div>
    <div class="timer-actions" *ngIf="controls">
      <button mat-flat-button color="primary" (click)="start.emit()">
        Iniciar/Reanudar</button
      ><button mat-stroked-button (click)="pause.emit()">Pausar</button
      ><button mat-stroked-button (click)="adjust.emit(-1)">-1s</button
      ><button mat-stroked-button (click)="adjust.emit(1)">+1s</button>
    </div>`,
  styles: [
    `
      .timer {
        font-variant-numeric: tabular-nums;
        font-size: clamp(4rem, 10vw, 8rem);
        font-weight: 900;
        text-align: center;
        line-height: 1;
      }
      .timer-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.6rem;
        margin-top: 1rem;
      }
      .timer-actions button {
        min-height: 52px;
      }
      @media (max-height: 800px) {
        .timer {
          font-size: clamp(3.5rem, 8vh, 5rem);
        }
        .timer-actions {
          gap: 0.4rem;
          margin-top: 0.45rem;
        }
        .timer-actions button {
          min-height: 40px;
        }
      }
    `
  ]
})
export class TimerComponent {
  @Input() milliseconds = 0;
  @Input() controls = true;
  @Output() start = new EventEmitter<void>();
  @Output() pause = new EventEmitter<void>();
  @Output() adjust = new EventEmitter<number>();
  get formatted() {
    const total = Math.ceil(this.milliseconds / 1000);
    return `${Math.floor(total / 60)
      .toString()
      .padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
  }
}
