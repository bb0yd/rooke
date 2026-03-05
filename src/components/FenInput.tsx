'use client';

import { useState } from 'react';
import { Chess } from 'chess.js';
import MiniBoard from './MiniBoard';
import styles from './FenInput.module.css';

interface Props {
  onSubmit: (fen: string) => void;
  onCancel: () => void;
}

export default function FenInput({ onSubmit, onCancel }: Props) {
  const [fen, setFen] = useState('');
  const [error, setError] = useState('');
  const [validFen, setValidFen] = useState<string | null>(null);

  function validate(value: string) {
    setFen(value);
    setError('');
    setValidFen(null);

    if (!value.trim()) return;

    try {
      const game = new Chess(value.trim());
      setValidFen(game.fen());
    } catch {
      setError('Invalid FEN position');
    }
  }

  function handleSubmit() {
    if (validFen) {
      onSubmit(validFen);
    }
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Load Position</h3>
      <input
        type="text"
        value={fen}
        onChange={e => validate(e.target.value)}
        placeholder="Paste FEN string..."
        className={styles.input}
        autoFocus
      />
      {error && <span className={styles.error}>{error}</span>}
      {validFen && (
        <div className={styles.preview}>
          <MiniBoard fen={validFen} />
        </div>
      )}
      <div className={styles.buttons}>
        <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
        <button className={styles.submitBtn} onClick={handleSubmit} disabled={!validFen}>
          Load Position
        </button>
      </div>
    </div>
  );
}
