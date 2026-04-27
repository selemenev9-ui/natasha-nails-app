import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVK } from '../contexts/VKContext.jsx';
import ChatDrawer from '../components/ChatDrawer.jsx';
import styles from './ChatScreen.module.css';

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

export default function ChatScreen() {
  const { user } = useVK();
  const [chatOpen, setChatOpen] = useState(false);
  const chatRoomId = user?.id ? `direct_${user.id}` : null;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Сообщения</h1>
        <p className={styles.subtitle}>Чат с вашим мастером</p>
      </header>

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
          </div>
          <div className={styles.cardInfo}>
            <p className={styles.cardName}>Natasha Premium Lab</p>
            <p className={styles.cardSub}>Написать мастеру...</p>
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
    </div>
  );
}
