import { Injectable, signal } from '@angular/core';
import { ScoreboardDbService } from './scoreboard-db.service';
import { ScoreboardTimerState } from '../models/scoreboard.models';

@Injectable({ providedIn: 'root' })
export class ScoreboardTimerService {
  readonly state = signal<ScoreboardTimerState>({
    durationMs: 0,
    remainingMs: 0,
    running: false,
    accumulatedElapsedMs: 0,
    finished: false
  });
  readonly displayMs = signal(0);
  private frame?: number;
  constructor(private readonly db: ScoreboardDbService) {}
  configure(seconds: number): void {
    this.stopFrame();
    this.state.set({
      durationMs: seconds * 1000,
      remainingMs: seconds * 1000,
      running: false,
      accumulatedElapsedMs: 0,
      finished: false
    });
    this.displayMs.set(seconds * 1000);
  }
  start(): void {
    const s = this.state();
    if (s.running || s.finished) return;
    this.state.set({ ...s, running: true, startedAt: performance.now() });
    this.tick();
    void this.audit('TIMER_START');
  }
  pause(): void {
    const s = this.snapshot();
    if (!s.running) return;
    this.state.set({
      ...s,
      running: false,
      startedAt: undefined,
      remainingMs: this.remaining(s),
      accumulatedElapsedMs: s.durationMs - this.remaining(s)
    });
    this.displayMs.set(this.state().remainingMs);
    this.stopFrame();
    void this.audit('TIMER_PAUSE');
  }
  resume(): void {
    const s = this.state();
    if (s.running || s.finished) return;
    this.state.set({ ...s, running: true, startedAt: performance.now() });
    this.tick();
    void this.audit('TIMER_RESUME');
  }
  reset(): void {
    this.configure(this.state().durationMs / 1000);
    void this.audit('TIMER_RESET');
  }
  adjust(deltaSeconds: number): void {
    const s = this.snapshot();
    const durationMs = Math.max(0, s.durationMs + deltaSeconds * 1000);
    const elapsed = s.running
      ? s.accumulatedElapsedMs +
        performance.now() -
        (s.startedAt ?? performance.now())
      : s.accumulatedElapsedMs;
    this.state.set({
      ...s,
      durationMs,
      remainingMs: Math.max(0, durationMs - elapsed)
    });
    this.displayMs.set(this.state().remainingMs);
    void this.audit('TIMER_ADJUST', { deltaSeconds });
  }
  finish(): void {
    const s = this.state();
    this.state.set({
      ...s,
      running: false,
      remainingMs: 0,
      finished: true,
      startedAt: undefined
    });
    this.displayMs.set(0);
    this.stopFrame();
    void this.audit('TIMER_FINISH');
  }
  hydrate(state: ScoreboardTimerState): void {
    this.stopFrame();
    this.state.set(state);
    this.displayMs.set(this.remaining(state));
    if (state.running) this.tick();
  }
  snapshot(): ScoreboardTimerState {
    const s = this.state();
    return { ...s, remainingMs: this.remaining(s) };
  }
  private remaining(s: ScoreboardTimerState): number {
    const live = s.running
      ? performance.now() - (s.startedAt ?? performance.now())
      : 0;
    return Math.max(0, s.durationMs - s.accumulatedElapsedMs - live);
  }
  private tick(): void {
    const remaining = this.remaining(this.state());
    this.displayMs.set(remaining);
    if (remaining <= 0) {
      this.finish();
      return;
    }
    this.frame = requestAnimationFrame(() => this.tick());
  }
  private stopFrame(): void {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
  }
  private async audit(action: string, payload?: unknown): Promise<void> {
    await this.db.put('actions', {
      operationId: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      matchId: 'timer',
      sequence: Date.now(),
      action,
      occurredAt: new Date().toISOString(),
      reversible: false,
      payload
    });
  }
}
