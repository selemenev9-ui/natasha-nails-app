import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import bridge from '@vkontakte/vk-bridge';
import { motion, AnimatePresence } from 'framer-motion';
import { useVK } from '../contexts/VKContext.jsx';
import { API_URL } from '../utils/config.js';
import styles from './MasterScreen.module.css';
import ChatDrawer from '../components/ChatDrawer.jsx';

const MASTER_IDS = ['80557585', '187729875', '123456789'];
const CATEGORIES = [
  { id: 'nails', label: 'Маникюр & Педикюр' },
  { id: 'solarium', label: 'Солярий' },
  { id: 'extra', label: 'Дополнительно' }
];

function ChatTab({ appointments, currentUser }) {
  const [activeChatClient, setActiveChatClient] = useState(null);
  const [conversations, setConversations] = useState([]);

  const loadConversations = useCallback(() => {
    fetch(`${API_URL}?action=get_conversations`)
      .then((r) => r.json())
      .then((d) => setConversations(d.conversations || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleChatClose = useCallback(() => {
    setActiveChatClient(null);
    loadConversations();
  }, [loadConversations]);

  const clients = useMemo(() => {
    const map = {};
    appointments.forEach((a) => {
      if (a.client_id && a.client_id !== 'manual') {
        const roomId = `direct_${a.client_id}`;
        map[roomId] = map[roomId] || {
          room_id: roomId,
          client_id: a.client_id,
          name: normalizeName(a.client_name || `ID: ${a.client_id}`),
          visits: 0,
          unread_count: 0
        };
        map[roomId].visits += 1;
      }
    });

    conversations.forEach((c) => {
      const roomId = c.room_id;
      if (!roomId) return;
      if (!map[roomId]) {
        map[roomId] = {
          room_id: roomId,
          client_id: c.client_id,
          name: normalizeName(c.sender_name || `ID: ${c.client_id}`),
          visits: 0,
          unread_count: 0
        };
      }
      map[roomId].lastMessage = c.last_message;
      map[roomId].lastTime = c.last_time;
      map[roomId].unread_count = c.unread_count || 0;
    });

    return Object.values(map).sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));
  }, [appointments, conversations]);

  const formatTs = (ts) => {
    if (!ts) return '';
    const ms = ts > 1e10 ? ts : ts * 1000;
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  if (!clients.length) {
    return <p style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>Клиентов пока нет</p>;
  }

  return (
    <div style={{ padding: '8px 0' }}>
      {clients.map((c) => (
        <div
          key={c.room_id || c.client_id || c.name}
          className={styles.chatCard}
          onClick={() => setActiveChatClient(c)}
        >
          <div className={styles.chatAvatar}>
            {c.name?.charAt(0)?.toUpperCase() || '?'}
            {c.unread_count > 0 && (
              <span className={styles.chatBadge}>{c.unread_count}</span>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p className={styles.chatName}>{c.name}</p>
              {c.lastTime && <span className={styles.chatTime}>{formatTs(c.lastTime)}</span>}
            </div>
            {c.lastMessage && <p className={styles.chatPreview}>{c.lastMessage}</p>}
          </div>
        </div>
      ))}

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
const AVATAR_COLORS = ['#FFD6CC', '#D6EAFF', '#D6FFE4', '#FFF3CC', '#EDD6FF', '#FFD6EC'];
const FALLBACK_AVATAR = { initials: '?', color: '#D9D4CD' };

function normalizeName(rawName) {
  if (!rawName) return 'Клиент';
  const cleaned = rawName.trim();
  if (!cleaned || /^vk[:\s]/i.test(cleaned) || /^id[:\s]/i.test(cleaned)) return 'Клиент';
  return cleaned;
}

function getAvatarMeta(rawName) {
  const normalized = normalizeName(rawName);
  if (normalized === 'Клиент') return FALLBACK_AVATAR;
  const parts = normalized.split(/\s+/);
  const initials = ((parts[0]?.[0] || '').toUpperCase() + (parts[1]?.[0] || '').toUpperCase()) || normalized[0].toUpperCase();
  const hash = Array.from(normalized).reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1), 0);
  return { initials, color: AVATAR_COLORS[hash % AVATAR_COLORS.length] };
}

function renderEmptyState(icon, text) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>{icon}</div>
      <p>{text}</p>
    </div>
  );
}

// ─── GRAPH TAB ────────────────────────────────────────────────────────────────
function GraphTab() {
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ start_time: '10:00', end_time: '20:00', is_day_off: false });

  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
  });

  const loadConfig = useCallback(async (date) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?action=day_config&date=${date}`);
      const data = await res.json();
      const cfg = data.config || { start_time: '10:00', end_time: '20:00', is_day_off: false };
      setForm({ start_time: cfg.start_time, end_time: cfg.end_time, is_day_off: cfg.is_day_off });
    } catch(e) {}
    setLoading(false);
  }, []);

  useEffect(() => { loadConfig(selectedDate); }, [selectedDate, loadConfig]);

  const save = async () => {
    setSaving(true);
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_availability', date: selectedDate, ...form })
    });
    setSaving(false);
    loadConfig(selectedDate);
  };

  const HOURS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'];

  return (
    <div className={styles.tabContent}>
      <p className={styles.groupLabel}>Выберите день</p>
      <div className={styles.dayPicker}>
        {days.map(day => {
          const d = new Date(day + 'T12:00:00Z');
          return (
            <button key={day}
              className={`${styles.dayBtn} ${selectedDate === day ? styles.dayBtnActive : ''} glass-panel`}
              onClick={() => setSelectedDate(day)}>
              <span className={styles.dayName}>{d.toLocaleDateString('ru-RU', { weekday: 'short' })}</span>
              <span className={styles.dayNum}>{d.getUTCDate()}</span>
            </button>
          );
        })}
      </div>

      {loading ? <p className={styles.empty}>Загрузка…</p> : (
        <div className={`${styles.card} glass-panel`}>
          <p className={styles.cardTitle}>
            {new Date(selectedDate + 'T12:00:00Z').toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>

          <div className={styles.toggleRow}>
            <span className={styles.cardSub}>Выходной день</span>
            <button
              className={`${styles.toggle} ${form.is_day_off ? styles.toggleOn : ''}`}
              onClick={() => setForm(v => ({ ...v, is_day_off: !v.is_day_off }))}>
              <span className={styles.toggleKnob} />
            </button>
          </div>

          {!form.is_day_off && (
            <>
              <div className={styles.timeSelectRow}>
                <div className={styles.timeSelectBlock}>
                  <p className={styles.cardSub}>Начало</p>
                  <select className={styles.editInput} value={form.start_time}
                    onChange={e => setForm(v => ({ ...v, start_time: e.target.value }))}>
                    {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className={styles.timeSelectBlock}>
                  <p className={styles.cardSub}>Конец</p>
                  <select className={styles.editInput} value={form.end_time}
                    onChange={e => setForm(v => ({ ...v, end_time: e.target.value }))}>
                    {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
              <p className={styles.cardSub}>
                Рабочих часов: {Number(form.end_time.split(':')[0]) - Number(form.start_time.split(':')[0])}
              </p>
            </>
          )}

          <button className={styles.btnSave} disabled={saving} onClick={save}>
            {saving ? 'Сохранение…' : '💾 Сохранить'}
          </button>
        </div>
      )}
    </div>
  );
}
const STATUS_LABELS = {
  pending:   { label: 'Ожидает',    color: '#B8963E' },
  confirmed: { label: 'Подтверждено', color: '#10b981' },
  completed: { label: 'Выполнено',  color: '#6366f1' },
  cancelled: { label: 'Отменено',   color: '#ef4444' }
};
const WORK_START = 10;
const WORK_END   = 20;

function isMaster(userId) { return MASTER_IDS.includes(String(userId)); }

function formatTs(ts) {
  if (!ts) return '—';
  const ms = ts > 1e10 ? ts : ts * 1000;
  return new Date(ms).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}
function formatDate(ts) {
  if (!ts) return '—';
  const ms = ts > 1e10 ? ts : ts * 1000;
  return new Date(ms).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}
function tsToTime(ts) {
  if (!ts) return '';
  const ms = ts > 1e10 ? ts : ts * 1000;
  return new Date(ms).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}
function dateKey(ts) {
  if (!ts) return '';
  const ms = ts > 1e10 ? ts : ts * 1000;
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
function todayKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// ─── TODAY TAB ────────────────────────────────────────────────────────────────
function TodayTab({ appointments, services, onAction, onAddManual, onReschedule, onChat }) {
  const today = todayKey();
  const todayAppts = appointments
    .filter(a => dateKey(a.appointment_date) === today)
    .sort((a, b) => a.appointment_date - b.appointment_date);

  const pending = appointments.filter(a => a.status === 'pending');
  const activeToday = todayAppts.filter(a => a.status !== 'cancelled');
  const todayRevenue = activeToday.reduce((s, a) => s + (a.total_price || 0), 0);
  const nextAppt = activeToday.find(a => {
    const ms = a.appointment_date > 1e10 ? a.appointment_date : a.appointment_date * 1000;
    return ms > Date.now();
  });
  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Доброе утро' : greetingHour < 17 ? 'Добрый день' : 'Добрый вечер';
  const [nextCountdown, setNextCountdown] = useState('');
  const [nextDiffMs, setNextDiffMs] = useState(null);

  useEffect(() => {
    if (!nextAppt) {
      setNextCountdown('');
      setNextDiffMs(null);
      return;
    }
    const updateCountdown = () => {
      const ms = (nextAppt.appointment_date > 1e10 ? nextAppt.appointment_date : nextAppt.appointment_date * 1000) - Date.now();
      setNextDiffMs(ms);
      if (ms <= 0) {
        setNextCountdown('СЕЙЧАС ⚡');
        return;
      }
      const totalMinutes = Math.max(1, Math.round(ms / 60000));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      let label = 'через ';
      if (hours > 0) {
        label += `${hours} ч`;
        if (minutes) label += ` ${minutes} мин`;
      } else {
        label += `${minutes} мин`;
      }
      if (totalMinutes <= 5) label += ' 🔥';
      setNextCountdown(label);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 30000);
    return () => clearInterval(interval);
  }, [nextAppt]);

  return (
    <div className={styles.tabContent}>
      {/* Виджет дня */}
      <div className={`${styles.card} ${styles.greetingCard} glass-panel`}>
        <p className={styles.cardTitle}>{greeting}, Наташа! ✨</p>
        {activeToday.length === 0 ? (
          <p className={styles.cardSub}>Сегодня записей нет — можно отдохнуть 💅</p>
        ) : (
          <>
            <p className={styles.cardSub}>
              Сегодня {activeToday.length} клиент{activeToday.length === 1 ? '' : activeToday.length < 5 ? 'а' : 'ов'} · ожидаемый доход {todayRevenue.toLocaleString('ru-RU')} ₽
            </p>
            {nextAppt && (
              <p className={styles.cardSub}>
                ⏰ Следующий: {nextAppt.client_name || `VK: ${nextAppt.client_id}`} в {tsToTime(nextAppt.appointment_date)}
              </p>
            )}
          </>
        )}
      </div>

      {nextAppt && (
        <div className={`${styles.card} ${styles.nextCard} glass-panel ${nextDiffMs !== null && nextDiffMs <= 15 * 60 * 1000 ? styles.nextHot : ''}`}>
          <p className={styles.cardSub}>Следующий клиент</p>
          <div className={styles.cardRow}>
            <div className={styles.cardMain}>
              {(() => {
                const label = normalizeName(nextAppt.client_name || `VK: ${nextAppt.client_id}`);
                const avatar = getAvatarMeta(label);
                return <div className={styles.avatar} style={{ background: avatar.color }}>{avatar.initials}</div>;
              })()}
              <div>
                <p className={styles.cardTitle}>{normalizeName(nextAppt.client_name || `VK: ${nextAppt.client_id}`)}</p>
                <p className={styles.cardSub}>{nextAppt.title || nextAppt.service_id} · {tsToTime(nextAppt.appointment_date)}</p>
              </div>
            </div>
            <div className={styles.nextCountdown}>{nextCountdown}</div>
          </div>
        </div>
      )}

      {/* Новые заявки */}
      {pending.length > 0 && (
        <div className={styles.pendingBlock}>
          <p className={styles.groupLabel}>🔔 Новые заявки — {pending.length}</p>
          {pending.map(a => (
            <AppCard
              key={a.id}
              a={a}
              onAction={onAction}
              onReschedule={onReschedule}
              onChat={onChat}
              showActions
            />
          ))}
        </div>
      )}

      {/* Расписание сегодня */}
      <p className={styles.groupLabel}>📅 Сегодня</p>
      <div className={styles.timeline}>
        {Array.from({ length: WORK_END - WORK_START }, (_, i) => {
          const hour = WORK_START + i;
          const appt = todayAppts.find(a => {
            const ms = a.appointment_date > 1e10 ? a.appointment_date : a.appointment_date * 1000;
            return new Date(ms).getHours() === hour;
          });
          return (
            <div key={hour} className={styles.timeSlot}>
              <span className={styles.timeLabel}>{String(hour).padStart(2,'0')}:00</span>
              {appt ? (
                <div className={`${styles.timeAppt} glass-panel`}
                  style={{ borderLeft: `3px solid ${STATUS_LABELS[appt.status]?.color || '#6366f1'}` }}>
                  <p className={styles.timeApptTitle}>{appt.client_name || `ID: ${appt.client_id}`}</p>
                  <p className={styles.timeApptSub}>{appt.title || appt.service_id}</p>
                  {appt.total_price > 0 && <p className={styles.timeApptPrice}>{appt.total_price.toLocaleString('ru-RU')} ₽</p>}
                </div>
              ) : (
                <div className={styles.timeEmpty} />
              )}
            </div>
          );
        })}
      </div>

      <button className={styles.btnAdd} onClick={onAddManual}>
        + Добавить запись вручную
      </button>
    </div>
  );
}

// ─── APP CARD ─────────────────────────────────────────────────────────────────
function AppCard({ a, onAction, showActions, onReschedule, onChat }) {
  const st = STATUS_LABELS[a.status] || STATUS_LABELS.pending;
  const [expanded, setExpanded] = useState(false);
  const clientLabel = normalizeName(a.client_name || `VK: ${a.client_id}`);
  const avatar = getAvatarMeta(clientLabel);
  const [touchOffset, setTouchOffset] = useState(0);
  const startXRef = useRef(null);
  const supportsTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator?.maxTouchPoints > 0);
  const threshold = 60;

  const resetSwipe = () => {
    setTouchOffset(0);
    startXRef.current = null;
  };

  const triggerSwipeAction = (direction) => {
    if (direction === 'right' && a.status === 'pending') {
      onAction('confirm_appointment', a.id);
      return true;
    }
    if (direction === 'left' && (a.status === 'pending' || a.status === 'confirmed')) {
      onAction('cancel_appointment', a.id);
      return true;
    }
    return false;
  };

  const handleTouchStart = (event) => {
    if (!supportsTouch || event.touches.length === 0) return;
    startXRef.current = event.touches[0].clientX;
  };

  const handleTouchMove = (event) => {
    if (startXRef.current === null) return;
    const delta = event.touches[0].clientX - startXRef.current;
    setTouchOffset(delta);
  };

  const handleTouchEnd = () => {
    if (startXRef.current === null) return;
    const delta = touchOffset;
    const direction = delta > threshold ? 'right' : delta < -threshold ? 'left' : null;
    if (direction && triggerSwipeAction(direction)) {
      resetSwipe();
      return;
    }
    resetSwipe();
  };

  const touchHandlers = supportsTouch ? {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: resetSwipe
  } : {};

  const hintOpacity = Math.min(1, Math.abs(touchOffset) / threshold);
  const swipeStyle = supportsTouch ? {
    transform: `translateX(${touchOffset}px)`,
    background: touchOffset > 5 ? '#E8F5E9' : touchOffset < -5 ? '#FFEBEE' : undefined
  } : undefined;

  return (
    <div className={`${styles.card} glass-panel`}
      style={{ borderLeft: `3px solid ${st.color}`, ...swipeStyle }}
      {...touchHandlers}>
      <div className={styles.cardRow} onClick={() => setExpanded(v => !v)}>
        <div className={styles.cardMain}>
          <div className={styles.avatar} style={{ background: avatar.color }}>{avatar.initials}</div>
          <div>
            <p className={styles.cardTitle}>{clientLabel}</p>
            <p className={styles.cardSub}>{a.title || a.service_id} · {tsToTime(a.appointment_date)}</p>
            <p className={styles.cardSub}>{formatDate(a.appointment_date)}</p>
          </div>
        </div>
        <div className={styles.cardRight}>
          {a.total_price > 0 && <p className={styles.cardPrice}>{a.total_price.toLocaleString('ru-RU')} ₽</p>}
          <motion.span
            key={a.status}
            className={styles.statusBadge}
            style={{ background: st.color + '33', color: st.color }}
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.3 }}
          >
            {st.label}
          </motion.span>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            {a.client_phone && <p className={styles.cardSub}>📞 {a.client_phone}</p>}
            {a.notes && <p className={styles.cardSub}>📝 {a.notes}</p>}
            {showActions && a.status === 'pending' && (
              <div className={styles.actionsRow}>
                <button className={styles.btnConfirm} onClick={() => onAction('confirm_appointment', a.id)}>
                  ✓ Подтвердить
                </button>
                <button className={styles.btnCancelAppt} onClick={() => onAction('cancel_appointment', a.id)}>
                  ✕ Отклонить
                </button>
                {onReschedule && (
                  <button className={styles.btnEdit} onClick={() => onReschedule(a)}>
                    ↺ Перенести
                  </button>
                )}
                {onChat && (
                  <button className={styles.btnEdit} onClick={() => onChat(a)}>
                    💬
                  </button>
                )}
              </div>
            )}
            {a.status === 'confirmed' && (
              <div className={styles.actionsRow}>
                <button className={styles.btnComplete} onClick={() => onAction('complete_appointment', a.id)}>
                  ✓ Выполнено
                </button>
                <button className={styles.btnCancelAppt} onClick={() => onAction('cancel_appointment', a.id)}>
                  Отменить
                </button>
                {onReschedule && (
                  <button className={styles.btnEdit} onClick={() => onReschedule(a)}>
                    ↺ Перенести
                  </button>
                )}
                {onChat && (
                  <button className={styles.btnEdit} onClick={() => onChat(a)}>
                    💬
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {supportsTouch && (
        <div className={styles.swipeHints} style={{ opacity: hintOpacity }}>
          <span className={styles.swipeHint}>✕</span>
          <span className={styles.swipeHint}>✓</span>
        </div>
      )}
    </div>
  );
}

// ─── SCHEDULE TAB ─────────────────────────────────────────────────────────────
function ScheduleTab({ appointments, onAction, onAddManual, onReschedule, onChat }) {
  const [selectedDate, setSelectedDate] = useState(todayKey());

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  });

  const dayAppts = appointments
    .filter(a => dateKey(a.appointment_date) === selectedDate)
    .sort((a, b) => a.appointment_date - b.appointment_date);

  return (
    <div className={styles.tabContent}>
      {/* Дни недели */}
      <div className={styles.dayPicker}>
        {days.map(day => {
          const d = new Date(day + 'T12:00:00');
          const hasAppts = appointments.some(a => dateKey(a.appointment_date) === day);
          return (
            <button key={day}
              className={`${styles.dayBtn} ${selectedDate === day ? styles.dayBtnActive : ''} glass-panel`}
              onClick={() => setSelectedDate(day)}>
              <span className={styles.dayName}>
                {d.toLocaleDateString('ru-RU', { weekday: 'short' })}
              </span>
              <span className={styles.dayNum}>{d.getDate()}</span>
              {hasAppts && <span className={styles.dayDot} />}
            </button>
          );
        })}
      </div>

      {dayAppts.length === 0
        ? <p className={styles.empty}>Записей нет</p>
        : dayAppts.map((a) => (
            <AppCard
              key={a.id}
              a={a}
              onAction={onAction}
              onReschedule={onReschedule}
              onChat={onChat}
              showActions
            />
          ))
      }

      <button className={styles.btnAdd} onClick={onAddManual}>+ Добавить запись</button>
    </div>
  );
}

// ─── CLIENTS TAB ──────────────────────────────────────────────────────────────
function ClientsTab({ appointments, onModalOpen, onModalClose }) {
  const [selectedClient, setSelectedClient] = useState(null);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const clientModalRef = useRef(false);

  useEffect(() => {
    clientModalRef.current = Boolean(selectedClient);
  }, [selectedClient]);

  useEffect(() => () => {
    if (clientModalRef.current) {
      onModalClose?.();
    }
  }, [onModalClose]);

  const clientMap = {};
  appointments.forEach(a => {
    const key = a.client_id;
    if (!clientMap[key]) {
      clientMap[key] = {
        id: key,
        name: a.client_name || (key === 'manual' ? 'Ручная запись' : `VK ID: ${key}`),
        phone: a.client_phone || '',
        visits: 0,
        spent: 0,
        lastVisit: 0
      };
    }
    clientMap[key].visits++;
    clientMap[key].spent += a.total_price || 0;
    if (a.appointment_date > clientMap[key].lastVisit) {
      clientMap[key].lastVisit = a.appointment_date;
      if (a.client_name) clientMap[key].name = a.client_name;
      if (a.client_phone) clientMap[key].phone = a.client_phone;
    }
  });

  const clients = Object.values(clientMap).sort((a, b) => b.lastVisit - a.lastVisit);

  // Спящие клиенты — не были более 35 дней
  const sleepingClients = clients.filter(c => {
    const daysSince = (Date.now() / 1000 - c.lastVisit) / 86400;
    return daysSince > 35;
  });

  const openClient = async (c) => {
    if (!selectedClient) onModalOpen?.();
    setSelectedClient(c);
    setLoadingNotes(true);
    try {
      const res = await fetch(`${API_URL}?action=client_notes&client_id=${c.id}`);
      const data = await res.json();
      setNotes(data.notes || '');
    } catch(e) { setNotes(''); }
    setLoadingNotes(false);
  };

  const closeClient = () => {
    setSelectedClient(null);
    onModalClose?.();
  };

  const saveNotes = async () => {
    if (!selectedClient) return;
    setSavingNotes(true);
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_client_notes', client_id: selectedClient.id, notes })
    });
    setSavingNotes(false);
  };

  if (!clients.length) return <p className={styles.empty}>Клиентов пока нет</p>;

  return (
    <div className={styles.tabContent}>

      {/* Спящие клиенты */}
      {sleepingClients.length > 0 && (
        <div className={styles.pendingBlock}>
          <p className={styles.groupLabel}>😴 Давно не было — {sleepingClients.length} чел.</p>
          {sleepingClients.map(c => (
            <div key={c.id} className={`${styles.card} glass-panel`}
              style={{ borderLeft: '3px solid #f59e0b' }}>
              <div className={styles.cardRow}>
                <div className={styles.cardMain}>
                  {(() => {
                    const avatar = getAvatarMeta(c.name);
                    return <div className={styles.avatar} style={{ background: avatar.color }}>{avatar.initials}</div>;
                  })()}
                  <div>
                    <p className={styles.cardTitle}>{c.name}</p>
                    <p className={styles.cardSub}>
                      Последний визит: {formatDate(c.lastVisit)} · {Math.round((Date.now()/1000 - c.lastVisit)/86400)} дн. назад
                    </p>
                  </div>
                </div>
                <a href={`https://vk.com/im?sel=${c.id}`} target="_blank" rel="noreferrer"
                  className={styles.btnSave} style={{ textDecoration: 'none', fontSize: 12 }}>
                  Написать
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className={styles.groupLabel}>Все клиенты — {clients.length}</p>

      {clients.length === 0 ? renderEmptyState('👤', 'Клиенты появятся после первых записей') : clients.map(c => (
        <div key={c.id} className={`${styles.card} glass-panel`}
          style={{ cursor: 'pointer' }}
          onClick={() => openClient(c)}>
          <div className={styles.cardRow}>
            <div className={styles.cardMain}>
              {(() => {
                const avatar = getAvatarMeta(c.name);
                return <div className={styles.avatar} style={{ background: avatar.color }}>{avatar.initials}</div>;
              })()}
              <div>
                <p className={styles.cardTitle}>{c.name}</p>
                {c.phone && <p className={styles.cardSub}>📞 {c.phone}</p>}
                <p className={styles.cardSub}>Последний визит: {formatDate(c.lastVisit)}</p>
              </div>
            </div>
            <div className={styles.cardRight}>
              <p className={styles.cardPrice}>{c.spent.toLocaleString('ru-RU')} ₽</p>
              <p className={styles.cardSub}>{c.visits} визит{c.visits === 1 ? '' : c.visits < 5 ? 'а' : 'ов'}</p>
            </div>
          </div>
        </div>
      ))}

      {/* Боковая панель клиента */}
      <AnimatePresence>
        {selectedClient && (
          <motion.div className={styles.modalOverlay}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeClient}>
            <motion.div className={`${styles.modal} glass-panel`}
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }} onClick={e => e.stopPropagation()}>

              <p className={styles.cardTitle}>{selectedClient.name}</p>
              {selectedClient.phone && <p className={styles.cardSub}>📞 {selectedClient.phone}</p>}
              <div className={styles.analyticsGrid} style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className={`${styles.analyticsCard} glass-panel`}>
                  <span className={styles.statLabel}>Визитов</span>
                  <span className={styles.statNumber}>{selectedClient.visits}</span>
                </div>
                <div className={`${styles.analyticsCard} glass-panel`}>
                  <span className={styles.statLabel}>Потрачено</span>
                  <span className={styles.statNumber} style={{ fontSize: 16 }}>
                    {selectedClient.spent.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </div>

              <p className={styles.label}>📝 Заметки о клиенте</p>
              {loadingNotes ? (
                <p className={styles.cardSub}>Загрузка…</p>
              ) : (
                <textarea
                  className={styles.editInput}
                  rows={4}
                  placeholder="Любит латте без сахара, аллергия на праймер X, кличка собаки — Буся..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              )}

              <div className={styles.editRow}>
                <button className={styles.btnSave} disabled={savingNotes} onClick={saveNotes}>
                  {savingNotes ? '…' : '💾 Сохранить'}
                </button>
                <a href={`https://vk.com/im?sel=${selectedClient.id}`} target="_blank" rel="noreferrer"
                  className={styles.btnCancel} style={{ textDecoration: 'none', textAlign: 'center' }}>
                  Написать в ВК
                </a>
              </div>

              <button className={styles.btnCancel} onClick={closeClient}>
                Закрыть
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── ANALYTICS TAB ────────────────────────────────────────────────────────────
function AnalyticsTab({ appointments, services }) {
  if (!appointments.length) return renderEmptyState('📊', 'Данные появятся после первых визитов');

  const now = new Date();
  const thisMonth = appointments.filter(a => {
    const d = new Date(a.appointment_date > 1e10 ? a.appointment_date : a.appointment_date * 1000);
    return d.getUTCMonth() === now.getUTCMonth() && d.getUTCFullYear() === now.getUTCFullYear();
  });
  const thisWeek = appointments.filter(a => {
    const ms = a.appointment_date > 1e10 ? a.appointment_date : a.appointment_date * 1000;
    return (Date.now() - ms) < 7 * 86400 * 1000;
  });

  const monthRevenue = thisMonth.reduce((s, a) => s + (a.total_price || 0), 0);
  const weekRevenue  = thisWeek.reduce((s, a) => s + (a.total_price || 0), 0);
  const totalRevenue = appointments.reduce((s, a) => s + (a.total_price || 0), 0);
  const completed    = appointments.filter(a => a.status === 'completed').length;
  const uniqueClients = new Set(appointments.map(a => a.client_id)).size;
  const repeatClients = Object.values(
    appointments.reduce((acc, a) => { acc[a.client_id] = (acc[a.client_id] || 0) + 1; return acc; }, {})
  ).filter(v => v > 1).length;

  // Выручка в час по услугам
  const serviceStats = {};
  appointments.forEach(a => {
    const key = a.title || a.service_id;
    const svc = services.find(s => s.id === a.service_id);
    const mins = svc?.durationMinutes || svc?.duration_minutes || 60;
    if (!serviceStats[key]) serviceStats[key] = { revenue: 0, count: 0, totalMins: 0 };
    serviceStats[key].revenue    += a.total_price || 0;
    serviceStats[key].count      += 1;
    serviceStats[key].totalMins  += mins;
  });
  const serviceRating = Object.entries(serviceStats)
    .map(([name, s]) => ({
      name,
      count: s.count,
      revenue: s.revenue,
      perHour: s.totalMins > 0 ? Math.round(s.revenue / s.totalMins * 60) : 0
    }))
    .sort((a, b) => b.perHour - a.perHour);

  return (
    <div className={styles.tabContent}>

      {/* Период */}
      <div className={styles.analyticsGrid}>
        <div className={`${styles.analyticsCard} glass-panel`}>
          <span className={styles.statLabel}>За неделю</span>
          <span className={styles.statNumber}>{weekRevenue.toLocaleString('ru-RU')} ₽</span>
          <span className={styles.statSub}>{thisWeek.length} записей</span>
        </div>
        <div className={`${styles.analyticsCard} glass-panel`}>
          <span className={styles.statLabel}>За месяц</span>
          <span className={styles.statNumber}>{monthRevenue.toLocaleString('ru-RU')} ₽</span>
          <span className={styles.statSub}>{thisMonth.length} записей</span>
        </div>
        <div className={`${styles.analyticsCard} glass-panel`}>
          <span className={styles.statLabel}>Всего заработано</span>
          <span className={styles.statNumber}>{totalRevenue.toLocaleString('ru-RU')} ₽</span>
          <span className={styles.statSub}>{completed} выполнено</span>
        </div>
        <div className={`${styles.analyticsCard} glass-panel`}>
          <span className={styles.statLabel}>Клиентская база</span>
          <span className={styles.statNumber}>{uniqueClients}</span>
          <span className={styles.statSub}>{repeatClients} постоянных</span>
        </div>
      </div>

      {/* Выручка за 7 дней */}
      <p className={styles.groupLabel}>📊 Выручка за 7 дней</p>
      <div className={styles.barChart}>
        {(() => {
          const series = Array.from({ length: 7 }).map((_, idx) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - idx));
            const key = dateKey(date.getTime());
            const revenue = appointments
              .filter(a => dateKey(a.appointment_date) === key)
              .reduce((sum, appt) => sum + (appt.total_price || 0), 0);
            return { key, revenue, label: date.toLocaleDateString('ru-RU', { weekday: 'short' }).replace('.', '') };
          });
          const max = Math.max(...series.map(item => item.revenue), 1);
          const today = todayKey();
          return series.map(({ key, revenue, label }) => {
            const height = Math.round((revenue / max) * 100);
            const isToday = key === today;
            return (
              <div key={key} className={styles.barColumn}>
                <div className={styles.barWrapper}>
                  <div
                    className={`${styles.bar} ${isToday ? styles.barToday : ''}`}
                    style={{ height: `${height}%`, background: revenue ? '#B8963E' : '#E0D7C3' }}
                  />
                </div>
                <span className={styles.barLabel}>{label}</span>
                {revenue > 0 && <span className={styles.barValue}>{revenue.toLocaleString('ru-RU')} ₽</span>}
              </div>
            );
          });
        })()}
      </div>

      {/* Рейтинг услуг по выручке в час */}
      <p className={styles.groupLabel}>💰 Рейтинг услуг (выручка/час)</p>
      {serviceRating.map((s, i) => (
        <div key={s.name} className={`${styles.card} glass-panel`}>
          <div className={styles.cardRow}>
            <div>
              <p className={styles.cardTitle}>
                {i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : ''}{s.name}
              </p>
              <p className={styles.cardSub}>{s.count} раз · {s.revenue.toLocaleString('ru-RU')} ₽ итого</p>
            </div>
            <div className={styles.cardRight}>
              <p className={styles.cardPrice}>{s.perHour.toLocaleString('ru-RU')} ₽/ч</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── SERVICES TAB ────────────────────────────────────────────────────────────
function ServicesTab() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newService, setNewService] = useState({ title: '', category: 'nails', price: '', duration_minutes: '' });
  const [adding, setAdding] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API_URL}?action=all_services`)
      .then(r => r.json())
      .then(d => setServices(d.services || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveEdit = async () => {
    setSaving(true);
    await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_service', id: editId, ...editData }) });
    setEditId(null); load(); setSaving(false);
  };

  const toggleActive = async (s) => {
    await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_service', id: s.id, is_active: !s.isActive }) });
    load();
  };

  const confirmDelete = async (id) => {
    await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_service', id }) });
    setDeleteId(null); load();
  };

  const addService = async () => {
    if (!newService.title) return;
    setAdding(true);
    await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_service', ...newService }) });
    setShowAdd(false);
    setNewService({ title: '', category: 'nails', price: '', duration_minutes: '' });
    load(); setAdding(false);
  };

  if (loading) return <p className={styles.empty}>Загрузка…</p>;

  return (
    <div className={styles.tabContent}>
      <button className={styles.btnAdd} onClick={() => setShowAdd(v => !v)}>
        {showAdd ? '✕ Отмена' : '+ Добавить услугу'}
      </button>
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className={`${styles.card} glass-panel`}>
            <p className={styles.cardTitle}>Новая услуга</p>
            <input className={styles.editInput} placeholder="Название" value={newService.title}
              onChange={e => setNewService(v => ({ ...v, title: e.target.value }))} />
            <select className={styles.editInput} value={newService.category}
              onChange={e => setNewService(v => ({ ...v, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <div className={styles.editRow}>
              <input className={styles.editInput} placeholder="Цена ₽" type="number" value={newService.price}
                onChange={e => setNewService(v => ({ ...v, price: e.target.value }))} />
              <input className={styles.editInput} placeholder="Минут" type="number" value={newService.duration_minutes}
                onChange={e => setNewService(v => ({ ...v, duration_minutes: e.target.value }))} />
            </div>
            <button className={styles.btnSave} disabled={adding} onClick={addService}>
              {adding ? 'Сохранение…' : 'Добавить'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {services.map(s => (
        <div key={s.id} className={`${styles.card} glass-panel ${!s.isActive ? styles.cardMuted : ''}`}>
          {editId === s.id ? (
            <>
              <input className={styles.editInput} value={editData.title}
                onChange={e => setEditData(v => ({ ...v, title: e.target.value }))} />
              <div className={styles.editRow}>
                <input className={styles.editInput} type="number" placeholder="Цена" value={editData.price}
                  onChange={e => setEditData(v => ({ ...v, price: e.target.value }))} />
                <input className={styles.editInput} type="number" placeholder="Минут" value={editData.duration_minutes}
                  onChange={e => setEditData(v => ({ ...v, duration_minutes: e.target.value }))} />
              </div>
              <div className={styles.editRow}>
                <button className={styles.btnSave} disabled={saving} onClick={saveEdit}>{saving ? '…' : 'Сохранить'}</button>
                <button className={styles.btnCancel} onClick={() => setEditId(null)}>Отмена</button>
              </div>
            </>
          ) : (
            <>
              <div className={styles.cardRow}>
                <p className={styles.cardTitle}>{s.title}{!s.isActive && <span className={styles.hiddenBadge}>скрыта</span>}</p>
                <p className={styles.cardPrice}>{s.price}</p>
              </div>
              <p className={styles.cardSub}>{s.duration} · {s.category}</p>
              <div className={styles.actionsRow}>
                <button className={styles.btnEdit} onClick={() => { setEditId(s.id); setEditData({ title: s.title, price: s.basePrice, duration_minutes: s.durationMinutes }); }}>✏️ Изменить</button>
                <button className={styles.btnEdit} onClick={() => toggleActive(s)}>{s.isActive ? '👁 Скрыть' : '👁 Показать'}</button>
                {deleteId === s.id
                  ? <><button className={styles.btnDelete} onClick={() => confirmDelete(s.id)}>Удалить?</button>
                      <button className={styles.btnCancel} onClick={() => setDeleteId(null)}>Нет</button></>
                  : <button className={styles.btnDeleteSoft} onClick={() => setDeleteId(s.id)}>🗑</button>}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── MANUAL BOOKING MODAL ─────────────────────────────────────────────────────
function ManualBookingModal({ services, onClose, onSave, onModalOpen, onModalClose }) {
  const [form, setForm] = useState({
    service_id: services[0]?.id || '',
    client_name: '', client_phone: '',
    date: todayKey(), time: '10:00',
    total_price: '', notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    onModalOpen?.();
    return () => onModalClose?.();
  }, [onModalOpen, onModalClose]);

  const handleSave = async () => {
    if (!form.service_id || !form.date || !form.time) return;
    setSaving(true);
    await fetch(API_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_appointment', ...form })
    });
    setSaving(false);
    onSave();
    onClose();
  };

  return (
    <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}>
      <motion.div className={`${styles.modal} glass-panel`} initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} onClick={e => e.stopPropagation()}>
        <p className={styles.cardTitle}>Новая запись</p>

        <select className={styles.editInput} value={form.service_id}
          onChange={e => setForm(v => ({ ...v, service_id: e.target.value }))}>
          {services.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>

        <input className={styles.editInput} placeholder="Имя клиента" value={form.client_name}
          onChange={e => setForm(v => ({ ...v, client_name: e.target.value }))} />
        <input className={styles.editInput} placeholder="Телефон" value={form.client_phone}
          onChange={e => setForm(v => ({ ...v, client_phone: e.target.value }))} />

        <div className={styles.editRow}>
          <input className={styles.editInput} type="date" value={form.date}
            onChange={e => setForm(v => ({ ...v, date: e.target.value }))} />
          <input className={styles.editInput} type="time" value={form.time}
            onChange={e => setForm(v => ({ ...v, time: e.target.value }))} />
        </div>

        <input className={styles.editInput} placeholder="Сумма ₽" type="number" value={form.total_price}
          onChange={e => setForm(v => ({ ...v, total_price: e.target.value }))} />
        <input className={styles.editInput} placeholder="Заметка (необязательно)" value={form.notes}
          onChange={e => setForm(v => ({ ...v, notes: e.target.value }))} />

        <div className={styles.editRow}>
          <button className={styles.btnSave} disabled={saving} onClick={handleSave}>
            {saving ? 'Сохранение…' : 'Записать'}
          </button>
          <button className={styles.btnCancel} onClick={onClose}>Отмена</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ActionCommentModal({ action, appointment, onConfirm, onCancel }) {
  const [comment, setComment] = useState('');

  const titles = {
    confirm_appointment: '✓ Подтвердить запись',
    cancel_appointment: '✕ Отменить запись',
    complete_appointment: '✓ Отметить выполненной'
  };
  const placeholders = {
    confirm_appointment: 'Например: жду вас, вход со двора...',
    cancel_appointment: 'Например: заболела, перезвоню завтра...',
    complete_appointment: 'Например: всё прошло отлично!'
  };

  return (
    <motion.div
      className={styles.modalOverlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className={`${styles.modal} glass-panel`}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className={styles.cardTitle}>{titles[action]}</p>
        <p className={styles.cardSub}>
          {(appointment?.client_name && normalizeName(appointment.client_name)) || 'Клиент'} · {appointment?.title}
        </p>

        <textarea
          className={styles.editInput}
          rows={3}
          placeholder={placeholders[action]}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          style={{ resize: 'none', marginTop: 12 }}
          autoFocus
        />
        <p className={styles.cardSub} style={{ fontSize: 11, marginTop: 4 }}>
          Комментарий отправится клиенту в VK
        </p>

        <div className={styles.actionsRow} style={{ marginTop: 12 }}>
          <button className={styles.btnConfirm} onClick={() => onConfirm(comment)}>
            Подтвердить
          </button>
          <button className={styles.btnCancel} onClick={onCancel}>
            Назад
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function RescheduleModal({ appointment, onConfirm, onCancel }) {
  const [date, setDate] = useState(todayKey());
  const [time, setTime] = useState('10:00');
  const HOURS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'];

  return (
    <motion.div
      className={styles.modalOverlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className={`${styles.modal} glass-panel`}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className={styles.cardTitle}>↺ Предложить перенос</p>
        <p className={styles.cardSub}>
          {(appointment?.client_name && normalizeName(appointment.client_name)) || 'Клиент'} · {appointment?.title}
        </p>

        <p className={styles.cardSub} style={{ marginTop: 12 }}>Новая дата:</p>
        <input
          className={styles.editInput}
          type="date"
          value={date}
          min={todayKey()}
          onChange={(e) => setDate(e.target.value)}
        />

        <p className={styles.cardSub}>Новое время:</p>
        <select
          className={styles.editInput}
          value={time}
          onChange={(e) => setTime(e.target.value)}
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>

        <p className={styles.cardSub} style={{ fontSize: 11, marginTop: 8 }}>
          Клиенту придёт предложение в VK, старая запись будет отменена
        </p>

        <div className={styles.actionsRow} style={{ marginTop: 12 }}>
          <button className={styles.btnConfirm} onClick={() => onConfirm(date, time)}>
            Отправить предложение
          </button>
          <button className={styles.btnCancel} onClick={onCancel}>
            Назад
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function MasterScreen() {
  const { user } = useVK();
  const [tab, setTab] = useState('today');
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [chatAppointment, setChatAppointment] = useState(null);
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const modalOpenRef = useRef(false);
  const hasLoadedOnce = useRef(false);
  const pullStart = useRef(null);
  const [pullOffset, setPullOffset] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  useEffect(() => {
    modalOpenRef.current = isAnyModalOpen;
  }, [isAnyModalOpen]);

  const loadData = useCallback(async () => {
    if (!hasLoadedOnce.current) setLoading(true);
    try {
      const [apptRes, svcRes] = await Promise.all([
        fetch(`${API_URL}?action=all_appointments`).then(r => r.json()),
        fetch(`${API_URL}?action=all_services`).then(r => r.json())
      ]);
      setAppointments(apptRes.appointments || []);
      setServices(svcRes.services || []);
      hasLoadedOnce.current = true;
    } catch(e) {}
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!modalOpenRef.current) {
        loadData();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const markModalOpen = useCallback(() => setIsAnyModalOpen(true), []);
  const markModalClosed = useCallback(() => setIsAnyModalOpen(false), []);

  const openManualModal = () => setShowModal(true);
  const closeManualModal = () => setShowModal(false);

  useEffect(() => {
    bridge.send('VKWebAppStorageGet', { keys: ['master_notify_allowed'] })
      .then((data) => {
        const val = data?.keys?.find(k => k.key === 'master_notify_allowed')?.value;
        if (val === '1') setNotifyEnabled(true);
      })
      .catch(() => {
        if (typeof window !== 'undefined' && localStorage.getItem('master_notify_allowed')) {
          setNotifyEnabled(true);
        }
      });
  }, []);

  const enableMasterNotifications = useCallback(async () => {
    if (notifyEnabled) return;
    try {
      const result = await bridge.send('VKWebAppAllowMessagesFromGroup', {
        group_id: 237746914,
        key: 'master_notify'
      });
      if (result?.result) {
        await bridge.send('VKWebAppStorageSet', {
          key: 'master_notify_allowed',
          value: '1'
        }).catch(() => {
          if (typeof window !== 'undefined') {
            localStorage.setItem('master_notify_allowed', '1');
          }
        });
        setNotifyEnabled(true);
      }
    } catch (e) {
      console.log('Notify result error:', e);
    }
  }, [notifyEnabled]);

  const sendHaptic = (type) => {
    try {
      bridge.send('VKWebAppTapticNotificationOccurred', { type });
    } catch (e) {}
  };

  const handleAction = (action, id) => {
    const appointment = appointments.find((a) => a.id === id);
    if (!appointment) return;
    setPendingAction({ action, appointment });
  };

  const executeAction = async (comment) => {
    if (!pendingAction) return;
    const { action, appointment } = pendingAction;
    setPendingAction(null);
    if (action === 'confirm_appointment' || action === 'complete_appointment') {
      sendHaptic('success');
    } else if (action === 'cancel_appointment') {
      sendHaptic('warning');
    }
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id: appointment.id, comment: comment || '' })
      });
    } catch (e) {
      // ignore
    } finally {
      loadData();
    }
  };

  const handleReschedule = async (date, time) => {
    if (!rescheduleTarget) return;
    const appointment = rescheduleTarget;
    setRescheduleTarget(null);
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reschedule_appointment',
          id: appointment.id,
          new_date: date,
          new_time: time
        })
      });
    } catch (e) {
      // ignore
    } finally {
      loadData();
    }
  };

  if (!isMaster(user?.id)) {
    return <div className={styles.denied}><p>🔒 Доступ только для мастера</p></div>;
  }

  const pendingCount = appointments.filter(a => a.status === 'pending').length;

  const TABS = [
    { id: 'today',     label: 'Сегодня' },
    { id: 'schedule',  label: 'Расписание' },
    { id: 'clients',   label: 'Клиенты' },
    { id: 'chat',      label: '💬 Чат' },
    { id: 'services',  label: 'Услуги' },
    { id: 'analytics', label: 'Аналитика' },
    { id: 'graph',     label: 'График' }
  ];

  const handlePullStart = (e) => {
    if (window.scrollY > 0) return;
    pullStart.current = e.touches[0].clientY;
  };

  const handlePullMove = (e) => {
    if (pullStart.current === null) return;
    const delta = e.touches[0].clientY - pullStart.current;
    if (delta > 0) {
      setIsPulling(true);
      setPullOffset(Math.min(delta, 120));
    }
  };

  const handlePullEnd = () => {
    if (!isPulling) return;
    const shouldRefresh = pullOffset > 80;
    setPullOffset(0);
    setIsPulling(false);
    pullStart.current = null;
    if (shouldRefresh) {
      sendHaptic('success');
      loadData();
    }
  };

  return (
    <div className={styles.master}
      onTouchStart={handlePullStart}
      onTouchMove={handlePullMove}
      onTouchEnd={handlePullEnd}
      onTouchCancel={handlePullEnd}>
      <div className={styles.pullIndicator} style={{ height: pullOffset }}>
        {pullOffset > 0 && <div className={styles.pullSpinner} />}
      </div>
      <div className={styles.inner}>
        <header className={styles.header}>
          <span className={styles.kicker}>МАСТЕР</span>
          <div className={styles.headerRow}>
            <h1 className={styles.title}>Панель</h1>
            <div className={styles.headerActions}>
              {pendingCount > 0 && (
                <span className={styles.pendingBadge}>{pendingCount} новых</span>
              )}
              {notifyEnabled ? (
                <button className={styles.btnNotifyActive} disabled>
                  ✅ Уведомления включены
                </button>
              ) : (
                <button className={styles.btnNotify} onClick={enableMasterNotifications}>
                  🔔 Включить уведомления
                </button>
              )}
              <button className={styles.btnRefresh} onClick={loadData}>↻</button>
            </div>
          </div>

          <div className={styles.tabsScroll}>
            {TABS.map(t => (
              <button key={t.id}
                className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''} glass-panel`}
                onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </header>

        {loading ? renderEmptyState('⏳', 'Загрузка…') : (
          <AnimatePresence mode="wait">
            <motion.div key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}>
            {tab === 'today'     && (
              <TodayTab
                appointments={appointments}
                services={services}
                onAction={handleAction}
                onAddManual={openManualModal}
                onReschedule={setRescheduleTarget}
                onChat={setChatAppointment}
              />
            )}
            {tab === 'schedule'  && (
              <ScheduleTab
                appointments={appointments}
                onAction={handleAction}
                onAddManual={openManualModal}
                onReschedule={setRescheduleTarget}
                onChat={setChatAppointment}
              />
            )}
            {tab === 'clients'   && <ClientsTab appointments={appointments} onModalOpen={markModalOpen} onModalClose={markModalClosed} />}
            {tab === 'services'  && <ServicesTab />}
            {tab === 'chat'      && (
              <ChatTab
                appointments={appointments}
                currentUser={user}
              />
            )}
            {tab === 'analytics' && <AnalyticsTab appointments={appointments} services={services} />}
            {tab === 'graph'     && <GraphTab />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <ManualBookingModal
            services={services}
            onClose={closeManualModal}
            onSave={loadData}
            onModalOpen={markModalOpen}
            onModalClose={markModalClosed}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {pendingAction && (
          <ActionCommentModal
            action={pendingAction.action}
            appointment={pendingAction.appointment}
            onConfirm={executeAction}
            onCancel={() => setPendingAction(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {rescheduleTarget && (
          <RescheduleModal
            appointment={rescheduleTarget}
            onConfirm={handleReschedule}
            onCancel={() => setRescheduleTarget(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {chatAppointment && (
          <ChatDrawer
            appointmentId={chatAppointment.id}
            currentUserId={user?.id}
            currentUserName={user?.first_name || 'Мастер'}
            contactName={chatAppointment.client_name || `ID: ${chatAppointment.client_id}`}
            onClose={() => setChatAppointment(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}