import { N_PRO_HEADER, nProCsv } from './n-pro-csv';

describe('N-Pro CSV', () => {
  it('uses the exact columns, match number and category gender without repeating advancing competitors', () => {
    const athlete = { competitorId: 1, name: 'Amelia Cofre', academyName: 'Kenshokai' };
    const csv = nProCsv({ categoryCode: '73', categoryName: 'Kata 6 - 7 Años Femenino debutante', rounds: [
      { number: 2, matches: [{ matchNumber: 5, position: 1, top: athlete }] },
      { number: 1, matches: [{ matchNumber: 1, position: 1, top: athlete, bottom: { competitorId: 2, name: 'Otra participante' } }] }
    ] }, { gender: 'Female' });
    expect(csv.split('\r\n')[0]).toBe(N_PRO_HEADER);
    expect(csv).toContain('1;Amelia Cofre;Kenshokai;0;0;0;0;F;73;Kata 6 - 7 Años Femenino debutante\r\n');
    expect(csv).toContain('1;Otra participante;0;0;0;0;0;F;73;');
    expect(csv.split('Amelia Cofre').length).toBe(2);
  });

  it('keeps real teams with a bye and escapes CSV delimiters and quotes', () => {
    const csv = nProCsv({ rounds: [{ number: 1, matches: [{ matchNumber: 8, isBye: true,
      top: { competitorId: 3, name: 'Equipo; "A"', academyName: 'Club', weight: 75 },
      bottom: { name: 'BYE' }
    }] }] }, { gender: 'Male', code: '74', name: 'Kata equipo' });
    expect(csv).toContain('8;"Equipo; ""A""";Club;0;75;0;0;M;74;Kata equipo');
    expect(csv).not.toContain('BYE');
    expect(csv.trim().split('\r\n').length).toBe(2);
  });
});
