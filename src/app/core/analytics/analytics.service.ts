import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';

export interface DailyAnalytics {
  uniqueVisitors: number;
  sessions: number;
  averageSessionSeconds: number;
  hourly: number[];
  date: string;
  timeZone: string;
}
export interface OnlineAnalytics {
  onlineUsers: number;
  date: string;
  asOf: string;
  timeZone: string;
  refreshSeconds: number;
  onlineWindowSeconds: number;
}

export interface OnlineUser { userId: number; email: string; connectedAt: string; lastSeenAt: string; }

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private started = false;
  private visitorId = '';
  private sessionId = '';
  private pageId = '';
  private path = '';
  private day = '';
  private activeMs = 0;
  private lastTick = 0;
  private lastActivity = 0;
  private lastStoredActivity = 0;
  private visible = !document.hidden;
  private accountId = '';
  private token = '';
  private readonly idleMs = 30 * 60 * 1000;
  private readonly endpoint = `${environment.apiBaseUrl}/analytics`;
  private readonly memory = new Map<string, string>();

  constructor(private readonly router: Router, private readonly auth: AuthService,
    private readonly http: HttpClient, private readonly zone: NgZone) {}

  getToday() { return this.http.get<DailyAnalytics>(`${this.endpoint}/today`); }
  getOnline() { return this.http.get<OnlineAnalytics>(`${this.endpoint}/online`); }

  getOnlineUsers() { return this.http.get<OnlineUser[]>(`${this.endpoint}/online/users`); }
  logoutUser(userId: number) { return this.http.post<void>(`${this.endpoint}/online/users/${userId}/logout`, {}); }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.visitorId = this.read('analytics-visitor') || crypto.randomUUID();
    this.write('analytics-visitor', this.visitorId);
    this.lastActivity = Date.now();
    this.auth.currentUser$.subscribe(user => {
      const account = user ? String(user.id) : '';
      const changed = account !== this.accountId;
      const hadPage = !!this.path;
      if (changed && hadPage) {
        this.tick(); this.send(true);
        if (this.accountId) { this.sessionId = ''; this.write('analytics-session', ''); }
        this.path = '';
      }
      this.accountId = account; this.token = user?.token || '';
      if (changed && hadPage) this.openPage();
    });
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => this.openPage());
    this.zone.runOutsideAngular(() => {
      for (const event of ['pointerdown', 'keydown', 'scroll', 'touchstart']) {
        window.addEventListener(event, () => this.activity(), { passive: true });
      }
      document.addEventListener('visibilitychange', () => {
        this.tick();
        this.visible = !document.hidden;
        this.send();
        if (!document.hidden) this.activity();
      });
      window.addEventListener('pagehide', () => { this.tick(); this.send(true); });
      setInterval(() => {
        this.tick();
        if (!document.hidden && this.path) {
          if (this.day !== this.calendarDay() && Date.now() - this.lastActivity < this.idleMs) this.openPage();
          else this.send();
        }
      }, 15000);
    });
    if (this.router.navigated) this.openPage();
  }

  private activity(): void {
    const now = Date.now();
    if (this.path && (now - this.lastActivity >= this.idleMs || this.day !== this.calendarDay())) this.openPage();
    this.lastActivity = now;
    if (now - this.lastStoredActivity >= 5000) {
      this.lastStoredActivity = now;
      this.write('analytics-last-activity', String(now));
    }
  }

  private openPage(): void {
    this.tick(); this.send(true);
    const now = Date.now();
    const last = Number(this.read('analytics-last-activity') || 0);
    this.sessionId = last && now - last < this.idleMs
      ? this.read('analytics-session') || crypto.randomUUID() : crypto.randomUUID();
    const previousAccount = this.read('analytics-session-account');
    if (previousAccount && previousAccount !== this.accountId) this.sessionId = crypto.randomUUID();
    this.write('analytics-session', this.sessionId);
    this.write('analytics-session-account', this.accountId);
    this.lastActivity = now;
    this.write('analytics-last-activity', String(now));
    this.pageId = crypto.randomUUID();
    this.path = this.router.url.split(/[?#]/)[0].slice(0, 512);
    this.day = this.calendarDay(); this.activeMs = 0; this.lastTick = performance.now();
    this.send();
  }

  private tick(): void {
    const now = performance.now();
    if (this.lastTick && this.visible)
      this.activeMs += Math.max(0, Math.min(now - this.lastTick, this.idleMs - (Date.now() - this.lastActivity) + (now - this.lastTick)));
    this.lastTick = now;
  }

  private send(inactive = false): void {
    if (!this.path || !this.pageId) return;
    const token = this.token;
    // Cumulative duration makes retries and out-of-order heartbeats idempotent.
    void fetch(`${this.endpoint}/visit`, {
      method: 'POST', keepalive: true,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ visitorId: this.visitorId, sessionId: this.sessionId,
        pageId: this.pageId, path: this.path, activeMs: Math.min(86400000, Math.round(this.activeMs)),
        isActive: !inactive && this.visible && Date.now() - this.lastActivity < this.idleMs,
        frontKey: environment.frontAccessKey })
    }).catch(() => { /* Analytics must never interrupt navigation. */ });
  }

  private calendarDay(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }
  private read(key: string): string { try { return localStorage.getItem(key) || this.memory.get(key) || ''; } catch { return this.memory.get(key) || ''; } }
  private write(key: string, value: string): void { this.memory.set(key, value); try { localStorage.setItem(key, value); } catch { /* Memory-only fallback. */ } }
}
