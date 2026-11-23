import { RouterLink } from '@angular/router';
import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription, finalize, forkJoin } from 'rxjs';
import { AdminEvent, EventAdminService, EventOption, EventUpdate } from './event-admin.service';
import { eventPosterUrl } from '../event-poster-url';
import { EventAssociation, EventAssociationsService } from './event-associations.service';

@Component({
  standalone: true, selector: 'bte-event-admin', templateUrl: './event-admin.component.html',
  imports: [RouterLink, CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule]
})
export class EventAdminComponent implements OnDestroy {
  private readonly service = inject(EventAdminService);
  private readonly associationService = inject(EventAssociationsService);
  private readonly snack = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  private readonly subscriptions = new Subscription();
  private detailRequest?: Subscription;
  private reader?: FileReader;
  private rulesReader?: FileReader;
  readingRules = false;
  rulesBase64 = ''; rulesFileName = ''; rulesError = '';
  get rulesUrl(): string { return eventPosterUrl(this.form.controls.rulesDocument.value); }
  events: EventOption[] = [];
  associations: EventAssociation[] = [];
  academies: EventOption[] = []; types: EventOption[] = []; communes: EventOption[] = [];
  selectedId = 0; detail: AdminEvent | null = null;
  loading = false; loadingDetail = false; saving = false; readingPoster = false;
  error = ''; detailError = ''; posterPreview = ''; posterBase64 = ''; posterError = '';
  readonly form = this.fb.group({
    days: [1, [Validators.required, Validators.min(1), Validators.max(365), Validators.pattern(/^\d+$/)]],
    maxCategoriesPerRegistration: [0, [Validators.required, Validators.min(0), Validators.max(2147483647), Validators.pattern(/^\d+$/)]],
    name: ['', Validators.required], eventDateStart: ['', Validators.required], eventDateEnd: ['', Validators.required],
    eventDateCheckin: [''], presaleEndAt: [''], eventDateSendBracket: [''],
    eventAddress: ['', Validators.required], eventLocation: [''], eventLinkWaze: [''], eventLinkGmaps: [''], eventLinkWhatsapp: [''],
    coOrganizerAcademyIds: [[] as number[]],
    academyId: [0, [Validators.required, Validators.min(1)]], typeId: [0, [Validators.required, Validators.min(1)]], communeId: [0, [Validators.required, Validators.min(1)]],
    feeTicket: [null as number | null, [Validators.min(0), Validators.pattern(/^\d+$/)]],
    exponent: [''], asociationType: [''], eventType: ['', Validators.required], examiner: [''], exhibitor: [''], rulesDocument: ['']
  });
  readonly textFields = [
    { key: 'name', label: 'Nombre', required: true }, { key: 'eventType', label: 'Modalidad del evento', required: true },
    { key: 'eventAddress', label: 'Dirección', required: true }, { key: 'eventLocation', label: 'Recinto / ubicación', required: false },
    { key: 'exponent', label: 'Exponente', required: false },
    { key: 'examiner', label: 'Examinador', required: false }, { key: 'exhibitor', label: 'Expositor', required: false },
    { key: 'eventLinkWaze', label: 'Enlace de Waze', required: false }, { key: 'eventLinkGmaps', label: 'Enlace de Google Maps', required: false },
    { key: 'eventLinkWhatsapp', label: 'Enlace de WhatsApp', required: false }
  ];
  readonly dateFields = [
    { key: 'eventDateStart', label: 'Inicio', required: true }, { key: 'eventDateEnd', label: 'Término', required: true },
    { key: 'eventDateCheckin', label: 'Cierre de inscripciones', required: false }, { key: 'presaleEndAt', label: 'Fin de preventa', required: false },
    { key: 'eventDateSendBracket', label: 'Envío de llaves', required: false }
  ];
  constructor() { this.load(); }
  associationsContain(code: string): boolean { return this.associations.some(value => value.code === code); }
  openDateTimePicker(input: HTMLInputElement): void {
    if (input.disabled) return;
    input.focus();
    input.showPicker?.();
  }
  ngOnDestroy(): void { this.subscriptions.unsubscribe(); this.detailRequest?.unsubscribe(); this.reader?.abort(); this.rulesReader?.abort(); }
  load(): void {
    if (this.loading) return;
    this.loading = true; this.error = '';
    this.subscriptions.add(forkJoin({ events: this.service.list(), options: this.service.options(), associations: this.associationService.list() })
      .pipe(finalize(() => this.loading = false)).subscribe({
        next: ({ events, options, associations }) => { this.events = events; this.associations = associations; Object.assign(this, options); },
        error: error => this.error = this.message(error, 'No se pudieron cargar los eventos. Inténtalo nuevamente.')
      }));
  }
  select(id: number): void {
    if (this.saving || this.readingPoster || this.readingRules) return;
    this.rulesBase64 = ''; this.rulesFileName = ''; this.rulesError = '';
    this.detailRequest?.unsubscribe();
    this.selectedId = id; this.detail = null; this.detailError = ''; this.posterBase64 = ''; this.posterPreview = ''; this.posterError = '';
    this.loadingDetail = true;
    this.detailRequest = this.service.get(id).pipe(finalize(() => this.loadingDetail = false)).subscribe({
      next: event => {
        this.detail = event;
        this.form.reset({ ...event, coOrganizerAcademyIds: event.coOrganizerAcademyIds ?? [],
          days: event.days ?? 1, maxCategoriesPerRegistration: event.maxCategoriesPerRegistration ?? 0,
          eventDateStart: this.dateInput(event.eventDateStart), eventDateEnd: this.dateInput(event.eventDateEnd),
          eventDateCheckin: this.dateInput(event.eventDateCheckin), presaleEndAt: this.dateInput(event.presaleEndAt),
          eventDateSendBracket: this.dateInput(event.eventDateSendBracket) });
        this.posterPreview = eventPosterUrl(event.poster);
      }, error: error => this.detailError = this.message(error, 'No se pudo cargar el detalle del evento.')
    });
  }
  onPoster(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.saving || this.readingPoster) return;
    this.posterError = '';
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 3 * 1024 * 1024) {
      this.posterError = 'Selecciona una imagen JPG o PNG de hasta 3 MB.'; input.value = ''; return;
    }
    this.readingPoster = true;
    const reader = this.reader = new FileReader();
    reader.onload = () => {
      this.posterPreview = String(reader.result); this.posterBase64 = this.posterPreview.split(',')[1];
      this.readingPoster = false; this.form.markAsDirty(); input.value = '';
    };
    reader.onerror = () => { this.readingPoster = false; this.posterError = 'No se pudo leer la imagen.'; input.value = ''; };
    reader.readAsDataURL(file);
  }
  onRulesDocument(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.saving || this.readingRules) return;
    this.rulesError = '';
    this.rulesBase64 = ''; this.rulesFileName = file.name;
    if (!/\.pdf$/i.test(file.name)) {
      this.rulesError = 'Las bases deben ser un archivo PDF con extensión .pdf.'; return;
    }
    if (file.size === 0) { this.rulesError = 'El archivo PDF está vacío.'; return; }
    if (file.size > 15 * 1024 * 1024) {
      this.rulesError = `El PDF pesa ${(file.size / (1024 * 1024)).toFixed(2)} MB y supera el máximo de 15 MB.`; return;
    }
    this.readingRules = true;
    const reader = this.rulesReader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result).split(',')[1] ?? '';
      const bytes = atob(result);
      if (!bytes.startsWith('%PDF-') || !bytes.slice(-1024).includes('%%EOF')) {
        this.rulesError = 'El archivo no es un PDF válido.';
      } else {
        this.rulesBase64 = result; this.rulesFileName = file.name; this.form.markAsDirty();
      }
      this.readingRules = false;
    };
    reader.onerror = () => { this.readingRules = false; this.rulesError = 'No se pudo leer el PDF.'; };
    reader.readAsDataURL(file);
  }
  save(): void {
    if (!this.detail || this.saving || this.readingPoster || this.readingRules) return;
    this.detailError = '';
    if (this.rulesError) { this.detailError = this.rulesError; return; }
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    if (v.eventDateEnd! < v.eventDateStart!) { this.detailError = 'El término no puede ser anterior al inicio.'; return; }
    if (v.presaleEndAt && v.eventDateCheckin && v.presaleEndAt >= v.eventDateCheckin) {
      this.detailError = 'El fin de preventa debe ser anterior al cierre de inscripciones.'; return;
    }
    const nullable = (value: string | null) => value?.trim() || null;
    const date = (value: string | null, original: string | null) =>
      (value || '') === this.dateInput(original) ? original : value || null;
    const payload: EventUpdate = {
      days: v.days!, maxCategoriesPerRegistration: v.maxCategoriesPerRegistration!, name: v.name!.trim(), eventType: v.eventType!.trim(), eventAddress: v.eventAddress!.trim(),
      eventDateStart: date(v.eventDateStart, this.detail.eventDateStart)!, eventDateEnd: date(v.eventDateEnd, this.detail.eventDateEnd)!,
      eventDateCheckin: date(v.eventDateCheckin, this.detail.eventDateCheckin), presaleEndAt: date(v.presaleEndAt, this.detail.presaleEndAt),
      eventDateSendBracket: date(v.eventDateSendBracket, this.detail.eventDateSendBracket),
      coOrganizerAcademyIds: (v.coOrganizerAcademyIds ?? []).filter(id => id !== v.academyId),
      academyId: v.academyId!, typeId: v.typeId!, communeId: v.communeId!, feeTicket: v.feeTicket,
      eventLocation: nullable(v.eventLocation), eventLinkWaze: nullable(v.eventLinkWaze), eventLinkGmaps: nullable(v.eventLinkGmaps),
      eventLinkWhatsapp: nullable(v.eventLinkWhatsapp), exponent: nullable(v.exponent), asociationType: nullable(v.asociationType),
      examiner: nullable(v.examiner), exhibitor: nullable(v.exhibitor), rulesDocument: nullable(v.rulesDocument),
      poster: this.detail.poster, ...(this.posterBase64 ? { posterBase64: this.posterBase64 } : {}),
      ...(this.rulesBase64 ? { rulesDocumentBase64: this.rulesBase64 } : {})
    };
    const id = this.selectedId;
    this.saving = true; this.form.disable();
    this.subscriptions.add(this.service.update(id, payload).pipe(finalize(() => { this.saving = false; this.form.enable(); })).subscribe({
      next: () => {
        this.events = this.events.map(event => event.id === id ? { ...event, name: payload.name } : event);
        this.snack.open('Evento actualizado correctamente.', 'Cerrar', { duration: 3500 });
        this.saving = false; this.select(id);
      }, error: error => this.detailError = this.message(error, 'No se pudo actualizar el evento. Los cambios se conservan para reintentar.')
    }));
  }
  private dateInput(value: string | null): string { return value?.replace(' ', 'T').slice(0, 19) ?? ''; }
  private message(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) return fallback;
    if (typeof error.error === 'string' && !error.error.startsWith('<')) return error.error;
    return error.error?.message || (error.error?.errors ? Object.values(error.error.errors).flat().join(' ') : fallback);
  }
}
