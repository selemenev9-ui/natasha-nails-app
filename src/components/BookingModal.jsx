import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { API_URL } from '../utils/config.js';
import styles from './BookingModal.module.css';

function generateSlots(startTime, endTime) {
  const slots = [];
  const [startH] = startTime.split(':').map(Number);
  const [endH] = endTime.split(':').map(Number);
  for (let h = startH; h < endH; h++) {
    slots.push(`${String(h).padStart(2,'0')}:00`);
    slots.push(`${String(h).padStart(2,'0')}:30`);
  }
  return slots;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function BookingModal({ isOpen, onClose, onConfirm }) {
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState('');
  const [busySlots, setBusySlots] = useState([]);
  const [dayConfig, setDayConfig] = useState({ start_time: '10:00', end_time: '20:00', is_day_off: false });
  const [loadingConfig, setLoadingConfig] = useState(false);

  useEffect(() => {
    if (!isOpen || !date) return;
    setTime('');
    setLoadingConfig(true);

    Promise.all([
      fetch(`${API_URL}?action=day_config&date=${date}`).then(r => r.json()),
      fetch(`${API_URL}?action=busy_slots&date=${date}`).then(r => r.json())
    ])
      .then(([configRes, slotsRes]) => {
        setDayConfig(configRes.config || { start_time: '10:00', end_time: '20:00', is_day_off: false });
        setBusySlots(slotsRes.slots || []);
      })
      .catch(() => {})
      .finally(() => setLoadingConfig(false));
  }, [isOpen, date]);

  const availableSlots = generateSlots(dayConfig.start_time, dayConfig.end_time);

  const handleConfirm = () => {
    if (!date || !time) return;
    onConfirm?.({ date, time });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className={styles.overlay}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}>
          <motion.div className={styles.sheet}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            onClick={e => e.stopPropagation()}>

            <div className={styles.handle} />
            <p className={styles.title}>Выберите дату и время</p>

            <div className={styles.section}>
              <p className={styles.label}>Дата</p>
              <input type="date" className={styles.dateInput}
                value={date} min={todayStr()}
                onChange={e => setDate(e.target.value)} />
            </div>

            {loadingConfig ? (
              <p className={styles.loadingText}>Загрузка расписания…</p>
            ) : dayConfig.is_day_off ? (
              <div className={styles.dayOffMsg}>
                😴 Выходной день — запись недоступна
              </div>
            ) : (
              <div className={styles.section}>
                <p className={styles.label}>
                  Время · {dayConfig.start_time}–{dayConfig.end_time}
                </p>
                <div className={styles.timeGrid}>
                  {availableSlots.map(h => {
                    const busy = busySlots.includes(h);
                    return (
                      <button key={h}
                        disabled={busy}
                        className={`${styles.timeSlot} ${time === h ? styles.timeSlotActive : ''} ${busy ? styles.timeSlotBusy : ''}`}
                        onClick={() => !busy && setTime(h)}>
                        {h}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button className={styles.confirmBtn}
              disabled={!date || !time || dayConfig.is_day_off}
              onClick={handleConfirm}>
              Подтвердить {time && `в ${time}`}
            </button>

            <button className={styles.closeButton} onClick={onClose}>Отмена</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}