export interface RetentionSignals {
  dueReviewCount: number;
  overdueReviewCount: number;
  strugglingLineCount: number;
  focusOpeningId: string | null;
  focusOpeningDueCount: number;
}

export const DEFAULT_RETENTION_SIGNALS: RetentionSignals = {
  dueReviewCount: 0,
  overdueReviewCount: 0,
  strugglingLineCount: 0,
  focusOpeningId: null,
  focusOpeningDueCount: 0,
};
