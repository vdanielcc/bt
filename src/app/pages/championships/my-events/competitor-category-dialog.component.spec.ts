import { of, Subject } from 'rxjs';
import { CompetitorCategoryDialogComponent, enrolledCategoryIds, transferCategoryIds } from './competitor-category-dialog.component';

describe('Competitor category actions', () => {
  const source = { id: 1, modalityId: 2, code: 'KU1', name: 'Kumite' };
  const categories = [source, { id: 2, modalityId: 2 }, { id: 3, modalityId: 1 }, { id: 4, modalityId: 2 }];
  const roster = [{ id: 1, competitors: [{ studentId: 10 }] }, { id: 3, competitors: [{ studentId: 10 }] }];
  function setup(action: 'remove' | 'move' = 'move') {
    const service = jasmine.createSpyObj('service', ['getCompetitor', 'getEventEnrollmentCategories', 'getEligibleCategories', 'enroll', 'enrollTeam']);
    service.getCompetitor.and.returnValue(of({ id: 100, eventId: 32, studentId: 10, academyId: 99 }));
    service.getEventEnrollmentCategories.and.returnValue(of(roster));
    service.getEligibleCategories.and.returnValue(of([{ id: 1 }, { id: 2 }, { id: 3 }]));
    service.enroll.and.returnValue(of({})); service.enrollTeam.and.returnValue(of({}));
    const dialog = { close: jasmine.createSpy(), disableClose: false };
    const component = new CompetitorCategoryDialogComponent({ eventId: 32, competitorId: 100, name: 'Deportista', category: source, categories, action }, dialog as any, service);
    return { component, service, dialog };
  }
  it('preserves unrelated categories when removing or moving', () => {
    expect(transferCategoryIds([1, 3, 7], 1)).toEqual([3, 7]);
    expect(transferCategoryIds([1, 3, 7], 1, 2)).toEqual([3, 7, 2]);
    expect(transferCategoryIds([1], 1)).toEqual([]);
    expect(() => transferCategoryIds([1, 3], 1, 3)).toThrow();
    expect(() => transferCategoryIds([3], 1)).toThrow();
  });
  it('offers only eligible destinations in the same modality that are not already enrolled', async () => {
    const { component, service } = setup(); await component.load();
    expect(component.targets.map(item => item.id)).toEqual([2]);
    expect(service.getEligibleCategories).toHaveBeenCalledWith(32, 10, 'Sportman');
  });
  it('moves using the entrant academy and preserves even categories not returned as eligible', async () => {
    const { component, service, dialog } = setup(); await component.load();
    component.targetId = 2; await component.save();
    expect(service.enroll).toHaveBeenCalledOnceWith(32, 10, [3, 2], 99);
    expect(dialog.close).toHaveBeenCalledWith({ sourceId: 1, targetId: 2 });
  });
  it('removes only the source, including when it is the last category', async () => {
    const { component, service } = setup('remove');
    service.getEventEnrollmentCategories.and.returnValue(of([roster[0]]));
    await component.load(); await component.save();
    expect(service.enroll).toHaveBeenCalledOnceWith(32, 10, [], 99);
    expect(service.getEligibleCategories).not.toHaveBeenCalled();
  });
  it('rechecks the full roster before saving and preserves new unrelated enrollments', async () => {
    const { component, service } = setup(); await component.load(); component.targetId = 2;
    service.getEventEnrollmentCategories.and.returnValue(of([...roster, { id: 7, competitors: [{ studentId: 10 }] }]));
    await component.save();
    expect(service.enroll).toHaveBeenCalledOnceWith(32, 10, [3, 7, 2], 99);
  });
  it('does not submit if source enrollment disappeared or destination is no longer eligible', async () => {
    const { component, service, dialog } = setup(); await component.load(); component.targetId = 2;
    service.getEligibleCategories.and.returnValue(of([])); await component.save();
    expect(service.enroll).not.toHaveBeenCalled(); expect(dialog.close).not.toHaveBeenCalled();
    service.getEligibleCategories.and.returnValue(of([{ id: 2 }]));
    service.getEventEnrollmentCategories.and.returnValue(of([roster[1]])); await component.save();
    expect(service.enroll).not.toHaveBeenCalled();
  });
  it('supports team entries without confusing their IDs with athlete IDs', async () => {
    const { component, service } = setup('remove');
    service.getCompetitor.and.returnValue(of({ id: 100, eventId: 32, teamId: 10, academyId: 99 }));
    service.getEventEnrollmentCategories.and.returnValue(of([{ id: 1, competitors: [{ teamId: 10 }] }, roster[1]]));
    await component.load(); await component.save();
    expect(service.enrollTeam).toHaveBeenCalledOnceWith(32, 10, []);
    expect(enrolledCategoryIds(roster, { teamId: 10 })).toEqual([]);
  });
  it('prevents duplicate submissions and leaves the dialog open after a server failure', async () => {
    const { component, service, dialog } = setup('remove'); await component.load();
    const pending = new Subject<any>(); service.enroll.and.returnValue(pending);
    const saving = component.save(); await Promise.resolve(); await component.save();
    expect(service.enroll).toHaveBeenCalledTimes(1);
    pending.error(new Error('No se puede modificar esta inscripción.')); await saving;
    expect(component.saving).toBeFalse(); expect(dialog.disableClose).toBeFalse();
    expect(dialog.close).not.toHaveBeenCalled(); expect(component.error).toContain('No se puede modificar');
  });
});
