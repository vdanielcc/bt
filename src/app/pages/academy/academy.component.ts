import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize, map, switchMap } from 'rxjs';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { AuthService } from '../../core/auth/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AcademyDetail, AcademyOption, AcademyService } from './academy.service';

@Component({ selector: 'bte-academy', standalone: true, templateUrl: './academy.component.html',
  styleUrls: ['./academy.component.scss'], changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule,
    MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSelectModule, MatSnackBarModule,
    VexBreadcrumbsComponent, VexPageLayoutComponent, VexPageLayoutContentDirective,
    VexPageLayoutHeaderDirective, TranslatePipe] })
export class AcademyComponent implements OnInit {
  @Input() embedded = false;
  readonly maxLogoSize = 1024 * 1024;
  academyId = 0; loading = true; saving = false; loadError = false;
  representatives: AcademyOption[] = []; associations: AcademyOption[] = []; communes: AcademyOption[] = [];
  logoPreview = '';
  readingLogo = false;
  form = this.fb.group({ name: ['', Validators.required], website: ['', Validators.pattern(/^https?:\/\/.+/i)],
    address: ['', Validators.required], phoneNumber: [''], logo: [''], logoBase64: [''],
    legalRepresentativeId: [0, [Validators.required, Validators.min(1)]],
    sportsAssociationId: [0, [Validators.required, Validators.min(1)]],
    communeId: [0, [Validators.required, Validators.min(1)]] });

  constructor(private fb: FormBuilder, private service: AcademyService, private auth: AuthService,
    private language: LanguageService, private snack: MatSnackBar, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.academyId = this.auth.getCurrentUser()?.academieId ?? 0; this.load(); }
  load(): void {
    if (!this.academyId) { this.loading = false; this.loadError = true; return; }
    this.loading = true; this.loadError = false;
    this.service.getAcademy(this.academyId).pipe(
      switchMap(academy => this.service.getOptions(
        this.auth.getCurrentUser()?.rol === 'academy_admin' ? academy.legalRepresentativeId : undefined
      ).pipe(map(options => ({ academy, options }))))
    )
      .pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); }))
      .subscribe({ next: ({ academy, options }) => {
        this.representatives = options.representatives; this.associations = options.associations; this.communes = options.communes;
        this.form.reset({ ...academy, logoBase64: '' }); this.logoPreview = this.service.logoUrl(academy);
      }, error: () => this.loadError = true });
  }
  onLogo(event: Event): void {
    if (this.saving || this.readingLogo) return;
    const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > this.maxLogoSize) {
      input.value = ''; this.snack.open(this.language.translate(file.size > this.maxLogoSize ? 'El logo no puede superar 1 MB.' : 'El logo debe ser JPG, JPEG o PNG.'), undefined, { duration: 4000 }); return;
    }
    this.readingLogo = true;
    const reader = new FileReader(); reader.onload = () => {
      const dataUrl = String(reader.result); this.logoPreview = dataUrl;
      this.form.patchValue({ logoBase64: dataUrl.split(',')[1] });
      this.form.markAsDirty(); this.readingLogo = false; input.value = ''; this.cdr.markForCheck();
    };
    reader.onerror = () => {
      this.readingLogo = false; input.value = '';
      this.snack.open('No se pudo leer la imagen. Inténtalo nuevamente.', undefined, { duration: 4000 });
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }
  save(): void {
    if (this.saving || this.readingLogo || this.loading || this.loadError) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const payload = { id: this.academyId, ...this.form.getRawValue() } as AcademyDetail;
    this.service.updateAcademy(this.academyId, payload).pipe(finalize(() => { this.saving = false; this.cdr.markForCheck(); }))
      .subscribe({ next: () => {
        this.snack.open(this.language.translate('Academia actualizada correctamente.'), undefined, { duration: 3500 });
        this.load();
      },
        error: () => this.snack.open(this.language.translate('No se pudo actualizar la academia.'), undefined, { duration: 3500 }) });
  }
}
