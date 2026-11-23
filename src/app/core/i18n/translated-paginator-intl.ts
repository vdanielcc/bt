import { Injectable, OnDestroy } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { Subscription } from 'rxjs';
import { LanguageService } from './language.service';

@Injectable()
export class TranslatedPaginatorIntl extends MatPaginatorIntl implements OnDestroy {
  private readonly subscription: Subscription;

  constructor(private readonly languageService: LanguageService) {
    super();
    this.subscription = this.languageService.language$.subscribe(() => {
      this.itemsPerPageLabel = this.languageService.translate('Elementos por página');
      this.nextPageLabel = this.languageService.translate('Página siguiente');
      this.previousPageLabel = this.languageService.translate('Página anterior');
      this.firstPageLabel = this.languageService.translate('Primera página');
      this.lastPageLabel = this.languageService.translate('Última página');
      this.changes.next();
    });
  }

  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0 || pageSize === 0) {
      return `0 ${this.languageService.translate('de')} ${length}`;
    }
    const startIndex = page * pageSize;
    const endIndex = Math.min(startIndex + pageSize, length);
    return `${startIndex + 1} – ${endIndex} ${this.languageService.translate('de')} ${length}`;
  };

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
