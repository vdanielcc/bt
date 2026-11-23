import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, Subject, catchError, of, switchMap } from 'rxjs';
import { VexBreadcrumbsComponent } from '@vex/components/vex-breadcrumbs/vex-breadcrumbs.component';
import { VexPageLayoutComponent } from '@vex/components/vex-page-layout/vex-page-layout.component';
import { VexPageLayoutContentDirective } from '@vex/components/vex-page-layout/vex-page-layout-content.directive';
import { VexPageLayoutHeaderDirective } from '@vex/components/vex-page-layout/vex-page-layout-header.directive';
import { AcademyClassListItem } from '../models/academy-management.models';
import { ClassManagementService } from '../services/class-management.service';
import { ClassEditorComponent } from './class-editor.component';

@Component({
  standalone: true, selector: 'bte-class-form-page',
  imports: [CommonModule, MatButtonModule, MatProgressSpinnerModule, ClassEditorComponent, VexBreadcrumbsComponent, VexPageLayoutComponent, VexPageLayoutContentDirective, VexPageLayoutHeaderDirective],
  template: `<vex-page-layout><vex-page-layout-header class="pb-16"><div class="px-6">
    <vex-breadcrumbs [crumbs]="crumbs" /><h1 class="title mt-2">{{ classId ? 'Editar clase' : 'Nueva clase' }}</h1>
  </div></vex-page-layout-header><vex-page-layout-content class="-mt-6">
    <div class="card"><div *ngIf="loading" class="p-12 flex justify-center"><mat-spinner diameter="42" /></div>
      <div *ngIf="!loading && error" role="alert" class="p-8">{{ error }} <button mat-button (click)="load()">Reintentar</button></div>
      <bte-class-editor *ngIf="!loading && !error" [academyId]="academyId" [course]="course" (saved)="onSaved($event)" (cancelled)="cancel()" />
    </div></vex-page-layout-content></vex-page-layout>`
})
export class ClassFormPageComponent implements OnInit {
  private route = inject(ActivatedRoute); private service = inject(ClassManagementService);
  private router = inject(Router); private snack = inject(MatSnackBar); private destroyRef = inject(DestroyRef);
  private reload = new Subject<void>();
  academyId = 0; classId = 0; course?: AcademyClassListItem; loading = true; error = '';
  get crumbs(): string[] { return ['Academia', 'Gestión de clases', 'Clases', ...(this.classId ? [this.course?.name || 'Clase', 'Editar'] : ['Nueva clase'])]; }
  ngOnInit(): void {
    this.reload.pipe(switchMap(() => {
      this.loading = true; this.error = ''; this.course = undefined;
      const request: Observable<AcademyClassListItem | null> = this.classId ? this.service.getClass(this.classId) : of(null);
      return request.pipe(catchError(error => { this.error = error.error?.message || 'No fue posible cargar la clase.'; return of(null); }));
    }), takeUntilDestroyed(this.destroyRef)).subscribe(course => {
      if (course && course.academyId !== this.academyId) this.error = 'La clase no pertenece a esta academia.';
      else if (course) this.course = course;
      this.loading = false;
    });
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.academyId = Number(params.get('academyId')); this.classId = Number(params.get('classId')) || 0; this.load();
    });
  }
  load(): void { this.reload.next(); }
  onSaved(course: AcademyClassListItem): void {
    this.snack.open(this.classId ? 'Clase actualizada correctamente.' : 'Clase creada correctamente.', 'Cerrar', { duration: 3500 });
    void this.router.navigate(['/academies', this.academyId, 'classes', course.id]);
  }
  cancel(): void { void this.router.navigate(this.classId ? ['/academies', this.academyId, 'classes', this.classId] : ['/academies', this.academyId, 'classes']); }
}
