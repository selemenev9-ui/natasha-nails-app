import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useVK } from '../contexts/VKContext.jsx';
import ChatDrawer from '../components/ChatDrawer.jsx';
import styles from './ProfileScreen.module.css';

export default function ChatScreen() {
  const { user } = useVK();
  const [chatOpen, setChatOpen] = useState(false);
  const chatRoomId = user?.id ? `direct_${user.id}` : null;

  return (
    <div className={styles.profile}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <h1 className={styles.title}>Сообщения</h1>
        </header>

        <div style={{ padding: '20px 0' }}>
          <div
            className="glass-panel"
            style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', padding: 20 }}
            onClick={() => setChatOpen(true)}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: '1px solid var(--ink)',
                color: 'var(--ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                flexShrink: 0
              }}
            >
              💅
            </div>
            <div>
              <p style={{ fontWeight: 600, margin: 0, fontSize: 16 }}>Natasha Premium Lab</p>
              <p style={{ color: '#888', margin: '2px 0 0', fontSize: 13 }}>Написать мастеру</p>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 20, color: 'var(--ink-30)' }}>›</span>
          </div>
        </div>
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
