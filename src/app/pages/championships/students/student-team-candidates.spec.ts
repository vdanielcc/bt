import { HttpClient } from '@angular/common/http';
import { FormBuilder } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { StudentsService } from './students.service';
import { StudentDialogComponent } from './student-dialog.component';
import { AcademyStudent } from './students.models';

describe('Team candidates from the academy API', () => {
  let component: StudentDialogComponent;
  beforeEach(() => {
    const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
    http.get.and.returnValue(of({ data: [
      { id: 1, nombres: 'Alumno', apellidos: 'Uno', rol: 'Sportman', genero: 'Male' },
      { id: 2, nombres: 'Alumna', apellidos: 'Dos', rol: 'Sportman', genero: 'Female' },
      { Id: 3, firstName: 'Alumno', lastName: 'Tres', Rol: 'D', Genero: 'M' },
      { id: 4, firstName: 'Alumna', lastName: 'Cuatro', rol: 'D', gender: 'F' },
      { id: 5, nombres: 'Coach', rol: 'Coach', genero: 'Male' },
      { id: 6, nombres: 'Equipo', rol: 'Team', genero: '-' }
    ] }));
    const service = new StudentsService(http, { getCurrentUser: () => ({ academieId: 9 }) } as AuthService);
    let students: AcademyStudent[] = [];
    service.getStudents().subscribe(result => students = result);
    component = new StudentDialogComponent(new FormBuilder(), service,
      { translate: (value: string) => value } as LanguageService,
      jasmine.createSpyObj<MatDialogRef<StudentDialogComponent>>('Dialog', ['close']),
      { mode: 'team', students });
  });

  it('shows male athletes from genero and Genero without including coaches or teams', () => {
    component.teamForm.controls.modality.setValue('Kata Equipo Masculino');
    expect(component.teamCandidates.map(student => student.id)).toEqual([1, 3]);
  });

  it('shows female athletes and retains support for gender', () => {
    component.teamForm.controls.modality.setValue('Kumite Equipo Femenino');
    expect(component.teamCandidates.map(student => student.id)).toEqual([2, 4]);
  });

  it('shows all athletes for a mixed team', () => {
    component.teamForm.controls.modality.setValue('Kata Equipo Mixto');
    expect(component.teamCandidates.map(student => student.id)).toEqual([1, 2, 3, 4]);
  });
});
