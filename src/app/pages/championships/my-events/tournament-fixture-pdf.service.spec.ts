import { of, throwError } from 'rxjs';
import { jsPDF } from 'jspdf';
import { TournamentFixturePdfService } from './tournament-fixture-pdf.service';

describe('Tournament PDF download', () => {
  let service: TournamentFixturePdfService;
  let events: any;
  let academies: any;
  let save: jasmine.Spy;
  beforeEach(() => {
    events = {
      getEventCategories: jasmine.createSpy().and.returnValue(of([
        { id: 2, code: 'KU 1', modalityId: 2, competitorCount: 16 },
        { id: 1, code: 'KA 1', modalityId: 1, competitorCount: 1 },
        { id: 3, modalityId: 1, competitorCount: 0 }
      ])),
      getLatestFixture: jasmine.createSpy().and.returnValue(of({ version: 2, rounds: [{ number: 1, name: 'FINAL', matches: [{ id: 1, top: {}, bottom: {} }] }] })),
      refreshFixture: jasmine.createSpy(), saveFixtureVersion: jasmine.createSpy()
    };
    academies = { getAcademy: jasmine.createSpy().and.returnValue(of({ logo: 'logo.png' })), logoUrl: () => 'https://example.com/logo.png' };
    service = new TournamentFixturePdfService({ get: () => of([{ id: 1, name: 'Kata' }, { id: 2, name: 'Kumite' }]) } as any, events, academies);
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 2;
    spyOn<any>(service, 'imageData').and.returnValue(Promise.resolve(canvas.toDataURL('image/png')));
    // API plugins are attached to each jsPDF instance, so this avoids a real download.
    save = jasmine.createSpy('save');
    (jsPDF.API as any).save = save;
  });
  afterEach(() => { delete (jsPDF.API as any).save; });

  it('reads each eligible latest version in order and uses the organizing academy', async () => {
    await service.download({ id: 35, name: 'Torneo', academyId: 72 } as any, () => {});
    expect(academies.getAcademy).toHaveBeenCalledWith(72);
    expect(events.getLatestFixture.calls.allArgs()).toEqual([[35, 1], [35, 2]]);
    expect(events.refreshFixture).not.toHaveBeenCalled();
    expect(events.saveFixtureVersion).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledWith('llaves-torneo-35.pdf');
  });

  it('does not download a partial tournament if one category fails', async () => {
    events.getLatestFixture.and.returnValue(throwError(() => new Error('offline')));
    await expectAsync(service.download({ id: 35, name: 'Torneo', academyId: 72 } as any, () => {})).toBeRejectedWithError(/KA 1/);
    expect(save).not.toHaveBeenCalled();
  });
  it('exports the selected saved Kata JKA fixture without generating or saving encounters', async () => {
    const fixture = { fixtureType: 'KATAJKA', version: 2, rounds: [{ number: 1, matches: [{ id: 1, position: 1, matchNumber: 1, top: { name: 'Ana' }, bottom: {} }] }] };
    await service.downloadFixture({ id: 35, name: 'Torneo', academyId: 72 } as any, { id: 1, code: 'KA1', name: 'Kata' }, fixture);
    expect(save).toHaveBeenCalledWith('llaves-evento-35-categoria-1.pdf');
    expect(events.getLatestFixture).not.toHaveBeenCalled();
    expect(events.refreshFixture).not.toHaveBeenCalled();
    expect(events.saveFixtureVersion).not.toHaveBeenCalled();
  });
});
