import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'vex-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  standalone: true,
  imports: [MatButtonModule, MatIconModule, TranslatePipe]
})
export class FooterComponent implements OnInit, OnDestroy {
  constructor() {}

  ngOnInit() {}

  ngOnDestroy(): void {}
}
