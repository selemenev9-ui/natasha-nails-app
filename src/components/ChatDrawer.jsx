import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../utils/config.js';
import styles from './ChatDrawer.module.css';

const EMOJIS = [
  '😊','❤️','💅','✨','🌸','💕','👍','🙏','🔥','😍',
  '💖','🥰','😘','💋','🌺','🌷','💐','🎀','👏','🫶',
  '💯','🙌','😁','🥳','🤩','💎','👑','🌟','⭐','✅',
  '😂','🫠','🤗','😇','🥹','💃','🎉','🍀','🫐','🦋'
];

export default function ChatDrawer({ appointmentId, currentUserId, currentUserName, contactName, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const load = async () => {
    if (!appointmentId) return;
    try {
      const viewerQuery = currentUserId ? `&viewer_id=${currentUserId}` : '';
      const res = await fetch(`${API_URL}?action=get_messages&appointment_id=${appointmentId}${viewerQuery}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {}
  };

  useEffect(() => {
    if (!appointmentId || !currentUserId) return;
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read', appointment_id: appointmentId, viewer_id: currentUserId })
    }).catch(() => {});
  }, [appointmentId, currentUserId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [appointmentId, currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          appointment_id: appointmentId,
          sender_id: currentUserId,
          sender_name: currentUserName,
          text: text.trim()
        })
      });
      setText('');
      setShowEmoji(false);
      await load();
    } catch {}
    setSending(false);
  };

  const compressImage = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1200;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  const sendPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file || sending) return;
    setSending(true);
    try {
      const dataUrl = await compressImage(file);
      const base64 = dataUrl.split(',')[1];
      const uploadRes = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload_photo',
          image_base64: base64,
          content_type: 'image/jpeg',
          appointment_id: appointmentId
        })
      });
      const { url } = await uploadRes.json();
      if (url) {
        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_message',
            appointment_id: appointmentId,
            sender_id: currentUserId,
            sender_name: currentUserName,
            text: `[photo]${url}`
          })
        });
        await load();
      }
    } catch {}
    setSending(false);
    e.target.value = '';
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const insertEmoji = (emoji) => {
    setText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const formatTs = (ts) => {
    if (!ts) return '';
    const ms = ts > 1e10 ? ts : ts * 1000;
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  const formatMsgDate = (ts) => {
    if (!ts) return '';
    const ms = ts > 1e10 ? ts : ts * 1000;
    const d = new Date(ms);
    const now = new Date();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return 'Сегодня';
    if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  const displayName = contactName || 'Чат';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <AnimatePresence>
      <motion.div
        className={styles.drawer}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
      >
        {/* ── Header ── */}
        <div className={styles.header}>
          <button type="button" onClick={onClose} className={styles.backButton}>
            ‹
          </button>
          <div className={styles.avatar}>{avatarLetter}</div>
          <div className={styles.headerInfo}>
            <p className={styles.headerTitle}>{displayName}</p>
            <p className={styles.headerSubtitle}>Natasha Premium Lab</p>
          </div>
        </div>

        {/* ── Messages ── */}
        <div className={styles.messageList}>
          {messages.length === 0 && (
            <p className={styles.emptyState}>
              Начните диалог 💬
            </p>
          )}
          {messages.map((m, index) => {
            const prev = messages[index - 1];
            const curMs = m.created_at > 1e10 ? m.created_at : m.created_at * 1000;
            const prevMs = prev?.created_at ? (prev.created_at > 1e10 ? prev.created_at : prev.created_at * 1000) : null;
            const showDate = !prevMs || new Date(curMs).toDateString() !== new Date(prevMs).toDateString();
            const isOwn = String(m.sender_id) === String(currentUserId);
            const groupClass = `${styles.messageGroup} ${isOwn ? styles.messageGroupOwn : styles.messageGroupPeer}`;
            const bubbleClass = `${styles.bubble} ${isOwn ? styles.bubbleOwner : styles.bubblePeer}`;
            const readStatusClass = `${styles.readStatus} ${m.is_read ? styles.readStatusRead : styles.readStatusUnread}`;
            return (
              <div key={m.id || `${curMs}-${index}`}>
                {showDate && (
                  <div className={styles.dateDivider}>
                    <span className={styles.dateLabel}>
                      {formatMsgDate(m.created_at)}
                    </span>
                  </div>
                )}
                <div className={groupClass}>
                  {!isOwn && (
                    <span className={styles.senderName}>
                      {m.sender_name || 'Собеседник'}
                    </span>
                  )}
                  <div className={bubbleClass}>
                    {m.text?.startsWith('[photo]') ? (
                      <img
                        src={m.text.replace('[photo]', '')}
                        alt="фото"
                        className={styles.bubbleImage}
                        onClick={() => window.open(m.text.replace('[photo]', ''), '_blank')}
                      />
                    ) : (
                      m.text
                    )}
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.timestamp}>{formatTs(m.created_at)}</span>
                    {isOwn && (
                      <span className={readStatusClass}>
                        {m.is_read ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* ── Emoji Picker ── */}
        <AnimatePresence>
          {showEmoji && (
            <motion.div
              className={styles.emojiPanel}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className={styles.emojiGrid}>
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => insertEmoji(emoji)}
                    className={styles.emojiButton}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Input Bar ── */}
        <div className={styles.inputBar}>
          <button
            type="button"
            onClick={() => setShowEmoji((v) => !v)}
            className={`${styles.iconButton} ${showEmoji ? styles.emojiToggleActive : ''}`}
          >
            😊
          </button>
          <label className={`${styles.iconButton} ${styles.photoButton}`}>
            📷
            <input
              type="file"
              accept="image/*"
              className={styles.fileInput}
              onChange={sendPhoto}
            />
          </label>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Написать сообщение..."
            rows={1}
            className={styles.textarea}
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !text.trim()}
            className={`${styles.sendButton} ${(sending || !text.trim()) ? styles.sendButtonDisabled : ''}`}
          >
            ↑
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
