import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import styles from './ServiceDrawer.module.css';

export default function ServiceDrawer({ isOpen, onClose, data }) {
  const dragY = useMotionValue(0);
  const overlayOpacity = useTransform(dragY, [0, 260], [1, 0.28]);
  const drawerScale = useTransform(dragY, [0, 260], [1, 0.985]);

  const handleDrag = (_, info) => {
    dragY.set(Math.max(0, info.offset.y));
  };

  const handleDragEnd = (_, info) => {
    const draggedDown = info.offset.y > 120;
    const fastSwipeDown = info.velocity.y > 700;

    if (draggedDown || fastSwipeDown) {
      onClose?.();
      return;
    }

    dragY.set(0);
  };

  const handleBook = () => {
    if (!data?.link) {
      console.log('Booking link pending');
      return;
    }
    window.open(data.link, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && data ? (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={onClose}
        >
          <motion.div className={styles.overlayBackdrop} style={{ opacity: overlayOpacity }} />

          <motion.div
            className={styles.drawer}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            style={{ scale: drawerScale }}
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.26 }}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.grabber} aria-hidden="true" />
            <h2 className={styles.title}>{data.title}</h2>
            <p className={styles.description}>{data.description}</p>
            <div className={styles.price}>{data.price}</div>
            <button type="button" className="btn-ink" onClick={handleBook}>
              Записаться онлайн
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
