import { Subject, BehaviorSubject } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NgZone } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { AnalyticsService } from './analytics.service';

describe('Analytics tracking', () => {
  let service: AnalyticsService;
  let events: Subject<NavigationEnd>;
  let users: BehaviorSubject<any>;
  let router: { events: Subject<NavigationEnd>; navigated: boolean; url: string };
  let fetchSpy: jasmine.Spy;
  let heartbeat: () => void;
  let visible: boolean;
  let now: number;
  let elapsed: number;
  let listeners: Map<string, () => void>;
  const payload = () => JSON.parse((fetchSpy.calls.mostRecent().args[1] as RequestInit).body as string);

  beforeEach(() => {
    localStorage.clear();
    visible = true; now = Date.now(); elapsed = 1000;
    events = new Subject(); users = new BehaviorSubject({ id: 1, token: 'test-token' });
    router = { events, navigated: false, url: '/dashboards/analytics' };
    listeners = new Map();
    spyOn(Date, 'now').and.callFake(() => now);
    spyOn(performance, 'now').and.callFake(() => elapsed);
    spyOnProperty(document, 'hidden', 'get').and.callFake(() => !visible);
    spyOn(window, 'setInterval').and.callFake((handler: TimerHandler) => { heartbeat = handler as () => void; return 0; });
    spyOn(window, 'addEventListener').and.callFake((type: string, listener: EventListenerOrEventListenerObject) => { listeners.set(type, listener as () => void); });
    spyOn(document, 'addEventListener').and.callFake((type: string, listener: EventListenerOrEventListenerObject) => { listeners.set(type, listener as () => void); });
    fetchSpy = spyOn(window, 'fetch').and.returnValue(Promise.resolve({} as Response));
    service = new AnalyticsService(router as unknown as Router,
      { currentUser$: users.asObservable() } as unknown as AuthService, {} as HttpClient,
      { runOutsideAngular: (callback: () => void) => callback() } as unknown as NgZone);
    service.start();
    events.next(new NavigationEnd(1, router.url, router.url));
  });

  afterEach(() => localStorage.clear());

  it('preserves the visitor/session across navigation while recording separate pages', () => {
    const first = payload();
    router.url = '/academia?private=value#fragment';
    events.next(new NavigationEnd(2, router.url, router.url));
    const next = payload();
    expect(next.visitorId).toBe(first.visitorId);
    expect(next.sessionId).toBe(first.sessionId);
    expect(next.pageId).not.toBe(first.pageId);
    expect(next.path).toBe('/academia');
  });

  it('sends the final duration when hidden and stops renewing presence', () => {
    now += 1000; elapsed += 1000; visible = false;
    listeners.get('visibilitychange')!();
    expect(payload().activeMs).toBe(1000);
    expect(payload().isActive).toBeFalse();
    const calls = fetchSpy.calls.count();
    now += 15000; elapsed += 15000; heartbeat();
    expect(fetchSpy.calls.count()).toBe(calls);
  });

  it('ends an idle visit and starts another session when interaction resumes', () => {
    const first = payload();
    now += 31 * 60000; elapsed += 31 * 60000; heartbeat();
    expect(payload().isActive).toBeFalse();
    listeners.get('pointerdown')!();
    expect(payload().sessionId).not.toBe(first.sessionId);
    expect(payload().visitorId).toBe(first.visitorId);
    expect(payload().isActive).toBeTrue();
  });

  it('keeps the browser identity but starts an anonymous session on logout', () => {
    const first = payload();
    users.next(null);
    expect(payload().visitorId).toBe(first.visitorId);
    expect(payload().sessionId).not.toBe(first.sessionId);
    expect((fetchSpy.calls.mostRecent().args[1].headers as Record<string, string>)['Authorization']).toBeUndefined();
  });
});
