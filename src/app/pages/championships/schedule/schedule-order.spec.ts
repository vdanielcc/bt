import { isScheduleKumite, orderScheduleCategories } from './schedule-order';

describe('Schedule generation order', () => {
  const category = (id: number, modalityId: number, ageStart = 8, name = 'Novicio') => ({ id, modalityId, ageStart, name });
  it('groups individual and team modalities before distributing to areas', () => {
    const input = [category(5, 6), category(4, 2), category(3, 5), category(2, 4), category(1, 1)];
    expect(orderScheduleCategories(input).map(c => c.id)).toEqual([1, 2, 3, 4, 5]);
    expect(input.map(c => c.id)).toEqual([5, 4, 3, 2, 1]);
  });
  it('uses the modality linked by id rather than category name', () => {
    const input = [
      { ...category(1, 90, 5, 'Kata novicio'), modalityName: 'Kumite Equipo Femenino' },
      { ...category(2, 91, 20, 'Kumite oficial'), modalityName: 'Kata Individual' }
    ];
    expect(orderScheduleCategories(input).map(c => c.id)).toEqual([2, 1]);
  });
  it('orders levels first and ages ascending within each level', () => {
    for (const modalityId of [1, 4, 2, 6]) {
      const input = [category(5, modalityId, 10), category(4, modalityId, 5, 'OFICIALES'),
        category(3, modalityId, 6, 'Avanzados'), category(2, modalityId, 7, 'Intermedios'),
        category(1, modalityId, 8, 'Novicios'), category(6, modalityId, 12, 'Intermedios')];
      expect(orderScheduleCategories(input).map(c => c.id)).toEqual([1, 5, 2, 6, 3, 4]);
    }
  });
  it('handles API casing, missing ages and numeric category codes', () => {
    const input = [
      { Id: 3, ModalityId: 1, Name: 'Novicio', Code: 'KA1' },
      { Id: 2, ModalityId: 1, AgeStart: 0, Name: 'Novicio', Code: 'KA10' },
      { Id: 1, ModalityId: 1, AgeStart: 0, Name: 'Novicio', Code: 'KA2' }
    ];
    expect(orderScheduleCategories(input).map(c => c.Id)).toEqual([1, 2, 3]);
  });
  it('matches production modality ids for individual and team kata and kumite', () => {
    for (const modalityId of [1, 4, 5, 8, 9, 17]) expect(isScheduleKumite({ modalityId })).toEqual(false);
    for (const modalityId of [2, 6, 7, 10, 11]) expect(isScheduleKumite({ modalityId })).toEqual(true);
    expect(isScheduleKumite({ modalityId: 6, modalityName: 'Kata Equipo' })).toEqual(false);
  });
  it('keeps para-karate and unrecognized modalities in the schedule', () => {
    expect(orderScheduleCategories([category(3, 99), category(2, 3), category(1, 1)]).map(c => c.id)).toEqual([1, 2, 3]);
  });
});
