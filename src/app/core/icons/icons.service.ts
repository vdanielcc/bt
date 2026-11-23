import { Injectable } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  MatIconRegistry,
  SafeResourceUrlWithIconOptions
} from '@angular/material/icon';
import { MATERIAL_ICONS } from './material-icons.generated';

@Injectable({
  providedIn: 'root'
})
export class IconsService {
  constructor(
    private readonly domSanitizer: DomSanitizer,
    private readonly iconRegistry: MatIconRegistry
  ) {
    for (const [name, svg] of Object.entries(MATERIAL_ICONS)) {
      this.iconRegistry.addSvgIconLiteralInNamespace(
        'mat', name, this.domSanitizer.bypassSecurityTrustHtml(svg)
      );
    }
    this.iconRegistry.addSvgIconResolver(
      (
        name: string,
        namespace: string
      ): SafeResourceUrl | SafeResourceUrlWithIconOptions | null => {
        switch (namespace) {
          case 'mat':
            return this.domSanitizer.bypassSecurityTrustResourceUrl(
              `assets/img/icons/material-design-icons/two-tone/${name}.svg`
            );

          case 'logo':
            return this.domSanitizer.bypassSecurityTrustResourceUrl(
              `assets/img/icons/logos/${name}.svg`
            );

          case 'flag':
            return this.domSanitizer.bypassSecurityTrustResourceUrl(
              `assets/img/icons/flags/${name}.svg`
            );

          default:
            return null;
        }
      }
    );
  }
}
