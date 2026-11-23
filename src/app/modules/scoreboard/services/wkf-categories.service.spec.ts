import { of, throwError } from 'rxjs';
import { WkfCategoriesService } from './wkf-categories.service';

describe('WkfCategoriesService', () => {
  let events: any, api: any, service: WkfCategoriesService;
  beforeEach(() => {
    events = {
      getEventCategories: () => of([
        { id: 2, name: 'Primera', modalityName: 'KUMITE', fixtureVersion: 1 },
        { id: 3, name: 'Segunda', modalityName: 'KATA', fixtureVersion: 1 },
        { id: 4, name: 'Otra área', modalityName: 'KUMITE', fixtureVersion: 1 }
      ]),
      getEventSchedule: () => of({ areas: [
        { areaNumber: 1, items: [{ categoryId: 3, sequence: 2 }, { type: 'break', sequence: 0 }, { categoryId: 2, sequence: 1 }] },
        { areaNumber: 2, items: [{ categoryId: 4, sequence: 1 }] }
      ] })
    };
    api = { getFixtureContext: jasmine.createSpy().and.returnValue(of({ matches: [{ status: 'CONFIRMED' }] })) };
    service = new WkfCategoriesService(events, api);
  });
  it('respeta el tatami y el orden del cronograma, sin incluir pausas ni otras áreas', async () => {
    const options = await service.load(1, 1);
    expect(options.map(option => option.id)).toEqual([2, 3]);
    expect(options.every(option => option.completed && option.verified)).toBeTrue();
    expect(api.getFixtureContext.calls.count()).toBe(2);
  });
  it('no marca finalizadas las categorías con encuentros pendientes, incluso si hay un ganador propuesto', async () => {
    api.getFixtureContext.and.returnValue(of({ matches: [{ status: 'CONFIRMED' }, { status: 'FINISHED' }] }));
    const options = await service.load(1, 1);
    expect(options.some(option => option.completed)).toBeFalse();
  });
  it('no confunde una llave vacía o una falla de API con una categoría finalizada', async () => {
    api.getFixtureContext.and.callFake((_event: number, _area: number, category: number) => category === 2
      ? of({ matches: [] }) : throwError(() => new Error('Sin conexión')));
    const options = await service.load(1, 1);
    expect(options.some(option => option.completed)).toBeFalse();
    expect(options[1].verified).toBeFalse();
  });
});
