import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './BookingModal.module.css';

const HOURS = Array.from({ length: 20 }, (_, i) => {
  const h = 10 + Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2,'0')}:${m}`;
});

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function BookingModal({ isOpen, onClose, onConfirm }) {
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState('');

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

            <div className={styles.section}>
              <p className={styles.label}>Время</p>
              <div className={styles.timeGrid}>
                {HOURS.map(h => (
                  <button key={h}
                    className={`${styles.timeSlot} ${time === h ? styles.timeSlotActive : ''}`}
                    onClick={() => setTime(h)}>
                    {h}
                  </button>
                ))}
              </div>
            </div>

            <button className={styles.confirmBtn}
              disabled={!date || !time}
              onClick={handleConfirm}>
              Подтвердить запись {time && `в ${time}`}
            </button>

            <button className={styles.closeButton} onClick={onClose}>Отмена</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}