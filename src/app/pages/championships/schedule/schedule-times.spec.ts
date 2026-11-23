import { scheduleStart, scheduleTimes } from './schedule-times';
import { ScheduleComponent } from './schedule.component';

describe('Horas del cronograma', () => {
  it('acumula categorías y recesos desde la hora local del evento', () => {
    expect(scheduleTimes('2026-10-03T09:30:00', [30, 15, 45].map(durationMinutes => ({ durationMinutes })))).toEqual([
      { start: '09:30', end: '10:00' }, { start: '10:00', end: '10:15' }, { start: '10:15', end: '11:00' }
    ]);
    expect(scheduleStart('2026-10-03T12:30:00Z')?.toFormat('HH:mm')).toBe('09:30');
  });

  it('no inventa horarios cuando falta inicio o duración', () => {
    expect(scheduleTimes(undefined, [{ durationMinutes: 10 }])).toEqual([{ start: 'Por definir', end: 'Por definir' }]);
    expect(scheduleTimes('2026-10-03T09:30:00', [{ durationMinutes: null }, { durationMinutes: 10 }])).toEqual([
      { start: '09:30', end: 'Por definir' }, { start: 'Por definir', end: 'Por definir' }
    ]);
  });

  it('indica el día siguiente y conserva segundos de duraciones fraccionarias', () => {
    expect(scheduleTimes('2026-10-03T23:50:00', [{ durationMinutes: 20 }, { durationMinutes: 0.5 }])).toEqual([
      { start: '23:50', end: '00:10 (+1 d)' }, { start: '00:10 (+1 d)', end: '00:10:30 (+1 d)' }
    ]);
  });

  it('recalcula horas al reordenar y cada área comienza a la hora del evento', () => {
    const c = new ScheduleComponent({ getCurrentUser: () => ({ rol: 'admin' }) } as any, {} as any, {} as any, {} as any, { markForCheck: () => {} } as any, {} as any);
    c.events = [{ id: 32, eventDateStart: '2026-10-03T09:30:00' } as any]; c.selectedEventId = 32;
    const items: any[] = [{ key: 'a', durationMinutes: 30 }, { key: 'b', durationMinutes: 15 }];
    const area = { number: 1, items };
    // The card shows the start time; verify the end of the interval separately.
    expect(c.itemTime(area, 1)).toBe('10:00');
    expect(scheduleTimes(c.events[0].eventDateStart, items)[1].end).toBe('10:15');
    const container = { data: items };
    c.drop({ previousContainer: container, container, previousIndex: 0, currentIndex: 1 } as any);
    expect(c.itemTime(area, 1)).toBe('09:45');
    expect(scheduleTimes(c.events[0].eventDateStart, items)[1].end).toBe('10:15');
    expect(c.itemTime({ number: 2, items: [{ ...items[0] }] }, 0)).toBe('09:30');
  });
});
