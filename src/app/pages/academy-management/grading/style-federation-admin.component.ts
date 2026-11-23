import { Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { StyleCatalogComponent } from './style-catalog.component';
import { FederationCatalogComponent } from './federation-catalog.component';

@Component({
  standalone: true,
  imports: [MatTabsModule, StyleCatalogComponent, FederationCatalogComponent],
  template: `<div class="p-4 md:p-6">
    <h1 class="text-3xl font-bold mb-2">Estilos y federaciones</h1>
    <p class="mb-6">Administra los catálogos que utilizan las academias.</p>
    <div class="card p-4 md:p-6"><mat-tab-group>
      <mat-tab label="Estilos / disciplinas"><ng-template matTabContent><div class="pt-6"><bte-style-catalog /></div></ng-template></mat-tab>
      <mat-tab label="Federaciones / asociaciones"><ng-template matTabContent><div class="pt-6"><bte-federation-catalog /></div></ng-template></mat-tab>
    </mat-tab-group></div>
  </div>`
})
export class StyleFederationAdminComponent {}
