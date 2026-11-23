import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import { EventAdminComponent } from './event-admin.component';
import { AdminEvent, EventAdminService } from './event-admin.service';
import { eventPosterUrl } from '../event-poster-url';
import { environment } from '../../../../environments/environment';
import { EventAssociationsService } from './event-associations.service';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

describe('Event administration', () => {
  let component: EventAdminComponent;
  let service: jasmine.SpyObj<EventAdminService>;
  const event: AdminEvent = {
    id: 7, name: 'Campeonato', eventType: 'KARATE', eventAddress: 'Direccion', days: 1, maxCategoriesPerRegistration: 3,
    eventDateStart: '2026-10-01T09:00:00Z', eventDateEnd: '2026-10-01T19:00:00Z',
    eventDateCheckin: null, presaleEndAt: null, eventDateSendBracket: null,
    eventLocation: null, eventLinkWaze: null, eventLinkGmaps: null, eventLinkWhatsapp: null,
    academyId: 1, typeId: 2, communeId: 3, feeTicket: 1000, exponent: null, asociationType: 'WKF',
    examiner: null, exhibitor: null, rulesDocument: null, poster: '/events/7/2026/09/poster-old.png',
    status: 'registration_open', isActive: true, numberOfAreas: 2, numberOfCompetitors: 10, descriptions: null
  };
  beforeEach(() => {
    service = jasmine.createSpyObj('EventAdminService', ['list', 'get', 'update', 'options']);
    service.list.and.returnValue(of([event]));
    service.options.and.returnValue(of({ academies: [], types: [], communes: [] }));
    service.get.and.returnValue(of(event));
    service.update.and.returnValue(of(undefined));
    TestBed.configureTestingModule({ imports: [EventAdminComponent, HttpClientTestingModule],
      providers: [provideRouter([]), provideNoopAnimations(), FormBuilder, { provide: EventAdminService, useValue: service },
      { provide: EventAssociationsService, useValue: { list: () => of([
        { code: 'WKF', description: 'World Karate Federation' },
        { code: 'JKA', description: 'Japan Karate Association' },
        { code: 'WUKF', description: 'World Union of Karate-do Federations' }
      ]) } },
      { provide: MatSnackBar, useValue: { open: () => {} } }] });
    component = TestBed.runInInjectionContext(() => new EventAdminComponent());
  });
  afterEach(() => component.ngOnDestroy());
  it('reads a selected PDF, sends it on save and clears it only after success', () => {
    component.select(7);
    const pdf = btoa('%PDF-1.4\n%%EOF');
    const reader = { result: `data:application/pdf;base64,${pdf}`, readAsDataURL: () => {}, abort: () => {}, onload: null, onerror: null } as unknown as FileReader;
    spyOn(window, 'FileReader').and.returnValue(reader);
    const input = { files: [new File(['%PDF-1.4\n%%EOF'], 'bases.pdf', { type: 'application/pdf' })], value: 'bases.pdf' };
    component.onRulesDocument({ target: input } as unknown as Event);
    expect(component.readingRules).toBeTrue(); component.save();
    expect(service.update).not.toHaveBeenCalled();
    reader.onload!.call(reader, new ProgressEvent('load') as ProgressEvent<FileReader>);
    expect(component.rulesBase64).toBe(pdf);
    component.save();
    expect(service.update.calls.mostRecent().args[1].rulesDocumentBase64).toBe(pdf);
    expect(component.rulesBase64).toBe('');
  });
  it('blocks success after an invalid PDF selection and retains valid bytes on API failure', () => {
    component.select(7);
    component.onRulesDocument({ target: { files: [new File(['text'], 'bases.txt', { type: 'text/plain' })], value: '' } } as unknown as Event);
    component.save(); expect(service.update).not.toHaveBeenCalled();
    expect(component.detailError).toContain('PDF');
    component.rulesError = ''; component.rulesBase64 = 'selected-pdf';
    service.update.and.returnValue(throwError(() => new HttpErrorResponse({ status: 502, error: { message: 'PDF no confirmado' } })));
    component.save();
    expect(component.rulesBase64).toBe('selected-pdf');
    expect(component.detailError).toBe('PDF no confirmado');
  });
  it('accepts a PDF with a generic MIME type and keeps its name visible', () => {
    component.select(7);
    const pdf = btoa('%PDF-1.4\n%%EOF');
    const reader = { result: `data:application/octet-stream;base64,${pdf}`, readAsDataURL: () => {}, abort: () => {}, onload: null, onerror: null } as unknown as FileReader;
    spyOn(window, 'FileReader').and.returnValue(reader);
    const input = { files: [new File(['%PDF-1.4\n%%EOF'], 'bases.pdf', { type: 'application/octet-stream' })], value: 'bases.pdf' };
    component.onRulesDocument({ target: input } as unknown as Event);
    reader.onload!.call(reader, new ProgressEvent('load') as ProgressEvent<FileReader>);
    expect(component.rulesError).toBe(''); expect(component.rulesBase64).toBe(pdf);
    expect(component.rulesFileName).toBe('bases.pdf'); expect(input.value).toBe('bases.pdf');
  });
  it('keeps rejected filenames visible and explains the actual size limit', () => {
    const input = { files: [{ name: 'bases.pdf', type: 'application/pdf', size: 16 * 1024 * 1024 }], value: 'bases.pdf' };
    component.onRulesDocument({ target: input } as unknown as Event);
    expect(component.rulesError).toContain('16.00 MB'); expect(component.rulesError).toContain('15 MB');
    expect(component.rulesFileName).toBe('bases.pdf'); expect(input.value).toBe('bases.pdf');
  });
  it('loads coorganizers and excludes the primary academy from the saved list', () => {
    service.get.and.returnValue(of({ ...event, coOrganizerAcademyIds: [4, 5] }));
    component.select(7);
    expect(component.form.controls.coOrganizerAcademyIds.value).toEqual([4, 5]);
    component.form.patchValue({ coOrganizerAcademyIds: [1, 5] });
    component.save();
    expect(service.update.calls.mostRecent().args[1].coOrganizerAcademyIds).toEqual([5]);
  });
  it('loads and saves the category limit, including unlimited registrations', () => {
    component.select(7);
    expect(component.form.controls.maxCategoriesPerRegistration.value).toBe(3);
    for (const value of [-1, 1.5]) {
      component.form.patchValue({ maxCategoriesPerRegistration: value }); component.save();
      expect(service.update).not.toHaveBeenCalled();
    }
    component.form.patchValue({ maxCategoriesPerRegistration: 0 }); component.save();
    expect(service.update.calls.mostRecent().args[1].maxCategoriesPerRegistration).toBe(0);
  });
  it('loads the selected event and preserves dates and poster when saving other fields', () => {
    component.select(7);
    expect(component.form.value.name).toBe('Campeonato');
    component.form.patchValue({ name: 'Nuevo nombre' });
    component.save();
    const payload = service.update.calls.mostRecent().args[1];
    expect(payload.name).toBe('Nuevo nombre');
    expect(payload.eventDateStart).toBe(event.eventDateStart);
    expect(payload.poster).toBe(event.poster);
    expect(payload.posterBase64).toBeUndefined();
    expect(service.get).toHaveBeenCalledTimes(2);
    expect(component.events[0].name).toBe('Nuevo nombre');
  });
  it('does not replace the latest selection with a late response', () => {
    const first = new Subject<AdminEvent>();
    service.get.and.returnValues(first, of({ ...event, id: 8, name: 'Segundo' }));
    component.select(7); component.select(8); first.next(event);
    expect(component.detail?.id).toBe(8);
    expect(component.form.value.name).toBe('Segundo');
  });
  it('sends the new poster and reloads the persisted result', () => {
    component.select(7); component.posterBase64 = 'image-data'; component.save();
    expect(service.update.calls.mostRecent().args[1].posterBase64).toBe('image-data');
    expect(component.posterBase64).toBe('');
  });
  it('keeps edits after a failed update and allows retry', () => {
    component.select(7); component.form.patchValue({ name: 'Mi cambio' });
    service.update.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    component.save();
    expect(component.form.value.name).toBe('Mi cambio');
    expect(component.form.enabled).toBeTrue(); expect(component.saving).toBeFalse();
    expect(component.detailError).toContain('No se pudo actualizar');
  });
  it('rejects inverted dates and waits for the poster to finish loading', () => {
    component.select(7); component.readingPoster = true; component.save();
    component.readingPoster = false; component.form.patchValue({ eventDateEnd: '2026-09-01T00:00:00' }); component.save();
    expect(service.update).not.toHaveBeenCalled();
  });
  it('resolves API poster paths while keeping external posters unchanged', () => {
    expect(eventPosterUrl(event.poster)).toBe(new URL(event.poster!, environment.apiBaseUrl).href);
    expect(eventPosterUrl('https://example.org/poster.jpg')).toBe('https://example.org/poster.jpg');
  });
  it('loads the catalogue and saves the association as text', () => {
    component.select(7); component.form.patchValue({ asociationType: 'JKA' }); component.save();
    expect(component.associations.map(value => value.code)).toEqual(['WKF', 'JKA', 'WUKF']);
    expect(service.update.calls.mostRecent().args[1].asociationType).toBe('JKA');
  });
  it('renders all five native date and time inputs and opens the picker from their calendar buttons', () => {
    const registry = TestBed.inject(MatIconRegistry);
    const sanitizer = TestBed.inject(DomSanitizer);
    for (const name of ['event', 'upload']) registry.addSvgIconLiteralInNamespace('mat', name,
      sanitizer.bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg"></svg>'));
    const fixture = TestBed.createComponent(EventAdminComponent);
    fixture.componentInstance.select(7); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Días de competencia');
    expect(fixture.nativeElement.querySelector('input[formControlName="maxCategoriesPerRegistration"]').value).toBe('3');
    const inputs: HTMLInputElement[] = Array.from(fixture.nativeElement.querySelectorAll('input[type="datetime-local"]'));
    expect(inputs.length).toBe(5);
    expect(inputs[0].value).toContain('2026-10-01T09:00');
    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button[aria-label^="Seleccionar fecha y hora"]'));
    expect(buttons.length).toBe(5);
    for (let index = 0; index < inputs.length; index++) {
      const picker = jasmine.createSpy('showPicker');
      Object.defineProperty(inputs[index], 'showPicker', { value: picker, configurable: true });
      buttons[index].click();
      expect(picker).toHaveBeenCalled();
      expect(inputs[index].step).toBe('60');
    }
    fixture.destroy();
  });
  it('loads MySQL date strings into native date and time inputs without changing untouched dates', () => {
    const mysqlEvent = { ...event, eventDateStart: '2026-10-01 09:30:00' };
    service.get.and.returnValue(of(mysqlEvent)); component.select(7);
    expect(component.form.value.eventDateStart).toBe('2026-10-01T09:30:00');
    component.save();
    expect(service.update.calls.mostRecent().args[1].eventDateStart).toBe(mysqlEvent.eventDateStart);
  });
});
