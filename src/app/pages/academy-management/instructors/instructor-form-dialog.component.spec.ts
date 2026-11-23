import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatAutocompleteHarness } from '@angular/material/autocomplete/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { AcademyManagementService } from '../services/academy-management.service';
import { InstructorFormDialogComponent } from './instructor-form-dialog.component';
import { instructorToday, oneMonthBefore } from './instructor-date-rules';

describe('InstructorFormDialogComponent', () => {
  const persons = [
    { id: 7, firstName: 'Ana', lastName: 'Álvarez', rol: 'Coach' },
    { id: 8, firstName: 'Camila', lastName: 'Pérez', rol: 'Sportman' }
  ];

  function setup() {
    const api = jasmine.createSpyObj('AcademyManagementService', [
      'getInstructorCandidates',
      'createInstructor'
    ]);
    api.getInstructorCandidates.and.returnValue(of(persons));
    api.createInstructor.and.returnValue(of({ id: 10 }));
    TestBed.configureTestingModule({
      imports: [InstructorFormDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { academyId: 1 } },
        { provide: AcademyManagementService, useValue: api },
        {
          provide: MatDialogRef,
          useValue: jasmine.createSpyObj('MatDialogRef', ['close'])
        },
        {
          provide: MatSnackBar,
          useValue: jasmine.createSpyObj('MatSnackBar', ['open'])
        }
      ]
    });
    const fixture = TestBed.createComponent(InstructorFormDialogComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, api };
  }

  it('searches the academy candidates remotely and filters accents and case', async () => {
    const { fixture, api } = setup();
    const input = await TestbedHarnessEnvironment.loader(fixture).getHarness(
      MatAutocompleteHarness
    );
    await input.enterText('ALV');
    expect(
      await Promise.all(
        (await input.getOptions()).map((option) => option.getText())
      )
    ).toEqual(['Ana Álvarez']);
    await input.clear();
    await input.enterText('pé');
    expect(
      await Promise.all(
        (await input.getOptions()).map((option) => option.getText())
      )
    ).toEqual(['Camila Pérez']);
    expect(api.getInstructorCandidates).toHaveBeenCalledWith(1, 'ALV');
    expect(api.getInstructorCandidates).toHaveBeenCalledWith(1, 'pé');
  });

  it('clears the selected person when their displayed name is edited and rejects free text', async () => {
    const { fixture, component, api } = setup();
    const input = await TestbedHarnessEnvironment.loader(fixture).getHarness(
      MatAutocompleteHarness
    );
    await input.enterText('ana');
    await input.selectOption({ text: 'Ana Álvarez' });
    expect(component.form.controls.personId.value).toBe(7);
    await input.clear();
    await input.enterText('otra persona');
    expect(component.form.controls.personId.value).toBe(0);
    component.save();
    expect(api.createInstructor).not.toHaveBeenCalled();
  });

  it('saves a selected person with a null end date', async () => {
    const { fixture, component, api } = setup();
    const input = await TestbedHarnessEnvironment.loader(fixture).getHarness(
      MatAutocompleteHarness
    );
    await input.enterText('ana');
    await input.selectOption({ text: 'Ana Álvarez' });
    component.save();
    expect(api.createInstructor).toHaveBeenCalledWith(
      1,
      jasmine.objectContaining({ personId: 7, endDate: null })
    );
  });

  it('rejects end dates equal to or earlier than the start and allows a later date or null', () => {
    const { component } = setup();
    const start = component.today;
    component.form.controls.endDate.setValue(new Date(start));
    expect(component.form.hasError('endNotAfterStart')).toBeTrue();
    component.form.controls.endDate.setValue(
      new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1)
    );
    expect(component.form.hasError('endNotAfterStart')).toBeTrue();
    component.form.controls.endDate.setValue(
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1)
    );
    expect(component.form.hasError('endNotAfterStart')).toBeFalse();
    component.form.controls.endDate.setValue(null);
    expect(component.form.hasError('endNotAfterStart')).toBeFalse();
  });

  it('accepts exactly one calendar month ago and rejects the previous day', () => {
    const { component } = setup();
    const minimum = component.minimumStartDate;
    component.form.controls.startDate.setValue(minimum);
    expect(
      component.form.controls.startDate.hasError('startTooOld')
    ).toBeFalse();
    component.form.controls.startDate.setValue(
      new Date(minimum.getFullYear(), minimum.getMonth(), minimum.getDate() - 1)
    );
    expect(
      component.form.controls.startDate.hasError('startTooOld')
    ).toBeTrue();
  });

  it('revalidates the end date when the start date changes', () => {
    const { component } = setup();
    const start = component.today;
    const end = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + 1
    );
    component.form.controls.endDate.setValue(end);
    component.form.controls.startDate.setValue(end);
    expect(component.form.hasError('endNotAfterStart')).toBeTrue();
    component.form.markAllAsTouched();
    expect(
      component.endDateErrors.isErrorState(
        component.form.controls.endDate,
        null
      )
    ).toBeTrue();
  });

  it('uses the Santiago day and clamps the month boundary at the end of February', () => {
    expect(instructorToday(new Date('2026-10-05T01:00:00Z'))).toEqual(
      new Date(2026, 9, 4)
    );
    expect(oneMonthBefore(new Date(2026, 2, 31))).toEqual(
      new Date(2026, 1, 28)
    );
    expect(oneMonthBefore(new Date(2024, 2, 31))).toEqual(
      new Date(2024, 1, 29)
    );
  });
});
