import { useCallback, useEffect, useState } from 'react';
import bridge from '@vkontakte/vk-bridge';
import { motion, AnimatePresence } from 'framer-motion';
import { useVK } from '../contexts/VKContext.jsx';
import BeautyCard from '../components/BeautyCard.jsx';
import CareAccordion from '../components/CareAccordion.jsx';
import { getDailyTips } from '../data/careHub';
import { API_URL } from '../utils/config.js';
import ChatDrawer from '../components/ChatDrawer.jsx';

import styles from './ProfileScreen.module.css';

function formatDate(timestamp) {
  if (!timestamp) return '—';
  // YDB Datetime возвращает секунды от эпохи
  const ms = timestamp > 1e10 ? timestamp : timestamp * 1000;
  return new Date(ms).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function HistorySection({ clientId, onNavigate, onChatRequest }) {

  const [appointments, setAppointments] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!clientId) {
      setAppointments(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?action=history&client_id=${clientId}`);
      const data = await response.json();
      setAppointments(data.appointments || []);
    } catch (error) {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (loading) return <p className={styles.historyEmpty}>Загрузка истории…</p>;
  if (!clientId) return <p className={styles.historyEmpty}>Войдите через VK чтобы видеть историю</p>;
  if (!appointments?.length) return <p className={styles.historyEmpty}>Визитов пока нет — самое время записаться 💅</p>;

  const totalSpent = appointments.reduce((sum, a) => sum + (a.total_price || 0), 0);
  const now = Date.now() / 1000;
  const upcoming = appointments.find((a) => a.appointment_date > now);
  const past = appointments.filter((a) => a.appointment_date <= now);
  const STATUS_TEXT = {
    pending: 'Ожидает подтверждения',
    confirmed: 'Подтверждено',
    completed: 'Завершено',
    cancelled: 'Отменено'
  };
  const upcomingDateMs = upcoming
    ? (upcoming.appointment_date > 1e10 ? upcoming.appointment_date : upcoming.appointment_date * 1000)
    : null;
  const timeUntilUpcoming = upcomingDateMs ? upcomingDateMs - Date.now() : null;
  const isCancelableUpcoming = upcoming && upcoming.status !== 'cancelled';
  const moreThanDay = isCancelableUpcoming && timeUntilUpcoming > 24 * 60 * 60 * 1000;

  const handleReschedule = async () => {
    if (!upcoming || upcoming.status === 'cancelled') return;
    if (typeof window !== 'undefined') {
      const ok = window.confirm('Перенести запись? Текущая будет отменена, вы выберете новое время.');
      if (!ok) return;
    }
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel_appointment', id: upcoming.id })
    }).catch(() => {});
    await fetchHistory();
    onNavigate?.('booking', {
      serviceId: upcoming.service_id,
      serviceTitle: upcoming.title || upcoming.service_id
    });
  };

  const handleCancel = async () => {
    if (!upcoming) return;
    if (typeof window !== 'undefined') {
      const ok = window.confirm(`Отменить запись на ${formatDate(upcoming.appointment_date)}?`);
      if (!ok) return;
    }
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel_appointment', id: upcoming.id })
    }).catch(() => {});
    await fetchHistory();
  };

  return (
    <div className={styles.historySection}>
      {/* Статистика */}
      <div className={styles.statsRow}>
        <div className={`${styles.statCard} glass-panel`}>
          <span className={styles.statValue}>{appointments.length}</span>
          <span className={styles.statLabel}>визитов</span>
        </div>
        <div className={`${styles.statCard} glass-panel`}>
          <span className={styles.statValue}>{totalSpent.toLocaleString('ru-RU')} ₽</span>
          <span className={styles.statLabel}>потрачено</span>
        </div>
      </div>

      {/* Следующий визит */}
      {upcoming && (
        <div className={`${styles.upcomingCard} glass-panel`}>
          <p className={styles.upcomingLabel}>⏰ Следующий визит</p>
          <p className={styles.upcomingDate}>{formatDate(upcoming.appointment_date)}</p>
          <p className={styles.upcomingService}>{upcoming.title || upcoming.service_id}</p>
          <p className={styles.upcomingStatus}>{STATUS_TEXT[upcoming.status] || upcoming.status}</p>
          {isCancelableUpcoming && (
            moreThanDay ? (
              <div className={styles.upcomingActions}>
                <button type="button" className={styles.rescheduleBtn} onClick={handleReschedule}>
                  ↺ Перенести
                </button>
                <button type="button" className={styles.cancelBtn} onClick={handleCancel}>
                  Отменить
                </button>
                <button type="button" className={styles.rescheduleBtn} onClick={() => onChatRequest?.(upcoming)}>
                  💬 Написать мастеру
                </button>
              </div>
            ) : (
              <p className={styles.soonNote}>
                Менее 24 ч до записи —{' '}
                <a href="https://vk.me/natasha_premium_lab" target="_blank" rel="noreferrer">
                  напишите нам
                </a>
              </p>
            )
          )}
        </div>
      )}

      {/* История */}
      {past.length > 0 && (
        <div className={styles.historyList}>
          <p className={styles.sectionLabel}>История визитов</p>
          {past.map((a) => (
            <div key={a.id} className={`${styles.historyCard} glass-panel`}>
              <div className={styles.historyRow}>
                <div className={styles.historyCardLeft}>
                  <p className={styles.historyService}>{a.title || a.service_id}</p>
                  <p className={styles.historyDate}>{formatDate(a.appointment_date)}</p>
                </div>
                {a.total_price > 0 && (
                  <p className={styles.historyPrice}>{a.total_price.toLocaleString('ru-RU')} ₽</p>
                )}
              </div>
              <button
                className={styles.rebookBtn}
                type="button"
                onClick={() => onNavigate?.('booking', {
                  serviceId: a.service_id,
                  serviceTitle: a.title || a.service_id
                })}
              >
                ↺ Повторить
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProfileScreen({ onNavigate }) {
  const { user, cardTheme, toggleTheme, seenTips, isBridgeLoading, isVKEnv } = useVK();
  const firstName = user?.first_name || 'гость';
  const avatar = user?.photo_200 || '';
  const [dailyMix, setDailyMix] = useState([]);
  const [chatAppt, setChatAppt] = useState(null);

  useEffect(() => {
    if (isBridgeLoading) return;
    const { tips, newSeenIds } = getDailyTips(3, seenTips);
    setDailyMix(tips);
    if (newSeenIds.length > seenTips.length && isVKEnv) {
      bridge.send('VKWebAppStorageSet', { key: 'seen_tips', value: JSON.stringify(newSeenIds) }).catch(() => {});
    }
  }, [isBridgeLoading, isVKEnv, seenTips]);

  const openAdmin = () => window.open('https://vk.me/natasha_premium_lab', '_blank');

  return (
    <div className={styles.profile}>
      <motion.div
        className={styles.ambientGlow}
        animate={{
          background:
            'radial-gradient(circle at 30% 20%, rgba(212, 197, 179, 0.45), transparent 60%), radial-gradient(circle at 70% 80%, rgba(240, 235, 225, 0.5), transparent 65%), #F7F5F0'
        }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
      />
      <div className={styles.inner}>
        <header className={styles.header}>
          <h1 className={styles.title}>Рады видеть тебя, {firstName}</h1>
          {avatar
            ? <img className={styles.avatar} src={avatar} alt={firstName} />
            : <div className={styles.avatarPlaceholder} aria-hidden="true" />}
        </header>

        {/* История визитов */}
        <section className={styles.beautyIdSection}>
          <p className={styles.sectionLabel}>Мои визиты</p>
          <HistorySection
            clientId={user?.id ? String(user.id) : null}
            onNavigate={onNavigate}
            onChatRequest={setChatAppt}
          />

        </section>

        {/* Beauty ID */}
        <section className={styles.beautyIdSection}>
          <p className={styles.sectionLabel}>Beauty ID</p>
          <button className={`${styles.themeToggle} glass-panel`} onClick={toggleTheme} type="button">
            {cardTheme === 'dark' ? '☀️ Светлый дизайн' : '🌙 Тёмный дизайн'}
          </button>
          <div className={`${styles.beautyIdContainer} glass-panel`}>
            <BeautyCard firstName={user?.first_name} vkId={user?.id} theme={cardTheme} />
          </div>
          <div className={`${styles.careLibrary} glass-panel`}>
            <h2 className={styles.careTitle}>Beauty Mix на сегодня</h2>
            <CareAccordion data={dailyMix} />
          </div>
        </section>

        <footer className={styles.footer}>
          <button className="btn-ink" onClick={openAdmin}>Написать администратору</button>
        </footer>
      </div>
      <AnimatePresence>
        {chatAppt && (
          <ChatDrawer
            appointmentId={chatAppt.id}
            currentUserId={String(user?.id || '')}
            currentUserName={user?.first_name || 'Клиент'}
            onClose={() => setChatAppt(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}