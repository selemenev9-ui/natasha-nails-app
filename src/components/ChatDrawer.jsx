import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../utils/config.js';

export default function ChatDrawer({ appointmentId, currentUserId, currentUserName, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = async () => {
    if (!appointmentId) return;
    try {
      const res = await fetch(`${API_URL}?action=get_messages&appointment_id=${appointmentId}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [appointmentId]);

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
      await load();
    } catch (e) {
      // ignore
    }
    setSending(false);
  };

  const handleKey = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const formatTs = (ts) => {
    if (!ts) return '';
    const ms = ts > 1e10 ? ts : ts * 1000;
    const date = new Date(ms);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'flex-end'
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          style={{
            width: '100%',
            maxHeight: '75vh',
            background: '#FFFFFF',
            borderRadius: '20px 20px 0 0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              padding: '16px 20px 12px',
              borderBottom: '1px solid #f0ebe4',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <p style={{ fontWeight: 600, fontSize: 16, margin: 0 }}>💬 Чат</p>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            {messages.length === 0 && (
              <p style={{ textAlign: 'center', color: '#aaa', fontSize: 14, marginTop: 40 }}>
                Сообщений пока нет — начните диалог!
              </p>
            )}
            {messages.map((m) => {
              const isOwn = String(m.sender_id) === String(currentUserId);
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isOwn ? 'flex-end' : 'flex-start'
                  }}
                >
                  {!isOwn && (
                    <span style={{ fontSize: 11, color: '#aaa', marginBottom: 2 }}>
                      {m.sender_name || 'Собеседник'}
                    </span>
                  )}
                  <div
                    style={{
                      maxWidth: '75%',
                      padding: '8px 12px',
                      borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isOwn ? '#B8963E' : '#F5F0EB',
                      color: isOwn ? '#fff' : '#1A1A1A',
                      fontSize: 14,
                      lineHeight: 1.4
                    }}
                  >
                    {m.text}
                  </div>
                  <span style={{ fontSize: 10, color: '#bbb', marginTop: 2 }}>{formatTs(m.created_at)}</span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid #f0ebe4',
              display: 'flex',
              gap: 8
            }}
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Написать сообщение..."
              rows={1}
              style={{
                flex: 1,
                border: '1px solid #e8e0d5',
                borderRadius: 12,
                padding: '8px 12px',
                fontSize: 14,
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
            <button
              onClick={send}
              disabled={sending || !text.trim()}
              style={{
                background: '#B8963E',
                border: 'none',
                borderRadius: 12,
                width: 44,
                height: 44,
                color: '#fff',
                fontSize: 18,
                cursor: 'pointer',
                opacity: !text.trim() || sending ? 0.5 : 1,
                flexShrink: 0
              }}
            >
              ↑
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
