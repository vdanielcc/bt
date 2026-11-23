import { of, Subject, throwError } from 'rxjs';
import { acceptsCategoryEntry, AddCategoryCompetitorsDialogComponent } from './add-category-competitors-dialog.component';

describe('Add category competitors', () => {
  const female = { id: 10, nombres: 'Alumna', genero: 'Female', rol: 'Sportman' };
  const male = { id: 11, nombres: 'Alumno', genero: 'male', rol: 'Sportman' };
  const team = { id: 10, nombres: 'Equipo', rol: 'Team', genero: '-' };
  function setup(category = { id: 1, modalityId: 1, gender: 'Female' }) {
    const service = jasmine.createSpyObj('service', ['getAcademies', 'getAcademyStudents', 'getEventEnrollmentCategories', 'enroll', 'enrollTeam']);
    service.getAcademies.and.returnValue(of([{ id: 99, name: 'Dojo' }]));
    service.getAcademyStudents.and.returnValue(of([female, male, team]));
    service.getEventEnrollmentCategories.and.returnValue(of([{ id: 3, competitors: [{ studentId: 10 }] }]));
    service.enroll.and.returnValue(of({})); service.enrollTeam.and.returnValue(of({}));
    const dialog = { close: jasmine.createSpy(), disableClose: false };
    const component = new AddCategoryCompetitorsDialogComponent({ eventId: 32, category }, dialog as any, service);
    component.academyId = 99;
    return { component, service, dialog };
  }
  it('loads dojos and students within the organizer event', async () => {
    const { component, service } = setup();
    await component.loadAcademies();
    await component.loadStudents();
    expect(service.getAcademies).toHaveBeenCalledOnceWith(32);
    expect(service.getAcademyStudents).toHaveBeenCalledOnceWith(99, 32);
  });
  it('filters dojo names by words without accents or case sensitivity', () => {
    const { component } = setup();
    component.academies = [{ id: 1, name: 'Dojo Olímpico Norte' }, { Id: 2, Name: 'Dojo Sur' }];
    component.academySearch = 'norte olimpico';
    expect(component.filteredAcademies.map(item => component.id(item))).toEqual([1]);
    component.academySearch = 'SUR';
    expect(component.filteredAcademies.map(item => component.id(item))).toEqual([2]);
    component.academySearch = '';
    expect(component.filteredAcademies.length).toBe(2);
    expect(component.displayAcademy(2)).toBe('Dojo Sur');
  });
  it('clears entrants and ignores pending responses when editing the selected dojo text', async () => {
    const { component, service } = setup();
    const pending = new Subject<any[]>(); service.getAcademyStudents.and.returnValue(pending);
    component.selected.add(10);
    const first = component.loadStudents();
    component.searchAcademies('Otro dojo');
    expect(component.academyId).toBeNull();
    expect(component.selected.size).toBe(0);
    pending.next([female]); pending.complete(); await first;
    expect(component.students).toEqual([]);
    expect(component.loadingStudents).toBeFalse();
    await component.save();
    expect(service.enroll).not.toHaveBeenCalled();
  });
  it('filters gender without case sensitivity and gives team categories precedence', () => {
    expect([female, male, team].filter(item => acceptsCategoryEntry({ gender: 'female' }, item))).toEqual([female]);
    expect([female, male, team].filter(item => acceptsCategoryEntry({ gender: 'Male' }, item))).toEqual([male]);
    expect([female, male, team].filter(item => acceptsCategoryEntry({ gender: 'Mixto' }, item))).toEqual([female, male]);
    expect([female, male, team].filter(item => acceptsCategoryEntry({ modalityId: 4, gender: 'Female' }, item))).toEqual([team]);
  });
  it('adds selected students using the selected dojo and preserves existing categories', async () => {
    const { component, service, dialog } = setup(); await component.loadStudents();
    expect(component.students).toEqual([female]);
    component.toggle(female, true); await component.save();
    expect(service.enroll).toHaveBeenCalledOnceWith(32, 10, [3, 1], 99);
    expect(component.addedCount).toBe(1); expect(dialog.close).toHaveBeenCalled();
  });
  it('uses the team endpoint for team categories', async () => {
    const { component, service } = setup({ id: 1, modalityId: 6, gender: 'Mixto' });
    await component.loadStudents(); component.toggle(team, true); await component.save();
    expect(service.enrollTeam).toHaveBeenCalledOnceWith(32, 10, [1]);
    expect(service.enroll).not.toHaveBeenCalled();
  });
  it('disables existing entrants and avoids duplicates enrolled after opening the dialog', async () => {
    const { component, service } = setup(); await component.loadStudents(); component.toggle(female, true);
    service.getEventEnrollmentCategories.and.returnValue(of([{ id: 1, competitors: [{ studentId: 10 }] }]));
    await component.save(); expect(service.enroll).not.toHaveBeenCalled();
    await component.loadStudents(); expect(component.enrolled.has(10)).toBeTrue();
    component.toggle(female, true); expect(component.selected.size).toBe(0);
  });
  it('retains only failed selections on partial success and does not repeat successful additions', async () => {
    const { component, service, dialog } = setup({ id: 1, modalityId: 1, gender: 'Mixto' });
    await component.loadStudents(); component.toggle(female, true); component.toggle(male, true);
    service.enroll.and.callFake((_event: number, id: number) => id === 11 ? throwError(() => new Error('Error de inscripción')) : of({}));
    await component.save();
    expect(component.addedCount).toBe(1); expect([...component.selected]).toEqual([11]);
    expect(component.failures.length).toBe(1); expect(dialog.close).not.toHaveBeenCalled();
    service.enroll.and.returnValue(of({})); await component.save();
    expect(service.enroll.calls.allArgs().filter((args: unknown[]) => args[1] === 10).length).toBe(1);
    expect(component.addedCount).toBe(2); expect(dialog.close).toHaveBeenCalled();
  });
  it('ignores late responses when switching dojos and clears previous selections', async () => {
    const { component, service } = setup();
    const pending = new Subject<any[]>(); service.getAcademyStudents.and.returnValue(pending);
    const first = component.loadStudents();
    component.academyId = 100; service.getAcademyStudents.and.returnValue(of([]));
    await component.loadStudents(); pending.next([female]); pending.complete(); await first;
    expect(component.students).toEqual([]); expect(component.selected.size).toBe(0);
  });
});
