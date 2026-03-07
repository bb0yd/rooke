import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSettings, updateSettings, type UserSettings } from '../settings';

describe('settings', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
      clear: vi.fn(() => { store = {}; }),
    });
  });

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

  describe('getSettings', () => {
    it('returns defaults when nothing is stored', () => {
      const settings = getSettings();
      expect(settings).toEqual(DEFAULTS);
    });

    it('returns defaults when localStorage has invalid JSON', () => {
      store['userSettings'] = 'not-json';
      const settings = getSettings();
      expect(settings).toEqual(DEFAULTS);
    });

    it('merges stored values with defaults', () => {
      store['userSettings'] = JSON.stringify({ soundPack: 'nes', theme: 'light' });
      const settings = getSettings();
      expect(settings.soundPack).toBe('nes');
      expect(settings.theme).toBe('light');
      // other fields remain defaults
      expect(settings.pieceSet).toBe('standard');
      expect(settings.showCoordinates).toBe(true);
    });

    it('migrates legacy boolean notifications to notificationPrefs', () => {
      store['userSettings'] = JSON.stringify({ notifications: false });
      const settings = getSettings();
      expect(settings.notificationPrefs).toEqual({
        challenges: false,
        friendRequests: false,
        gameUpdates: false,
      });
      // Verify migration was persisted
      const persisted = JSON.parse(store['userSettings']);
      expect(persisted.notificationPrefs).toBeDefined();
      expect(persisted.notifications).toBeUndefined();
    });
  });

  describe('updateSettings', () => {
    it('persists partial settings', () => {
      updateSettings({ soundPack: 'synth' });
      const settings = getSettings();
      expect(settings.soundPack).toBe('synth');
      // defaults still intact
      expect(settings.theme).toBe('dark');
    });

    it('merges with existing settings', () => {
      updateSettings({ soundPack: 'nes' });
      updateSettings({ theme: 'light' });
      const settings = getSettings();
      expect(settings.soundPack).toBe('nes');
      expect(settings.theme).toBe('light');
    });

    it('overwrites previously saved values', () => {
      updateSettings({ animationSpeed: 300 });
      updateSettings({ animationSpeed: 0 });
      const settings = getSettings();
      expect(settings.animationSpeed).toBe(0);
    });
  });
});
