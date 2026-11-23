import { Injectable, computed, signal } from '@angular/core';
import {
  ScoreboardAction,
  ScoreboardArea,
  ScoreboardEvent,
  ScoreboardMatchState,
  RuleControl,
  ScoreboardRuleSet,
  ScoreboardSide,
  ScoreboardState,
  ScoreboardSyncOperation
} from '../models/scoreboard.models';
import { ScoreboardDbService } from './scoreboard-db.service';

@Injectable({ providedIn: 'root' })
export class ScoreboardStateService {
  readonly state = signal<ScoreboardState>({
    currentEvent: null,
    currentArea: null,
    currentMatch: null,
    currentRuleSet: null,
    connectionStatus: navigator.onLine ? 'ONLINE' : 'OFFLINE',
    syncStatus: 'SYNCED',
    pendingOperations: 0
  });
  readonly match = computed(() => this.state().currentMatch);
  private actions: ScoreboardAction[] = [];
  constructor(private readonly db: ScoreboardDbService) {}
  setContext(event: ScoreboardEvent, area?: ScoreboardArea | null): void {
    this.state.update((s) => ({
      ...s,
      currentEvent: event,
      currentArea: area ?? null
    }));
  }
  setMatch(
    match: ScoreboardMatchState | null,
    ruleSet?: ScoreboardRuleSet | null
  ): void {
    this.state.update((s) => ({
      ...s,
      currentMatch: match,
      currentRuleSet: ruleSet ?? s.currentRuleSet
    }));
    if (match) void this.db.saveMatch(match);
  }
  async restoreActions(matchId: string): Promise<void> {
    this.actions = await this.db.getActions(matchId);
  }
  updateTimer(timer: ScoreboardMatchState['timer']): void {
    const match = this.state().currentMatch;
    if (match) this.setMatch({ ...match, timer });
  }
  setConnection(connectionStatus: ScoreboardState['connectionStatus']): void {
    this.state.update((s) => ({ ...s, connectionStatus }));
  }
  setPending(count: number): void {
    this.state.update((s) => ({
      ...s,
      pendingOperations: count,
      syncStatus: count ? 'PENDING' : 'SYNCED'
    }));
  }
  async perform(
    action: string,
    side?: ScoreboardSide,
    value?: number,
    payload?: unknown
  ): Promise<ScoreboardSyncOperation | null> {
    const match = this.state().currentMatch;
    if (!match || match.status === 'CONFIRMED') return null;
    const sequence = match.sequence + 1;
    const operationId =
      crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    let next = { ...match, sequence, syncStatus: 'PENDING' as const };
    if (action === 'SCORE' && side)
      next = {
        ...next,
        scores: {
          ...next.scores,
          [side]: Number(next.scores?.[side] ?? 0) + Number(value ?? 0)
        }
      };
    if (action === 'PENALTY' && side)
      next = {
        ...next,
        penalties: {
          ...next.penalties,
          [side]: [...(next.penalties?.[side] ?? []), payload as any]
        }
      };
    if (action === 'SPECIAL' && side)
      next = {
        ...next,
        specialControls: {
          ...next.specialControls,
          [side]: [...(next.specialControls?.[side] ?? []), payload as any]
        }
      };
    if (action === 'MATCH_START') next.status = 'RUNNING';
    if (action === 'TIMER_RESUME') next.status = 'RUNNING';
    if (action === 'TIMER_PAUSE') next.status = 'PAUSED';
    if (action === 'MATCH_FINISH') next.status = 'FINISHED';
    if (action === 'RESULT_CONFIRMED') next.status = 'CONFIRMED';
    const operation: ScoreboardSyncOperation = {
      operationId,
      matchId: match.matchId,
      sequence,
      action,
      side,
      value,
      payload,
      occurredAt: new Date().toISOString(),
      status: 'PENDING',
      retryCount: 0
    };
    const audit: ScoreboardAction = {
      operationId,
      matchId: match.matchId,
      sequence,
      action,
      occurredAt: operation.occurredAt,
      reversible: !['RESULT_CONFIRMED', 'ACTION_REVERT'].includes(action),
      payload: { side, value, payload }
    };
    this.actions.push(audit);
    this.setMatch(next);
    await Promise.all([this.db.saveAction(audit), this.db.queue(operation)]);
    this.setPending(this.state().pendingOperations + 1);
    return operation;
  }
  async undo(): Promise<ScoreboardSyncOperation | null> {
    const last = [...this.actions]
      .reverse()
      .find((a) => a.reversible && !a.revertedBy);
    if (!last) return null;
    const current = this.state().currentMatch;
    const detail = last.payload as
      | { side?: ScoreboardSide; value?: number; payload?: RuleControl }
      | undefined;
    if (current && detail?.side) {
      const side = detail.side;
      if (last.action === 'SCORE') {
        this.setMatch({
          ...current,
          scores: {
            ...current.scores,
            [side]:
              Number(current.scores?.[side] ?? 0) - Number(detail.value ?? 0)
          }
        });
      } else if (last.action === 'PENALTY' || last.action === 'SPECIAL') {
        const key = last.action === 'PENALTY' ? 'penalties' : 'specialControls';
        const controls = [...(current[key]?.[side] ?? [])];
        const index = controls
          .map((item) => item.code)
          .lastIndexOf(detail.payload?.code ?? '');
        if (index >= 0) controls.splice(index, 1);
        this.setMatch({
          ...current,
          [key]: { ...current[key], [side]: controls }
        });
      }
    }
    const operation = await this.perform(
      'ACTION_REVERT',
      undefined,
      undefined,
      { targetOperationId: last.operationId }
    );
    if (operation) {
      last.revertedBy = operation.operationId;
      await this.db.saveAction(last);
    }
    return operation;
  }
}
