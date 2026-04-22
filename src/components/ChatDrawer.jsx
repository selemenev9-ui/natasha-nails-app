import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../utils/config.js';

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
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: '#F5F0EB',
          display: 'flex',
          flexDirection: 'column'
        }}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      >
        {/* ── Header ── */}
        <div style={{
          background: '#fff',
          borderBottom: '1px solid #EDE8E1',
          padding: '12px 16px',
          paddingTop: 'max(12px, env(safe-area-inset-top))',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 26, color: '#B8963E', lineHeight: 1, padding: '0 4px 0 0'
            }}
          >
            ‹
          </button>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'linear-gradient(135deg, #C9A84C, #8B6914)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 17, flexShrink: 0
          }}>
            {avatarLetter}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, margin: 0, fontSize: 16, lineHeight: 1.2 }}>{displayName}</p>
            <p style={{ color: '#B8963E', margin: 0, fontSize: 12, lineHeight: 1.4 }}>Natasha Premium Lab</p>
          </div>
        </div>

        {/* ── Messages ── */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}>
          {messages.length === 0 && (
            <p style={{ textAlign: 'center', color: '#bbb', fontSize: 14, marginTop: 60 }}>
              Начните диалог 💬
            </p>
          )}
          {messages.map((m, index) => {
            const prev = messages[index - 1];
            const curMs = m.created_at > 1e10 ? m.created_at : m.created_at * 1000;
            const prevMs = prev?.created_at ? (prev.created_at > 1e10 ? prev.created_at : prev.created_at * 1000) : null;
            const showDate = !prevMs || new Date(curMs).toDateString() !== new Date(prevMs).toDateString();
            const isOwn = String(m.sender_id) === String(currentUserId);
            return (
              <div key={m.id || `${curMs}-${index}`}>
                {showDate && (
                  <div style={{ textAlign: 'center', margin: '16px 0 10px' }}>
                    <span style={{
                      background: 'rgba(0,0,0,0.12)', borderRadius: 12,
                      padding: '4px 14px', fontSize: 12, color: '#666'
                    }}>
                      {formatMsgDate(m.created_at)}
                    </span>
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isOwn ? 'flex-end' : 'flex-start',
                  marginBottom: 2
                }}>
                  {!isOwn && (
                    <span style={{ fontSize: 11, color: '#aaa', marginBottom: 2, marginLeft: 4 }}>
                      {m.sender_name || 'Собеседник'}
                    </span>
                  )}
                  <div style={{
                    maxWidth: '78%',
                    padding: '9px 13px',
                    borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: isOwn ? 'linear-gradient(135deg, #C9A84C, #9A7328)' : '#fff',
                    color: isOwn ? '#fff' : '#1A1A1A',
                    fontSize: 15,
                    lineHeight: 1.45,
                    wordBreak: 'break-word',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                  }}>
                    {m.text?.startsWith('[photo]') ? (
                      <img
                        src={m.text.replace('[photo]', '')}
                        alt="фото"
                        style={{
                          maxWidth: '100%',
                          borderRadius: 12,
                          display: 'block',
                          maxHeight: 260,
                          objectFit: 'cover',
                          cursor: 'pointer'
                        }}
                        onClick={() => window.open(m.text.replace('[photo]', ''), '_blank')}
                      />
                    ) : (
                      m.text
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 3, marginLeft: 4, marginRight: 4 }}>
                    <span style={{ fontSize: 11, color: '#bbb' }}>{formatTs(m.created_at)}</span>
                    {isOwn && (
                      <span style={{ fontSize: 12, color: m.is_read ? '#B8963E' : '#ccc', fontWeight: 600 }}>
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
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ background: '#fff', borderTop: '1px solid #EDE8E1', overflow: 'hidden' }}
            >
              <div style={{
                padding: '12px 16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(10, 1fr)',
                gap: 4
              }}>
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => insertEmoji(emoji)}
                    style={{
                      background: 'none', border: 'none', fontSize: 22,
                      cursor: 'pointer', padding: 4, borderRadius: 8,
                      lineHeight: 1
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Input Bar ── */}
        <div style={{
          background: '#fff',
          borderTop: '1px solid #EDE8E1',
          padding: '10px 12px',
          paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          flexShrink: 0
        }}>
          <button
            onClick={() => setShowEmoji((v) => !v)}
            style={{
              background: showEmoji ? '#F5F0EB' : 'none',
              border: 'none', fontSize: 24, cursor: 'pointer',
              padding: '6px', borderRadius: 10, lineHeight: 1, flexShrink: 0,
              transition: 'background 0.2s'
            }}
          >
            😊
          </button>
          <label style={{
            background: 'none', border: 'none', fontSize: 22,
            cursor: 'pointer', padding: '6px', borderRadius: 10,
            lineHeight: 1, flexShrink: 0, display: 'flex', alignItems: 'center'
          }}>
            📷
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
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
            style={{
              flex: 1,
              border: '1.5px solid #EDE8E1',
              borderRadius: 20,
              padding: '9px 14px',
              fontSize: 15,
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              maxHeight: 100,
              lineHeight: 1.4,
              background: '#FAFAF8'
            }}
          />
          <button
            onClick={send}
            disabled={sending || !text.trim()}
            style={{
              background: text.trim() ? 'linear-gradient(135deg, #C9A84C, #9A7328)' : '#E8E3DC',
              border: 'none', borderRadius: '50%',
              width: 42, height: 42,
              color: '#fff', fontSize: 18,
              cursor: text.trim() ? 'pointer' : 'default',
              flexShrink: 0,
              transition: 'background 0.25s',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            ↑
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
