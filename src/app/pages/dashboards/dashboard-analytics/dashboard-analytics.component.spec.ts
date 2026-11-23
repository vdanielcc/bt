import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../../core/auth/auth.service';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { EnvironmentInjector, createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { of, throwError } from 'rxjs';
import { AnalyticsService, OnlineAnalytics } from '../../../core/analytics/analytics.service';
import { DashboardAnalyticsComponent } from './dashboard-analytics.component';

describe('Dashboard online users', () => {
  function setup() {
    TestBed.configureTestingModule({ providers: [
      { provide: MatDialog, useValue: { open: jasmine.createSpy("open") } },
      { provide: AuthService, useValue: { getCurrentUser: () => ({ id: 1, rol: "admin" }) } }
    ] });
    const data: OnlineAnalytics = { onlineUsers: 3, date: '2026-10-10', asOf: '2026-10-10T12:00:00Z',
      timeZone: 'America/Santiago', refreshSeconds: 300, onlineWindowSeconds: 90 };
    const service = jasmine.createSpyObj<AnalyticsService>('Analytics', ['getToday', 'getOnline']);
    service.getToday.and.returnValue(of({ uniqueVisitors: 1, sessions: 3, averageSessionSeconds: 65, hourly: [], date: data.date, timeZone: data.timeZone }));
    service.getOnline.and.returnValue(of(data));
    const injector = createEnvironmentInjector([], TestBed.inject(EnvironmentInjector));
    const component = runInInjectionContext(injector, () => new DashboardAnalyticsComponent(service));
    component.ngOnInit();
    return { component, service, data, injector };
  }

  it('uses five-minute refresh and adopts a changed server interval', fakeAsync(() => {
    const { component, service, data, injector } = setup();
    expect(component.onlineUsers).toBe('3');
    expect(component.onlineDetail).toContain('10/10/2026');
    expect(service.getOnline).toHaveBeenCalledTimes(1);
    service.getOnline.and.returnValue(of({ ...data, onlineUsers: 4, refreshSeconds: 15 }));
    tick(299999);
    expect(service.getOnline).toHaveBeenCalledTimes(1);
    tick(1);
    expect(component.onlineUsers).toBe('4');
    tick(14999);
    expect(service.getOnline).toHaveBeenCalledTimes(2);
    tick(1);
    expect(service.getOnline).toHaveBeenCalledTimes(3);
    injector.destroy();
    tick(300000);
    expect(service.getOnline).toHaveBeenCalledTimes(3);
  }));

  it('retries failures without inventing zero users or losing the refresh interval', fakeAsync(() => {
    const { component, service, data, injector } = setup();
    service.getOnline.and.returnValue(throwError(() => new Error('Unavailable')));
    tick(300000);
    expect(component.onlineUsers).toBe('—');
    service.getOnline.and.returnValue(of({ ...data, onlineUsers: 2 }));
    tick(300000);
    expect(component.onlineUsers).toBe('2');
    expect(component.uniqueUsersSeries[0].data).toEqual([3, 2]);
    injector.destroy();
  }));
});
