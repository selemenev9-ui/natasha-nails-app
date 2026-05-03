import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVK } from '../contexts/VKContext.jsx';
import ChatDrawer from '../components/ChatDrawer.jsx';
import { API_URL } from '../utils/config.js';
import styles from './ChatScreen.module.css';

const MASTER_IDS = ['80557585', '187729875'];
const AVATAR_COLORS = ['#FFD6CC', '#D6EAFF', '#D6FFE4', '#FFF3CC', '#EDD6FF', '#FFD6EC'];

function normalizeName(rawName) {
  if (!rawName) return 'Клиент';
  const cleaned = rawName.trim();
  if (!cleaned || /^vk[:\s]/i.test(cleaned) || /^id[:\s]/i.test(cleaned)) return 'Клиент';
  return cleaned;
}

function getAvatarMeta(rawName) {
  const normalized = normalizeName(rawName);
  if (normalized === 'Клиент') return { initials: '?', color: '#D9D4CD' };
  const parts = normalized.split(/\s+/);
  const initials =
    ((parts[0]?.[0] || '').toUpperCase() + (parts[1]?.[0] || '').toUpperCase()) ||
    normalized[0].toUpperCase();
  const hash = Array.from(normalized).reduce(
    (acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1),
    0
  );
  return { initials, color: AVATAR_COLORS[hash % AVATAR_COLORS.length] };
}

function formatTs(ts) {
  if (!ts) return '';
  const ms = ts > 1e10 ? ts : ts * 1000;
  return new Date(ms).toLocaleTimeString('ru-RU', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function IconChevronRight() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18L15 12L9 6" />
    </svg>
  );
}

function IconNail() {
  return (
    <svg viewBox="0 0 32 32" width="26" height="26" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="16" cy="10" rx="7" ry="5" />
      <path d="M9 10c0 8 2 14 7 14s7-6 7-14" />
    </svg>
  );
}

// ─── MASTER VIEW: список всех клиентских чатов ────────────────────────────────
function MasterChatView({ currentUser }) {
  const [conversations, setConversations] = useState([]);
  const [activeChatClient, setActiveChatClient] = useState(null);

  const loadConversations = useCallback(() => {
    fetch(`${API_URL}?action=get_conversations`)
      .then((r) => r.json())
      .then((d) => setConversations(d.conversations || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  const handleChatClose = useCallback(() => {
    setActiveChatClient(null);
    loadConversations();
  }, [loadConversations]);

  const clients = useMemo(() => {
    return conversations
      .filter((c) => c.room_id)
      .map((c) => ({
        room_id: c.room_id,
        client_id: c.client_id,
        name: normalizeName(c.sender_name || `ID: ${c.client_id}`),
        lastMessage: c.last_message,
        lastTime: c.last_time,
        unread_count: c.unread_count || 0,
      }))
      .sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));
  }, [conversations]);

  if (!clients.length) {
    return <p className={styles.emptyText}>Сообщений от клиентов пока нет</p>;
  }

  return (
    <div className={styles.list}>
      {clients.map((c) => {
        const avatar = getAvatarMeta(c.name);
        return (
          <motion.div
            key={c.room_id}
            className={styles.chatCard}
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveChatClient(c)}
          >
            <div className={styles.cardAvatarWrap}>
              <div
                className={styles.cardAvatar}
                style={{
                  background: avatar.color,
                  fontSize: 18,
                  fontWeight: 600,
                  color: 'rgba(22,17,12,0.75)',
                }}
              >
                {avatar.initials}
              </div>
              {c.unread_count > 0 && (
                <span className={styles.cardBadge}>
                  {c.unread_count > 99 ? '99+' : c.unread_count}
                </span>
              )}
            </div>
            <div className={styles.cardInfo}>
              <div className={styles.cardRow}>
                <p className={styles.cardName}>{c.name}</p>
                {c.lastTime && (
                  <span className={styles.cardTime}>{formatTs(c.lastTime)}</span>
                )}
              </div>
              {c.lastMessage && (
                <p className={styles.cardSub}>
                  {c.lastMessage.length > 38
                    ? `${c.lastMessage.slice(0, 38)}…`
                    : c.lastMessage}
                </p>
              )}
            </div>
            <span className={styles.cardArrow}>
              <IconChevronRight />
            </span>
          </motion.div>
        );
      })}

      <AnimatePresence>
        {activeChatClient && (
          <ChatDrawer
            appointmentId={activeChatClient.room_id}
            currentUserId={String(currentUser?.id)}
            currentUserName={currentUser?.first_name || 'Мастер'}
            contactName={activeChatClient.name}
            onClose={handleChatClose}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function ChatScreen({ onNavigate, onDrawerStateChange = () => {} }) {
  const { user } = useVK();
  const [chatOpen, setChatOpen] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const isMaster = MASTER_IDS.includes(String(user?.id));
  const chatRoomId = user?.id ? `direct_${user.id}` : null;

  useEffect(() => {
    if (isMaster || !chatRoomId || !user?.id) {
      setLastMessage(null);
      setUnreadCount(0);
      return;
    }
    let cancelled = false;

    const loadLast = () => {
      if (cancelled) return;
      const viewerId = String(user.id);
      fetch(
        `${API_URL}?action=get_messages&appointment_id=${chatRoomId}&viewer_id=${viewerId}`
      )
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return;
          const messages = data.messages || [];
          setLastMessage(messages.length ? messages[messages.length - 1] : null);
          setUnreadCount(Number(data.unread_count) || 0);
        })
        .catch(() => {});
    };

    loadLast();
    return () => { cancelled = true; };
  }, [chatRoomId, user?.id, chatOpen, isMaster]);

  useEffect(() => {
    onDrawerStateChange(chatOpen);
    if (chatOpen) setUnreadCount(0);
  }, [chatOpen, onDrawerStateChange]);

  const renderPreview = () => {
    if (!lastMessage) return 'Написать мастеру...';
    const text = lastMessage.text || '';
    if (text.startsWith('[photo]')) return '📷 Фото';
    if (text.startsWith('[audio]')) return '🎤 Голосовое';
    if (text.startsWith('[booking_card]')) return '✅ Запись создана';
    const trimmed = text.trim();
    if (!trimmed) return 'Написать мастеру...';
    return trimmed.length > 35 ? `${trimmed.slice(0, 35)}…` : trimmed;
  };

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Сообщения</h1>
        <p className={styles.subtitle}>
          {isMaster ? 'Все чаты с клиентами' : 'Чат с вашим мастером'}
        </p>
      </header>

      {isMaster ? (
        <MasterChatView currentUser={user} />
      ) : (
        <>
          <div className={styles.list}>
            <motion.div
              className={styles.chatCard}
              whileTap={{ scale: 0.97 }}
              onClick={() => setChatOpen(true)}
            >
              <div className={styles.cardAvatarWrap}>
                <div className={styles.cardAvatar}>
                  <IconNail />
                </div>
                <span className={styles.cardOnlineDot} />
                {unreadCount > 0 && (
                  <span className={styles.cardBadge}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <div className={styles.cardInfo}>
                <p className={styles.cardName}>Natasha Premium Lab</p>
                <p className={styles.cardSub}>{renderPreview()}</p>
              </div>
              <span className={styles.cardArrow}>
                <IconChevronRight />
              </span>
            </motion.div>
          </div>

          <AnimatePresence>
            {chatOpen && chatRoomId && (
              <ChatDrawer
                appointmentId={chatRoomId}
                currentUserId={String(user?.id)}
                currentUserName={user?.first_name || 'Клиент'}
                contactName="Natasha Premium Lab"
                onClose={() => setChatOpen(false)}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
