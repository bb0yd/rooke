'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { getSettings, updateSettings, SoundPack, PieceSet, NotificationPrefs, Theme } from '@/lib/settings';
import { playMoveSound, playCaptureSound, playCheckSound } from '@/lib/sounds';
import styles from './settings.module.css';

const SOUND_PACKS: { id: SoundPack; label: string; description: string }[] = [
  { id: 'standard', label: 'Standard', description: 'Classic chess piece sounds from Lichess' },
  { id: 'nes', label: 'NES', description: '8-bit retro game sounds' },
  { id: 'synth', label: 'Synth', description: 'Synthesized tones via Web Audio' },
  { id: 'none', label: 'None', description: 'Silent — no sound effects' },
];

const BOARD_THEMES: { id: string; label: string; light: string; dark: string }[] = [
  { id: 'classic', label: 'Classic', light: '#eae9d4', dark: '#507297' },
  { id: 'green', label: 'Green', light: '#eeeed2', dark: '#769656' },
  { id: 'brown', label: 'Brown', light: '#f0d9b5', dark: '#b58863' },
  { id: 'dark', label: 'Dark', light: '#ddd', dark: '#555' },
];

const PIECE_SETS: { id: PieceSet; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'modern', label: 'Modern' },
  { id: 'classic', label: 'Classic' },
  { id: 'pixel', label: 'Pixel' },
];

