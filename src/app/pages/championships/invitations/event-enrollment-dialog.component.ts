import { event60SelectionError } from './event-60-enrollment-policy';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { EnrollmentPricePreviewComponent } from '../pricing/enrollment-price-preview.component';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { finalize, forkJoin } from 'rxjs';
import { enrollmentErrorMessage } from './enrollment-error-message';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { EventInvitation } from './event-invitation.model';
import { EventInvitationsService } from './event-invitations.service';

interface EnrollmentDialogData { event: EventInvitation; student: any; }
interface ModalityGroup { name: string; categories: any[]; }

@Component({
  selector: 'bte-event-enrollment-dialog', standalone: true,
  templateUrl: './event-enrollment-dialog.component.html',
  styleUrls: ['./event-enrollment-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, EnrollmentPricePreviewComponent, CommonModule, MatDialogModule, MatButtonModule, MatCheckboxModule,
    MatIconModule, MatProgressSpinnerModule, MatSnackBarModule, MatTabsModule, TranslatePipe]
})
export class EventEnrollmentDialogComponent implements OnInit {
  get isTeam(): boolean {
    const student = this.data.student;
    return ['team', 'equipo'].includes(String(student.role ?? student.rol ?? student.Rol ?? '').toLowerCase());
  }
  closureOverrideReason = '';
  get registrationClosed(): boolean {
    const deadline = Date.parse(this.data.event.registrationClosesAtUtc || this.data.event.eventDateCheckin || '');
    return Number.isFinite(deadline) && Date.now() >= deadline;
  }
  priceReady = false;
  get pricingCategoryIds(): string { return [...this.selectedIds].sort((a, b) => a - b).join(','); }
  groups: ModalityGroup[] = [];
  selectedIds = new Set<number>();
  loading = true; saving = false; loadError = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: EnrollmentDialogData,
    private dialogRef: MatDialogRef<EventEnrollmentDialogComponent>,
    private service: EventInvitationsService, private snackBar: MatSnackBar,
    private language: LanguageService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true; this.loadError = false;
    const student = this.data.student;
    const id = Number(student.id ?? student.Id);
    const role = this.isTeam ? 'Team' : student.role ?? student.rol ?? student.Rol ?? 'Sportman';
    forkJoin({
      categories: this.service.getEligibleCategories(this.data.event.id, id, role),
      event: this.service.getEvent(this.data.event.id)
    })
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({ next: ({ categories, event }) => {
        this.data.event = event; this.prepare(categories);
      }, error: () => this.loadError = true });
  }

  prepare(items: any[]): void {
    this.selectedIds.clear();
    const grouped = new Map<string, any[]>();
    items.forEach((item) => {
      const label = String(item.modality ?? item.Modality ?? this.language.translate('General')).trim();
      const individual = /^(kata|kumite)(?:\s+individual(?:\s+(?:femenino|masculino))?)?$/i.exec(label);
      const modality = individual
        ? (individual[1].toLowerCase() === 'kata' ? 'Kata' : 'Kumite')
        : label;
      grouped.set(modality, [...(grouped.get(modality) ?? []), item]);
      if (item.isEnrolled ?? item.IsEnrolled) this.selectedIds.add(this.id(item));
      this.children(item).forEach((child) => { if (child.isSelected ?? child.IsSelected) this.selectedIds.add(this.id(child)); });
    });
    this.groups = [...grouped].map(([name, categories]) => ({ name, categories }));
  }

  id(item: any): number { return Number(item.id ?? item.Id); }
  children(item: any): any[] { return item.children ?? item.Children ?? []; }
  name(item: any): string { return `${item.code ?? item.Code ?? ''} - ${item.name ?? item.Name ?? ''}`; }
  selected(item: any): boolean { return this.selectedIds.has(this.id(item)); }
  selectionDisabled(item: any): boolean {
    return this.saving || !this.selected(item) && !!event60SelectionError(this.data.event.id, this.isTeam,
      new Set(this.selectedIds).add(this.id(item)), this.groups.flatMap(g => g.categories));
  }
  toggle(item: any, checked: boolean): void {
    if (this.saving) return;
    if (checked) {
      const candidate = new Set(this.selectedIds).add(this.id(item));
      const error = event60SelectionError(this.data.event.id, this.isTeam, candidate, this.groups.flatMap(g => g.categories));
      if (error) { this.warn(error); this.cdr.markForCheck(); return; }
    }
    this.priceReady = false;
    checked ? this.selectedIds.add(this.id(item)) : this.selectedIds.delete(this.id(item));
    if (!checked) this.children(item).forEach((child) => this.selectedIds.delete(this.id(child)));
  }

  save(): void {
    if (this.saving || this.loading || this.loadError || !this.priceReady) return;
    if (this.registrationClosed) {
      if (!this.data.event.canOverrideRegistrationClose) { this.warn('Las inscripciones del evento están cerradas.'); return; }
    }
    if (!this.validate()) return;
    const studentId = Number(this.data.student.id ?? this.data.student.Id);
    this.saving = true;
    const request = this.isTeam
      ? this.service.enrollTeam(this.data.event.id, studentId, [...this.selectedIds], this.closureOverrideReason.trim() || undefined)
      : this.service.enroll(this.data.event.id, studentId, [...this.selectedIds], undefined, this.closureOverrideReason.trim() || undefined);
    request
      .pipe(finalize(() => { this.saving = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: () => { this.snackBar.open(this.language.translate('Inscripción realizada correctamente'), undefined, { duration: 3500 }); this.dialogRef.close(true); },
        error: error => this.snackBar.open(enrollmentErrorMessage(error), undefined, { duration: 6000 })
      });
  }

  private validate(): boolean {
    if (!this.selectedIds.size) return this.warn('Seleccione al menos una categoría');
    const parents = this.groups.flatMap((group) => group.categories).filter((item) => this.selected(item));
    const parentsWithChildren = parents.filter((item) => this.children(item).length);
    for (const parent of parentsWithChildren) {
      if (!this.children(parent).some((child) => this.selected(child))) return this.warn('Debe seleccionar una subcategoría');
    }

    const selectionError = event60SelectionError(this.data.event.id, this.isTeam, this.selectedIds, this.groups.flatMap(g => g.categories));
    if (selectionError) return this.warn(selectionError);
    const max = this.data.event.maxCategoriesPerRegistration ?? 0;
    if (max > 0 && this.selectedIds.size > max)
      return this.warn(`El evento permite un máximo de ${max} categorías por deportista.`);
    return true;
  }

  private warn(key: string): false { this.snackBar.open(this.language.translate(key), undefined, { duration: 3500 }); return false; }
}
