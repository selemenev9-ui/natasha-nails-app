import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVK } from '../contexts/VKContext.jsx';
import { API_URL } from '../utils/config.js';
import styles from './MasterScreen.module.css';

const MASTER_IDS = ['80557585', '187729875'];
const CATEGORIES = [
  { id: 'nails', label: 'Маникюр & Педикюр' },
  { id: 'solarium', label: 'Солярий' },
  { id: 'extra', label: 'Дополнительно' }
];

function isMaster(userId) {
  return MASTER_IDS.includes(String(userId));
}

function formatDate(ts) {
  if (!ts) return '—';
  const ms = ts > 1e10 ? ts : ts * 1000;
  return new Date(ms).toLocaleString('ru-RU', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
  });
}

// ─── ЗАПИСИ ──────────────────────────────────────────────────────────────────
function AppointmentsTab() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}?action=all_appointments`)
      .then(r => r.json())
      .then(d => setAppointments(d.appointments || []))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className={styles.empty}>Загрузка…</p>;
  if (!appointments.length) return <p className={styles.empty}>Записей пока нет</p>;

  const now = Date.now() / 1000;
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayTs = todayStart.getTime() / 1000;
  const tomorrowTs = todayTs + 86400;

  const todayList  = appointments.filter(a => a.appointment_date >= todayTs && a.appointment_date < tomorrowTs);
  const upcoming   = appointments.filter(a => a.appointment_date >= tomorrowTs);
  const past       = appointments.filter(a => a.appointment_date < todayTs);

  return (
    <div className={styles.tabContent}>
      {todayList.length > 0 && <>
        <p className={styles.groupLabel}>📅 Сегодня</p>
        {todayList.map(a => <AppCard key={a.id} a={a} highlight />)}
      </>}
      {upcoming.length > 0 && <>
        <p className={styles.groupLabel}>Предстоящие</p>
        {upcoming.map(a => <AppCard key={a.id} a={a} />)}
      </>}
      {past.length > 0 && <>
        <p className={styles.groupLabel}>Прошедшие</p>
        {past.map(a => <AppCard key={a.id} a={a} muted />)}
      </>}
    </div>
  );
}

function AppCard({ a, highlight, muted }) {
  return (
    <div className={`${styles.card} glass-panel ${highlight ? styles.cardHighlight : ''} ${muted ? styles.cardMuted : ''}`}>
      <div className={styles.cardRow}>
        <p className={styles.cardTitle}>{a.title || a.service_id}</p>
        {a.total_price > 0 && <p className={styles.cardPrice}>{a.total_price.toLocaleString('ru-RU')} ₽</p>}
      </div>
      <p className={styles.cardSub}>🕐 {formatDate(a.appointment_date)}</p>
      <p className={styles.cardSub}>👤 {a.client_id}</p>
    </div>
  );
}

// ─── УСЛУГИ ───────────────────────────────────────────────────────────────────
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

  const load = () => {
    setLoading(true);
    fetch(`${API_URL}?action=all_services`)
      .then(r => r.json())
      .then(d => setServices(d.services || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const startEdit = (s) => {
    setEditId(s.id);
    setEditData({ title: s.title, price: s.basePrice, duration_minutes: s.durationMinutes });
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_service', id: editId, ...editData })
      });
      setEditId(null);
      load();
    } catch(e) {}
    setSaving(false);
  };

  const toggleActive = async (s) => {
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_service', id: s.id, is_active: !s.isActive })
    });
    load();
  };

  const confirmDelete = async (id) => {
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_service', id })
    });
    setDeleteId(null);
    load();
  };

  const addService = async () => {
    if (!newService.title || !newService.category) return;
    setAdding(true);
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_service', ...newService })
      });
      setShowAdd(false);
      setNewService({ title: '', category: 'nails', price: '', duration_minutes: '' });
      load();
    } catch(e) {}
    setAdding(false);
  };

  if (loading) return <p className={styles.empty}>Загрузка…</p>;

  return (
    <div className={styles.tabContent}>

      {/* Кнопка добавить */}
      <button className={styles.btnAdd} onClick={() => setShowAdd(v => !v)}>
        {showAdd ? '✕ Отмена' : '+ Добавить услугу'}
      </button>

      {/* Форма добавления */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`${styles.card} glass-panel`}
          >
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

      {/* Список услуг */}
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
                <button className={styles.btnSave} disabled={saving} onClick={saveEdit}>
                  {saving ? '…' : 'Сохранить'}
                </button>
                <button className={styles.btnCancel} onClick={() => setEditId(null)}>Отмена</button>
              </div>
            </>
          ) : (
            <>
              <div className={styles.cardRow}>
                <p className={styles.cardTitle}>{s.title} {!s.isActive && <span className={styles.hiddenBadge}>скрыта</span>}</p>
                <p className={styles.cardPrice}>{s.price}</p>
              </div>
              <p className={styles.cardSub}>{s.duration} · {s.category}</p>
              <div className={styles.actionsRow}>
                <button className={styles.btnEdit} onClick={() => startEdit(s)}>✏️ Изменить</button>
                <button className={styles.btnEdit} onClick={() => toggleActive(s)}>
                  {s.isActive ? '👁 Скрыть' : '👁 Показать'}
                </button>
                {deleteId === s.id ? (
                  <>
                    <button className={styles.btnDelete} onClick={() => confirmDelete(s.id)}>Удалить?</button>
                    <button className={styles.btnCancel} onClick={() => setDeleteId(null)}>Нет</button>
                  </>
                ) : (
                  <button className={styles.btnDeleteSoft} onClick={() => setDeleteId(s.id)}>🗑</button>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function MasterScreen() {
  const { user } = useVK();
  const [tab, setTab] = useState('appointments');

  if (!isMaster(user?.id)) {
    return <div className={styles.denied}><p>🔒 Доступ только для мастера</p></div>;
  }

  return (
    <div className={styles.master}>
      <motion.div className={styles.ambientGlow}
        animate={{ background: 'radial-gradient(circle at 30% 20%, rgba(76,29,149,0.45), transparent 60%), #0a0a0c' }}
        transition={{ duration: 0.8 }} />
      <div className={styles.inner}>
        <header className={styles.header}>
          <span className={styles.kicker}>МАСТЕР</span>
          <h1 className={styles.title}>Панель управления</h1>
        </header>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'appointments' ? styles.tabActive : ''} glass-panel`}
            onClick={() => setTab('appointments')}>Записи</button>
          <button className={`${styles.tab} ${tab === 'services' ? styles.tabActive : ''} glass-panel`}
            onClick={() => setTab('services')}>Услуги</button>
        </div>
        {tab === 'appointments' && <AppointmentsTab />}
        {tab === 'services' && <ServicesTab />}
      </div>
    </div>
  );
}