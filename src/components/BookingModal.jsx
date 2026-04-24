import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { API_URL } from '../utils/config.js';
import styles from './BookingModal.module.css';

const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTH_NAMES = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function generateDays(count = 30) {
  const days = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    days.push({
      value: `${yyyy}-${mm}-${dd}`,
      dayName: DAY_NAMES[d.getDay()],
      dayNum: d.getDate(),
      month: MONTH_NAMES[d.getMonth()],
      isToday: i === 0
    });
  }
  return days;
}

function generateSlots(startTime, endTime) {
  const slots = [];
  const [startH] = startTime.split(':').map(Number);
  const [endH] = endTime.split(':').map(Number);
  for (let h = startH; h < endH; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '00')}:30`);
  }
  return slots;
}

const DAYS = generateDays(30);

export default function BookingModal({ isOpen, onClose, onConfirm }) {
  const [date, setDate] = useState(DAYS[0].value);
  const [time, setTime] = useState('');
  const [busySlots, setBusySlots] = useState([]);
  const [dayConfig, setDayConfig] = useState({ start_time: '10:00', end_time: '20:00', is_day_off: false });
  const [loadingConfig, setLoadingConfig] = useState(false);
  const scrollRef = useRef(null);

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

            {/* Горизонтальный скролл дней */}
            <div className={styles.daysTrack} ref={scrollRef}>
              {DAYS.map((day) => (
                <motion.button
                  key={day.value}
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  className={`${styles.dayCard} ${date === day.value ? styles.dayCardActive : ''}`}
                  onClick={() => setDate(day.value)}
                >
                  <span className={styles.dayName}>{day.isToday ? 'Сег' : day.dayName}</span>
                  <span className={styles.dayNum}>{day.dayNum}</span>
                  <span className={styles.dayMonth}>{day.month}</span>
                  {date === day.value && (
                    <motion.div layoutId="day-active-bg" className={styles.dayActiveBg}
                      transition={{ type: 'spring', stiffness: 380, damping: 28 }} />
                  )}
                </motion.button>
              ))}
            </div>

            {/* Слоты времени */}
            {loadingConfig ? (
              <p className={styles.loadingText}>Загрузка расписания…</p>
            ) : dayConfig.is_day_off ? (
              <div className={styles.dayOffMsg}>😴 Выходной — запись недоступна</div>
            ) : (
              <div className={styles.section}>
                <p className={styles.label}>Время · {dayConfig.start_time}–{dayConfig.end_time}</p>
                <div className={styles.timeGrid}>
                  {availableSlots.map(slot => {
                    const busy = busySlots.includes(slot);
                    const active = time === slot;
                    return (
                      <motion.button
                        key={slot}
                        type="button"
                        disabled={busy}
                        whileTap={!busy ? { scale: 0.9 } : {}}
                        className={`${styles.timeSlot} ${active ? styles.timeSlotActive : ''} ${busy ? styles.timeSlotBusy : ''}`}
                        onClick={() => !busy && setTime(slot)}
                      >
                        {slot}
                        {active && (
                          <motion.div layoutId="time-active-bg" className={styles.timeActiveBg}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            <motion.button
              type="button"
              className={styles.confirmBtn}
              disabled={!date || !time || dayConfig.is_day_off}
              whileTap={{ scale: 0.97 }}
              onClick={handleConfirm}
            >
              {time ? `Подтвердить · ${time}` : 'Выберите время'}
            </motion.button>

            <button type="button" className={styles.closeButton} onClick={onClose}>Отмена</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}