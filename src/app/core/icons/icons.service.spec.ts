import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatIconRegistry } from '@angular/material/icon';
import { IconsService } from './icons.service';

describe('IconsService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [MatIconRegistry] });
    TestBed.inject(IconsService);
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  for (const name of ['home', 'edit_square', 'add', 'edit', 'person_off']) {
    it(`renders ${name} without requesting an external SVG`, () => {
      let icon: SVGElement | undefined;
      TestBed.inject(MatIconRegistry).getNamedSvgIcon(name, 'mat').subscribe(svg => icon = svg);
      expect(icon).toBeDefined();
      expect(icon!.tagName.toLowerCase()).toBe('svg');
      expect(icon!.querySelector('path')).not.toBeNull();
      TestBed.inject(HttpTestingController).expectNone(() => true);
    });
  }
});
