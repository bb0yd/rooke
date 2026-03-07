export interface TrainingSignals {
  recentHungPieceCount: number;
  topMistakeTheme: string | null;
  topMistakeThemeCount: number;
  weakestPhase: 'opening' | 'middlegame' | 'endgame' | null;
}

export const DEFAULT_TRAINING_SIGNALS: TrainingSignals = {
  recentHungPieceCount: 0,
  topMistakeTheme: null,
  topMistakeThemeCount: 0,
  weakestPhase: null,
};
