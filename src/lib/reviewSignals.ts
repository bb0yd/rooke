export interface ReviewSignals {
  dueTacticsCount: number;
  dueEndgameCount: number;
  overdueTacticsCount: number;
  overdueEndgameCount: number;
  topDueTacticTheme: string | null;
  topDueTacticThemeCount: number;
}

export const DEFAULT_REVIEW_SIGNALS: ReviewSignals = {
  dueTacticsCount: 0,
  dueEndgameCount: 0,
  overdueTacticsCount: 0,
  overdueEndgameCount: 0,
  topDueTacticTheme: null,
  topDueTacticThemeCount: 0,
};
