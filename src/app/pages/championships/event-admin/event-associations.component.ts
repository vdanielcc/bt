import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription, finalize } from 'rxjs';
import { EventAssociation, EventAssociationsService } from './event-associations.service';

@Component({
  standalone: true, selector: 'bte-event-associations', templateUrl: './event-associations.component.html',
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatProgressSpinnerModule, MatSnackBarModule]
})
export class EventAssociationsComponent implements OnDestroy {
  private readonly service = inject(EventAssociationsService);
  private readonly snack = inject(MatSnackBar);
  private readonly subscriptions = new Subscription();
  readonly form = inject(FormBuilder).nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(20), Validators.pattern(/^[A-Za-z0-9_-]+$/)]],
    description: ['', [Validators.required, Validators.maxLength(255)]]
  });
  associations: EventAssociation[] = [];
  selectedCode = '';
  loading = false;
  saving = false;
  error = '';
  constructor() { this.load(); }
  ngOnDestroy(): void { this.subscriptions.unsubscribe(); }
  load(): void {
    this.loading = true; this.error = '';
    this.subscriptions.add(this.service.list().pipe(finalize(() => this.loading = false)).subscribe({
      next: values => this.associations = values,
      error: error => this.error = error.error?.message || 'No se pudieron cargar las asociaciones deportivas.'
    }));
  }
  edit(value?: EventAssociation): void {
    if (this.saving) return;
    this.selectedCode = value?.code || '';
    this.form.reset(value || { code: '', description: '' });
    this.error = '';
  }
  save(): void {
    if (this.saving) return;
    const value = this.form.getRawValue();
    value.code = value.code.trim().toUpperCase(); value.description = value.description.trim();
    this.form.patchValue(value);
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true; this.error = ''; this.form.disable();
    const request = this.selectedCode ? this.service.update(this.selectedCode, value) : this.service.create(value);
    this.subscriptions.add(request.pipe(finalize(() => { this.saving = false; this.form.enable(); })).subscribe({
      next: () => {
        this.snack.open('Asociación deportiva guardada.', 'Cerrar', { duration: 3500 });
        this.saving = false; this.edit(); this.load();
      },
      error: error => this.error = error.error?.message || 'No se pudo guardar la asociación deportiva.'
    }));
  }
}
