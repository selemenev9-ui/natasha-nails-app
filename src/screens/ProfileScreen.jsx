import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useVK } from '../contexts/VKContext.jsx';
import BeautyCard from '../components/BeautyCard.jsx';
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
  const { user } = useVK();
  const firstName = user?.first_name || 'гость';
  const avatar = user?.photo_200 || '';
  const [chatAppt, setChatAppt] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ phone: '', telegram: '' });
  const [savingContact, setSavingContact] = useState(false);
  const [contactLoaded, setContactLoaded] = useState(false);

  const openAdmin = () => window.open('https://vk.me/natasha_premium_lab', '_blank');

  useEffect(() => {
    if (!user?.id) return;
    setContactLoaded(false);
    fetch(`${API_URL}?action=get_client_profile&client_id=${user.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          setContactForm({
            phone: data.profile.phone || '',
            telegram: data.profile.telegram || ''
          });
        }
        setContactLoaded(true);
      })
      .catch(() => setContactLoaded(true));
  }, [user?.id]);

  const saveContact = async () => {
    if (!user?.id) return;
    setSavingContact(true);
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_client_profile',
        client_id: String(user.id),
        phone: contactForm.phone,
        telegram: contactForm.telegram
      })
    }).catch(() => {});
    setSavingContact(false);
  };

  return (
    <div className={styles.profile}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <h1 className={styles.title}>Рады видеть тебя, {firstName}</h1>
          {avatar
            ? <img className={styles.avatar} src={avatar} alt={firstName} />
            : <div className={styles.avatarPlaceholder} aria-hidden="true" />}
        </header>

        <section className={styles.beautyIdSection}>
          <p className={styles.sectionLabel}>Beauty ID</p>
          <div className={styles.beautyIdContainer}>
            <BeautyCard firstName={user?.first_name} vkId={user?.id} theme="dark" />
          </div>
        </section>

        {user?.id && (
          <section className={styles.beautyIdSection}>
            <p className={styles.sectionLabel}>Мои контакты</p>
            <div className={styles.contactForm}>
              <input
                className={styles.contactInput}
                type="tel"
                placeholder="📞 Телефон (+7...)"
                value={contactForm.phone}
                onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))}
              />
              <input
                className={styles.contactInput}
                type="text"
                placeholder="✈️ Telegram (@username)"
                value={contactForm.telegram}
                onChange={(e) => setContactForm((f) => ({ ...f, telegram: e.target.value }))}
              />
              <button
                className={styles.ctaButton}
                style={{ marginTop: 8, padding: '10px 0', width: '100%' }}
                disabled={savingContact || !contactLoaded}
                onClick={saveContact}
              >
                {savingContact ? 'Сохранение…' : '💾 Сохранить контакты'}
              </button>
            </div>
          </section>
        )}

        <section className={styles.beautyIdSection}>
          <button
            className={styles.historyToggle}
            type="button"
            onClick={() => setHistoryOpen((o) => !o)}
          >
            <p className={styles.sectionLabel} style={{ margin: 0 }}>Мои визиты</p>
            <span className={styles.historyArrow}>{historyOpen ? '▲' : '▼'}</span>
          </button>
          {historyOpen && (
            <HistorySection
              clientId={user?.id ? String(user.id) : null}
              onNavigate={onNavigate}
              onChatRequest={setChatAppt}
            />
          )}
        </section>

        <footer className={styles.footer}>
          <button className={styles.ctaButton} onClick={openAdmin}>Написать администратору</button>
        </footer>
      </div>
      <AnimatePresence>
        {chatAppt && (
          <ChatDrawer
            appointmentId={chatAppt.id}
            currentUserId={String(user?.id || '')}
            currentUserName={user?.first_name || 'Клиент'}
            contactName="Natasha Premium Lab"
            onClose={() => setChatAppt(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}