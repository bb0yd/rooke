export type SoundPack = 'standard' | 'nes' | 'synth' | 'none';
export type PieceSet = 'standard' | 'modern' | 'classic' | 'pixel';
export type Theme = 'dark' | 'light' | 'system';

export interface NotificationPrefs {
  challenges: boolean;
  friendRequests: boolean;
  gameUpdates: boolean;
}

export interface UserSettings {
  soundPack: SoundPack;
  boardTheme: string;
  pieceSet: PieceSet;
  showCoordinates: boolean;
  showLegalMoves: boolean;
  animationSpeed: number; // ms (0 = none, 150 = normal, 300 = slow)
  notificationPrefs: NotificationPrefs;
  blindfoldMode: boolean;
  theme: Theme;
  boardFlipped: boolean;
}

const STORAGE_KEY = 'userSettings';

const DEFAULTS: UserSettings = {
  soundPack: 'standard',
  boardTheme: 'classic',
  pieceSet: 'standard',
  showCoordinates: true,
  showLegalMoves: true,
  animationSpeed: 150,
  notificationPrefs: { challenges: true, friendRequests: true, gameUpdates: true },
  blindfoldMode: false,
  theme: 'dark',
  boardFlipped: false,
};

export function getSettings(): UserSettings {
  if (typeof window === 'undefined') return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    // Migrate legacy boolean notifications to notificationPrefs
    if (typeof parsed.notifications === 'boolean') {
      const enabled = parsed.notifications;
      parsed.notificationPrefs = { challenges: enabled, friendRequests: enabled, gameUpdates: enabled };
      delete parsed.notifications;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULTS, ...parsed }));
    }
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function updateSettings(partial: Partial<UserSettings>): void {
  if (typeof window === 'undefined') return;
  const current = getSettings();
  const merged = { ...current, ...partial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}
