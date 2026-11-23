import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'bte-belt-badge',
  standalone: true,
  imports: [NgIf],
  template: `<span class="badge"
    ><span class="belt" [style.background]="safeColor"></span
    ><span
      >{{ name || 'Cinturón sin definir'
      }}<small *ngIf="grade">{{ grade }}</small></span
    ></span
  >`,
  styles: [
    `
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
      }
      .belt {
        display: inline-block;
        width: 2.6rem;
        height: 0.75rem;
        border-radius: 0.2rem;
        border: 1px solid rgb(0 0 0/20%);
        background: #cbd5e1;
      }
      .badge span:last-child {
        display: flex;
        flex-direction: column;
      }
      .badge small {
        color: var(--vex-text-color-secondary);
      }
    `
  ]
})
export class BeltBadgeComponent {
  @Input() name: string | null = '';
  @Input() color: string | null = '';
  @Input() grade: string | null = '';
  get safeColor(): string {
    return /^#[0-9a-f]{3,8}$/i.test(this.color || '') ? this.color! : '#cbd5e1';
  }
}
