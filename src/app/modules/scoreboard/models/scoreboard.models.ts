import { EventInvitation } from '../../../pages/championships/invitations/event-invitation.model';

export type ScoreboardModality = 'KATA' | 'KUMITE';
export type MatchStatus =
  | 'READY'
  | 'RUNNING'
  | 'PAUSED'
  | 'FINISHED'
  | 'CONFIRMED';
export type SyncStatus = 'SYNCED' | 'PENDING' | 'ERROR';
export type ConnectionStatus = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'ERROR';
export type ScoreboardSide = 'AKA' | 'SHIRO';

export interface ScoreOption {
  code: string;
  label: string;
  value: number;
}
export interface RuleControl {
  code: string;
  label: string;
  value?: number;
  reversible?: boolean;
}
export interface KataScoringConfiguration {
  strategy: string;
  dropHighest?: number;
  dropLowest?: number;
  multiplier?: number;
  precision?: number;
  [key: string]: unknown;
}
export interface ScoreboardRuleConfiguration {
  scoring?: { availableScores: ScoreOption[] };
  penalties?: RuleControl[];
  specialControls?: RuleControl[];
  timer?: { durationSeconds: number; overtimeSeconds?: number };
  kata?: { judgeCount: number; scoringConfiguration: KataScoringConfiguration };
  [key: string]: unknown;
}
export interface ScoreboardRuleSet {
  id: number;
  associationCode: string;
  modality: ScoreboardModality;
  name: string;
  version: string;
  configuration: ScoreboardRuleConfiguration;
}
export interface ScoreboardCompetitor {
  id: number;
  name: string;
  academy?: string;
  country?: string;
}
export interface ScoreboardTimerState {
  durationMs: number;
  remainingMs: number;
  running: boolean;
  startedAt?: number;
  accumulatedElapsedMs: number;
  finished: boolean;
}
export interface ScoreboardMatchState {
  matchId: string;
  eventId: number;
  areaId: number;
  categoryId: number;
  fixtureMatchId?: number;
  fixtureId?: number;
  fixtureVersionId?: number;
  fixtureType?: string;
  roundNumber?: number;
  roundName?: string;
  associationCode: string;
  modality: ScoreboardModality;
  ruleSetId: number;
  matchNumber?: string;
  categoryName?: string;
  aka?: ScoreboardCompetitor;
  shiro?: ScoreboardCompetitor;
  timer: ScoreboardTimerState;
  status: MatchStatus;
  sequence: number;
  syncStatus: SyncStatus;
  scores?: Partial<Record<ScoreboardSide, number>>;
  penalties?: Partial<Record<ScoreboardSide, RuleControl[]>>;
  specialControls?: Partial<Record<ScoreboardSide, RuleControl[]>>;
  kataScores?: number[];
  kataName?: string;
  result?: unknown;
}
export interface ScoreboardSyncOperation {
  operationId: string;
  matchId: string;
  sequence: number;
  action: string;
  side?: ScoreboardSide;
  value?: number;
  payload?: unknown;
  occurredAt: string;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'ERROR';
  retryCount: number;
}
export interface ScoreboardArea {
  id: number;
  eventId: number;
  name: string;
  modality?: ScoreboardModality;
  categoryName?: string;
  currentMatch?: ScoreboardMatchState;
  nextMatch?: ScoreboardMatchState;
  status: 'AVAILABLE' | 'READY' | 'RUNNING' | 'FINISHED';
  online: boolean;
  pendingOperations: number;
}
export interface ScoreboardEvent extends EventInvitation {
  associationCode: string;
  status?: string;
  areas: ScoreboardArea[];
}
export interface ScoreboardAction {
  operationId: string;
  matchId: string;
  sequence: number;
  action: string;
  occurredAt: string;
  reversible: boolean;
  revertedBy?: string;
  payload?: unknown;
}
export interface ScoreboardState {
  currentEvent: ScoreboardEvent | null;
  currentArea: ScoreboardArea | null;
  currentMatch: ScoreboardMatchState | null;
  currentRuleSet: ScoreboardRuleSet | null;
  connectionStatus: ConnectionStatus;
  syncStatus: SyncStatus;
  pendingOperations: number;
}
