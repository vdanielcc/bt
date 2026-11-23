import { canAccessRoute } from './route-access';

describe('Route access policy', () => {
  it('restricts administration to admin', () => {
    for (const rol of ['academy_admin', 'instructor', 'apoderado', 'alumno', 'unknown']) {
      expect(canAccessRoute({ rol, academieId: 7 }, '/admin/users')).toBeFalse();
      expect(canAccessRoute({ rol, academieId: 7 }, '/admin/events')).toBeFalse();
      expect(canAccessRoute({ rol, academieId: 7 }, '/admin/event-associations')).toBeFalse();
      expect(canAccessRoute({ rol, academieId: 7 }, '/admin/styles-federations')).toBeFalse();
      expect(canAccessRoute({ rol, academieId: 7 }, '/admin/events')).toBeFalse();
    }
    expect(canAccessRoute({ rol: 'admin', academieId: 7 }, '/admin/users')).toBeTrue();
    expect(canAccessRoute({ rol: 'admin', academieId: 7 }, '/admin/events')).toBeTrue();
    expect(canAccessRoute({ rol: 'admin', academieId: 7 }, '/admin/event-associations')).toBeTrue();
    expect(canAccessRoute({ rol: 'admin', academieId: 7 }, '/admin/styles-federations')).toBeTrue();
    expect(canAccessRoute({ rol: 'admin', academieId: 7 }, '/admin/events')).toBeTrue();
  });
  it('restricts academy administrators to their academy', () => {
    const user = { rol: 'academy_admin', academieId: 7 };
    expect(canAccessRoute(user, '/academies/7/users')).toBeTrue();
    expect(canAccessRoute(user, '/academies/8/users')).toBeFalse();
    expect(canAccessRoute(user, '/academies/70/billing')).toBeFalse();
  });
  it('allows session detail, existing attendance and the personal page to instructors', () => {
    const user = { rol: 'instructor', academieId: 7 };
    expect(canAccessRoute(user, '/academies/7/class-sessions/12/attendance')).toBeTrue();
    expect(canAccessRoute(user, '/academies/7/class-sessions/12')).toBeTrue();
    expect(canAccessRoute(user, '/academies/7/class-sessions')).toBeFalse();
    expect(canAccessRoute(user, '/academies/7/charges')).toBeFalse();
    expect(canAccessRoute(user, '/academies/7/classes/12')).toBeFalse();
    expect(canAccessRoute(user, '/mi-cuenta')).toBeTrue();
  });
  it('does not allow students and guardians into maintenance screens', () => {
    for (const rol of ['alumno', 'apoderado']) {
      expect(canAccessRoute({ rol, academieId: 7 }, '/students/15')).toBeFalse();
      expect(canAccessRoute({ rol, academieId: 7 }, '/academies/7/billing')).toBeFalse();
      expect(canAccessRoute({ rol, academieId: 7 }, '/mi-cuenta')).toBeTrue();
    }
  });
  it('fails closed for anonymous and unknown profiles', () => {
    expect(canAccessRoute(null, '/mi-cuenta')).toBeFalse();
    expect(canAccessRoute({ rol: 'unexpected', academieId: 7 }, '/scoreboard')).toBeFalse();
  });
});