export default function SettingsPage() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [soundPack, setSoundPack] = useState<SoundPack>('standard');
  const [boardTheme, setBoardTheme] = useState('classic');
  const [pieceSet, setPieceSet] = useState<PieceSet>('standard');
  const [showCoordinates, setShowCoordinates] = useState(true);
  const [showLegalMoves, setShowLegalMoves] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(150);
  const [blindfoldMode, setBlindfoldMode] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>({ challenges: true, friendRequests: true, gameUpdates: true });
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  useEffect(() => {
    const s = getSettings();
    setTheme(s.theme || 'dark');
    setSoundPack(s.soundPack);
    setBoardTheme(s.boardTheme);
    setPieceSet(s.pieceSet || 'standard');
    setShowCoordinates(s.showCoordinates ?? true);
    setShowLegalMoves(s.showLegalMoves ?? true);
    setAnimationSpeed(s.animationSpeed ?? 150);
    setBlindfoldMode(s.blindfoldMode ?? false);
    setNotificationPrefs(s.notificationPrefs ?? { challenges: true, friendRequests: true, gameUpdates: true });

    // Load profile
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.userId) {
          fetch(`/api/users/${data.userId}`)
            .then(r => r.json())
            .then(profile => {
              if (profile.display_name) setDisplayName(profile.display_name);
              if (profile.bio) setBio(profile.bio);
              if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  function handleAppThemeChange(t: Theme) {
    setTheme(t);
    updateSettings({ theme: t });
    applyTheme(t);
  }

  function applyTheme(t: Theme) {
    if (t === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', t);
    }
  }

  function handleSoundChange(pack: SoundPack) {
    setSoundPack(pack);
    updateSettings({ soundPack: pack });
  }

  function handleThemeChange(theme: string) {
    setBoardTheme(theme);
    updateSettings({ boardTheme: theme });
  }

  function handlePieceSetChange(set: PieceSet) {
    setPieceSet(set);
    updateSettings({ pieceSet: set });
  }

  function preview(pack: SoundPack) {
    const prev = getSettings().soundPack;
    updateSettings({ soundPack: pack });
    playMoveSound();
    setTimeout(() => playCaptureSound(), 350);
    setTimeout(() => playCheckSound(), 700);
    updateSettings({ soundPack: prev === pack ? pack : prev });
    if (prev !== pack) {
      setTimeout(() => updateSettings({ soundPack: soundPack }), 750);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetch('/api/users/avatar', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.avatarUrl) {
        setAvatarUrl(data.avatarUrl);
      }
    } catch {
      // ignore
    } finally {
      setAvatarUploading(false);
    }
  }

  async function saveProfile() {
    try {
      const meRes = await fetch('/api/auth/me');
      const me = await meRes.json();
      if (!me.userId) return;
      const res = await fetch(`/api/users/${me.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, bio }),
      });
      if (res.ok) setProfileMsg('Profile saved!');
      else setProfileMsg('Failed to save');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch {
      setProfileMsg('Failed to save');
    }
  }

  async function changePassword() {
    if (newPassword.length < 8) {
      setPasswordMsg('Password must be at least 8 characters');
      return;
    }
    try {
      const res = await fetch('/api/users/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMsg('Password changed!');
        setCurrentPassword('');
        setNewPassword('');
      } else {
        setPasswordMsg(data.error || 'Failed to change password');
      }
      setTimeout(() => setPasswordMsg(''), 3000);
    } catch {
      setPasswordMsg('Failed to change password');
    }
  }

  return (
    <AppShell>
      <div className={styles.page}>
        <h1 className={styles.title}>Settings</h1>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Theme</h2>
          <div className={styles.themeOptions}>
            {(['dark', 'light', 'system'] as Theme[]).map(t => (
              <label
                key={t}
                className={`${styles.themeOption} ${theme === t ? styles.themeOptionActive : ''}`}
                onClick={() => handleAppThemeChange(t)}
              >
                <span className={styles.themeLabel}>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
              </label>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Board Theme</h2>
          <div className={styles.themeOptions}>
            {BOARD_THEMES.map(theme => (
              <label
                key={theme.id}
                className={`${styles.themeOption} ${boardTheme === theme.id ? styles.themeOptionActive : ''}`}
                onClick={() => handleThemeChange(theme.id)}
              >
                <div className={styles.themePreview}>
                  <div className={styles.themeSquare} style={{ background: theme.light }} />
                  <div className={styles.themeSquare} style={{ background: theme.dark }} />
                  <div className={styles.themeSquare} style={{ background: theme.dark }} />
                  <div className={styles.themeSquare} style={{ background: theme.light }} />
                </div>
                <span className={styles.themeLabel}>{theme.label}</span>
              </label>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Piece Set</h2>
          <div className={styles.themeOptions}>
            {PIECE_SETS.map(set => (
              <label
                key={set.id}
                className={`${styles.themeOption} ${pieceSet === set.id ? styles.themeOptionActive : ''}`}
                onClick={() => handlePieceSetChange(set.id)}
              >
                <span className={styles.themeLabel}>{set.label}</span>
              </label>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Board Options</h2>
          <div className={styles.options}>
            <label className={styles.toggleRow}>
              <span className={styles.optionLabel}>Show coordinates</span>
              <input
                type="checkbox"
                checked={showCoordinates}
                onChange={e => { setShowCoordinates(e.target.checked); updateSettings({ showCoordinates: e.target.checked }); }}
              />
            </label>
            <label className={styles.toggleRow}>
              <span className={styles.optionLabel}>Show legal moves</span>
              <input
                type="checkbox"
                checked={showLegalMoves}
                onChange={e => { setShowLegalMoves(e.target.checked); updateSettings({ showLegalMoves: e.target.checked }); }}
              />
            </label>
            <label className={styles.toggleRow}>
              <span className={styles.optionLabel}>Blindfold mode</span>
              <input
                type="checkbox"
                checked={blindfoldMode}
                onChange={e => { setBlindfoldMode(e.target.checked); updateSettings({ blindfoldMode: e.target.checked }); }}
              />
            </label>
            <div className={styles.toggleRow}>
              <span className={styles.optionLabel}>Animation speed</span>
              <select
                className={styles.selectInput}
                value={animationSpeed}
                onChange={e => { const v = Number(e.target.value); setAnimationSpeed(v); updateSettings({ animationSpeed: v }); }}
              >
                <option value={0}>None</option>
                <option value={75}>Fast</option>
                <option value={150}>Normal</option>
                <option value={300}>Slow</option>
              </select>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Notifications</h2>
          <div className={styles.options}>
            <label className={styles.toggleRow}>
              <span className={styles.optionLabel}>Challenge alerts</span>
              <input
                type="checkbox"
                checked={notificationPrefs.challenges}
                onChange={e => { const np = { ...notificationPrefs, challenges: e.target.checked }; setNotificationPrefs(np); updateSettings({ notificationPrefs: np }); }}
              />
            </label>
            <label className={styles.toggleRow}>
              <span className={styles.optionLabel}>Friend requests</span>
              <input
                type="checkbox"
                checked={notificationPrefs.friendRequests}
                onChange={e => { const np = { ...notificationPrefs, friendRequests: e.target.checked }; setNotificationPrefs(np); updateSettings({ notificationPrefs: np }); }}
              />
            </label>
            <label className={styles.toggleRow}>
              <span className={styles.optionLabel}>Game updates</span>
              <input
                type="checkbox"
                checked={notificationPrefs.gameUpdates}
                onChange={e => { const np = { ...notificationPrefs, gameUpdates: e.target.checked }; setNotificationPrefs(np); updateSettings({ notificationPrefs: np }); }}
              />
            </label>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Sound Pack</h2>
          <div className={styles.options}>
            {SOUND_PACKS.map(pack => (
              <label key={pack.id} className={`${styles.option} ${soundPack === pack.id ? styles.optionActive : ''}`}>
                <input
                  type="radio"
                  name="soundPack"
                  value={pack.id}
                  checked={soundPack === pack.id}
                  onChange={() => handleSoundChange(pack.id)}
                  className={styles.radio}
                />
                <div className={styles.optionContent}>
                  <span className={styles.optionLabel}>{pack.label}</span>
                  <span className={styles.optionDesc}>{pack.description}</span>
                </div>
                {pack.id !== 'none' && (
                  <button
                    className={styles.previewBtn}
                    onClick={(e) => { e.preventDefault(); preview(pack.id); }}
                    title="Preview sounds"
                  >
                    &#9654;
                  </button>
                )}
              </label>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Profile</h2>
          <div className={styles.avatarSection}>
            <div className={styles.avatarPreview}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" />
              ) : (
                <span className={styles.avatarPlaceholder}>&#9823;</span>
              )}
            </div>
            <div className={styles.avatarControls}>
              <label className={styles.avatarUploadBtn}>
                {avatarUploading ? 'Uploading...' : 'Upload Avatar'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarUpload}
                  style={{ display: 'none' }}
                  disabled={avatarUploading}
                />
              </label>
              <span className={styles.avatarHint}>JPEG, PNG, or WebP · Max 2MB</span>
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className={styles.textInput}
              placeholder="Your display name"
              maxLength={50}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              className={styles.textArea}
              placeholder="A short bio..."
              maxLength={200}
              rows={3}
            />
          </div>
          <button className={styles.saveBtn} onClick={saveProfile}>Save Profile</button>
          {profileMsg && <span className={styles.msg}>{profileMsg}</span>}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Change Password</h2>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className={styles.textInput}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className={styles.textInput}
              placeholder="Min 8 characters"
            />
          </div>
          <button className={styles.saveBtn} onClick={changePassword}>Change Password</button>
          {passwordMsg && <span className={styles.msg}>{passwordMsg}</span>}
        </section>
      </div>
    </AppShell>
  );
}
