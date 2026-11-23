import { ChangeDetectorRef, OnDestroy, Pipe, PipeTransform } from '@angular/core';
import { Subscription } from 'rxjs';
import { LanguageService } from './language.service';

@Pipe({ name: 'translate', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform, OnDestroy {
  private readonly subscription: Subscription;

  constructor(
    private readonly languageService: LanguageService,
    changeDetector: ChangeDetectorRef
  ) {
    this.subscription = this.languageService.language$.subscribe(() =>
      changeDetector.markForCheck()
    );
  }

  transform(key: string): string {
    return this.languageService.translate(key);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
