import { of, throwError } from 'rxjs';
import { EventInvitationsService } from './event-invitations.service';

describe('Invitation category competitors for academy_admin', () => {
  const auth = { getCurrentUser: () => ({ rol: 'academy_admin', academieId: 7 }) } as any;
  it('uses the authorized category read endpoint and maps the API names', () => {
    const http = jasmine.createSpyObj('HttpClient', ['get']);
    http.get.and.callFake((url: string, options: any) => {
      if (url.endsWith('/by-event')) return of({ data: [{ id: 1 }, { id: 2 }] });
      expect(url).toContain('/Categories/by-category');
      expect(options.params.eventId).toBe(45);
      return of({ data: { competitors: options.params.categoryId === 1
        ? [{ nombre: 'Ana Perez', academia: 'Academia A' }] : [] } });
    });
    let result: any[] = [];
    new EventInvitationsService(http, auth).getCategoriesWithCompetitors(45).subscribe(value => result = value);
    expect(result.length).toBe(2);
    expect(result[0].competitors[0].fullName).toBe('Ana Perez');
    expect(result[0].competitors[0].academyName).toBe('Academia A');
    expect(result[1].competitors).toEqual([]);
    expect(result[1].competitorsError).toBeFalse();
  });

  it('keeps categories visible and marks failed participant requests', () => {
    const http = jasmine.createSpyObj('HttpClient', ['get']);
    http.get.and.callFake((url: string) => url.endsWith('/by-event')
      ? of([{ id: 1 }]) : throwError(() => new Error('Forbidden')));
    let result: any[] = [];
    new EventInvitationsService(http, auth).getCategoriesWithCompetitors(45).subscribe(value => result = value);
    expect(result).toEqual([{ id: 1, competitors: [], competitorsError: true }]);
  });

  it('propagates category list failures and skips participant queries for an empty event', () => {
    const http = jasmine.createSpyObj('HttpClient', ['get']);
    http.get.and.returnValue(of([]));
    const service = new EventInvitationsService(http, auth);
    service.getCategoriesWithCompetitors(45).subscribe(value => expect(value).toEqual([]));
    expect(http.get).toHaveBeenCalledTimes(1);
    http.get.and.returnValue(throwError(() => new Error('Unavailable')));
    const error = jasmine.createSpy('error');
    service.getCategoriesWithCompetitors(45).subscribe({ error });
    expect(error).toHaveBeenCalled();
  });
});
