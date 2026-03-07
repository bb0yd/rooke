'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './GameChat.module.css';

interface ChatMessage {
  id: number;
  message: string;
  username: string;
  created_at: string;
}

interface Props {
  gameId: string;
  currentUsername: string;
  readOnly?: boolean;
}

export default function GameChat({ gameId, currentUsername, readOnly = false }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load messages
  useEffect(() => {
    function loadMessages() {
      fetch(`/api/multiplayer/${gameId}/chat`)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setMessages(data);
        })
        .catch(() => {});
    }

    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [gameId]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      await fetch(`/api/multiplayer/${gameId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input.trim() }),
      });
      setInput('');
    } catch { /* silent */ }
  }

  if (collapsed) {
    return (
      <button className={styles.expandBtn} onClick={() => setCollapsed(false)}>
        Chat {messages.length > 0 && `(${messages.length})`}
      </button>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Chat</span>
        <button className={styles.collapseBtn} onClick={() => setCollapsed(true)}>_</button>
      </div>
      <div className={styles.messages} ref={scrollRef}>
        {messages.length === 0 ? (
          <span className={styles.empty}>No messages yet</span>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`${styles.message} ${msg.username === currentUsername ? styles.own : ''}`}>
              <span className={styles.sender}>{msg.username}</span>
              <span className={styles.text}>{msg.message}</span>
            </div>
          ))
        )}
      </div>
      {!readOnly && (
        <form className={styles.inputRow} onSubmit={sendMessage}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message..."
            className={styles.input}
            maxLength={500}
          />
          <button type="submit" className={styles.sendBtn} disabled={!input.trim()}>Send</button>
        </form>
      )}
    </div>
  );
}
