import { of } from 'rxjs';
import { ScoreboardDashboardComponent } from './scoreboard-dashboard.component';

describe('Scoreboard: eventos según perfil de la sesión activa', () => {
  function load(rol: string, academieId: number): ScoreboardDashboardComponent {
    const events = [
      { id: 10, academyId: 1, associationType: 'WKF' },
      { id: 20, academyId: 2, associationType: 'JKA' },
      { id: 30, academyId: 3, associationType: 'KUDO' }
    ];
    const component = new ScoreboardDashboardComponent(
      {} as any, {} as any,
      { getEvents: () => of(events) } as any,
      { getCurrentUser: () => ({ rol, academieId }) } as any,
      {} as any, {} as any, {} as any, {} as any,
      { markForCheck: () => {} } as any
    );
    component.ngOnInit();
    return component;
  }
  it('admin ve todos los eventos aunque tenga una academia asociada', () => {
    const component = load('admin', 2);
    expect(component.events.map(e => e.id)).toEqual([10, 20, 30]);
    expect(component.message).toBe('Selecciona un evento.');
    expect(component.loadingEvents).toBeFalse();
  });
  it('academy_admin conserva el filtro por su academia', () => {
    expect(load('academy_admin', 2).events.map(e => e.id)).toEqual([20]);
  });
  it('una sesión delegada de academia no hereda el acceso global del administrador', () => {
    expect(load('academy_admin', 3).events.map(e => e.id)).toEqual([30]);
  });
});
