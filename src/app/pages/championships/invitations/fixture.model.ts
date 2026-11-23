export interface SaveFixtureMatch {
  round: number;
  matchNumber: number;
  position: number;
  topCompetitorId: number | null;
  bottomCompetitorId: number | null;
  winnerCompetitorId: number | null;
  nextMatchNumber: number | null;
  nextMatchPosition: 'top' | 'bottom' | null;
  isBye: boolean;
}

export interface SaveFixtureVersion {
  baseVersion: number;
  notes?: string | null;
  matches: SaveFixtureMatch[];
}
