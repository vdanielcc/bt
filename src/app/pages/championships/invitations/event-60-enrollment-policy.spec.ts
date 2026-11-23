import { event60SelectionError } from './event-60-enrollment-policy';

describe('Event 60 selection limits', () => {
  const categories = [1, 2, 3, 4, 5, 6].map(id => ({ id, modality: id <= 3 ? 'Kata' : 'Kumite' }));
  it('allows two categories of each individual modality', () => {
    expect(event60SelectionError(60, false, new Set([1, 2, 4, 5]), categories)).toBe('');
  });
  it('rejects a third category of either individual modality', () => {
    expect(event60SelectionError(60, false, new Set([1, 2, 3]), categories)).toContain('Kata');
    expect(event60SelectionError(60, false, new Set([4, 5, 6]), categories)).toContain('Kumite');
  });
  it('limits teams to one category and leaves other events unchanged', () => {
    expect(event60SelectionError(60, true, new Set([1]), categories)).toBe('');
    expect(event60SelectionError(60, true, new Set([1, 2]), categories)).toContain('equipo');
    expect(event60SelectionError(59, false, new Set([1, 2, 3]), categories)).toBe('');
  });
});
