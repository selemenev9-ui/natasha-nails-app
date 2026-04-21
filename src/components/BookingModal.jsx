import { AnimatePresence, motion } from 'framer-motion';
import styles from './BookingModal.module.css';

export default function BookingModal({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          onClick={onClose}
        >
          <motion.div
            className={styles.sheet}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className={styles.closeButton} onClick={onClose}>
              Закрыть
            </button>
            <div className={styles.placeholder}>Интеграция Yandex Business: Ожидание ссылки</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
