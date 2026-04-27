import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../utils/config.js';
import styles from './ChatDrawer.module.css';

// ── SVG иконки ───────────────────────────────────────────────────────────
function IconBack() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18L9 12L15 6" />
    </svg>
  );
}

function IconSmile() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5s1 1.5 3.5 1.5 3.5-1.5 3.5-1.5" />
      <circle cx="9.5" cy="10" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="10" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconCamera() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: 'rotate(45deg) translateY(-1px)' }}>
      <path d="M12 19V5" />
      <path d="M5 12L12 5L19 12" />
    </svg>
  );
}

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

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  }, [text]);

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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const insertEmoji = (emoji) => {
    setText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const formatTs = (ts) => {
    if (!ts) return '';
    const ms = ts > 1e10 ? ts : ts * 1000;
    return new Date(ms).toLocaleTimeString('ru-RU', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatMsgDate = (ts) => {
    if (!ts) return '';
    const ms = ts > 1e10 ? ts : ts * 1000;
    const d = new Date(ms);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return 'Сегодня';
    if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  const displayName = contactName || 'Чат';
  const hasText = text.trim().length > 0;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.drawer}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 36 }}
      >
        {/* ── Header ── */}
        <div className={styles.header}>
          <motion.button
            type="button"
            onClick={onClose}
            className={styles.backButton}
            whileTap={{ scale: 0.88 }}
          >
            <IconBack />
          </motion.button>
          <div className={styles.avatarWrap}>
            <div className={styles.avatar}>N</div>
            <span className={styles.onlineDot} />
          </div>
          <div className={styles.headerInfo}>
            <p className={styles.headerTitle}>{displayName}</p>
            <p className={styles.headerSubtitle}>Онлайн</p>
          </div>
        </div>

        {/* ── Messages ── */}
        <div className={styles.messageList}>
          {messages.length === 0 && (
            <motion.div
              className={styles.emptyState}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className={styles.emptyIcon}>
                <svg viewBox="0 0 48 48" width="48" height="48" fill="none"
                  stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 8h28a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H18l-8 8v-8a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4Z" />
                  <path d="M17 21h14M17 27h8" />
                </svg>
              </div>
              <p>Начните диалог</p>
              <span>Напишите Наташе — она ответит!</span>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((m, index) => {
              const prev = messages[index - 1];
              const curMs = m.created_at > 1e10 ? m.created_at : m.created_at * 1000;
              const prevMs = prev?.created_at
                ? (prev.created_at > 1e10 ? prev.created_at : prev.created_at * 1000)
                : null;
              const showDate = !prevMs || new Date(curMs).toDateString() !== new Date(prevMs).toDateString();
              const isOwn = String(m.sender_id) === String(currentUserId);

              return (
                <motion.div
                  key={m.id || `${curMs}-${index}`}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                >
                  {showDate && (
                    <div className={styles.dateDivider}>
                      <span className={styles.dateLine} />
                      <span className={styles.dateLabel}>{formatMsgDate(m.created_at)}</span>
                      <span className={styles.dateLine} />
                    </div>
                  )}
                  <div className={`${styles.messageGroup} ${isOwn ? styles.messageGroupOwn : styles.messageGroupPeer}`}>
                    {!isOwn && (
                      <span className={styles.senderName}>{m.sender_name || 'Собеседник'}</span>
                    )}
                    <div className={`${styles.bubble} ${isOwn ? styles.bubbleOwner : styles.bubblePeer}`}>
                      {m.text?.startsWith('[photo]') ? (
                        <img
                          src={m.text.replace('[photo]', '')}
                          alt="фото"
                          className={styles.bubbleImage}
                          onClick={() => window.open(m.text.replace('[photo]', ''), '_blank')}
                        />
                      ) : m.text}
                    </div>
                    <div className={`${styles.metaRow} ${isOwn ? styles.metaRowOwn : ''}`}>
                      <span className={styles.timestamp}>{formatTs(m.created_at)}</span>
                      {isOwn && (
                        <span className={`${styles.readStatus} ${m.is_read ? styles.read : styles.unread}`}>
                          {m.is_read ? (
                            <svg viewBox="0 0 16 10" width="16" height="10" fill="none">
                              <path d="M1 5L5 9L11 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M6 5L10 9L15 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 12 10" width="12" height="10" fill="none">
                              <path d="M1 5L5 9L11 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* ── Emoji Panel ── */}
        <AnimatePresence>
          {showEmoji && (
            <motion.div
              className={styles.emojiPanel}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className={styles.emojiGrid}>
                {EMOJIS.map((emoji) => (
                  <motion.button
                    key={emoji}
                    onClick={() => insertEmoji(emoji)}
                    className={styles.emojiButton}
                    whileTap={{ scale: 0.82 }}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Input Bar ── */}
        <div className={styles.inputBar}>
          <motion.button
            type="button"
            onClick={() => setShowEmoji((v) => !v)}
            className={`${styles.iconButton} ${showEmoji ? styles.iconButtonActive : ''}`}
            whileTap={{ scale: 0.86 }}
          >
            <IconSmile />
          </motion.button>
          <label className={styles.iconButton}>
            <IconCamera />
            <input type="file" accept="image/*" className={styles.fileInput} onChange={sendPhoto} />
          </label>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Написать..."
            rows={1}
            className={styles.textarea}
          />
          <motion.button
            type="button"
            onClick={send}
            disabled={sending || !hasText}
            className={`${styles.sendButton} ${hasText ? styles.sendButtonActive : ''}`}
            whileTap={{ scale: 0.88 }}
            animate={hasText ? { scale: [1, 1.08, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <IconSend />
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
