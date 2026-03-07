export interface TransferSignals {
  pendingTransferCheck: boolean;
  focusModule: 'tactics' | 'endgame' | 'openings' | null;
  focusTheme: string | null;
  focusOpeningId: string | null;
}

export const DEFAULT_TRANSFER_SIGNALS: TransferSignals = {
  pendingTransferCheck: false,
  focusModule: null,
  focusTheme: null,
  focusOpeningId: null,
};
