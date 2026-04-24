import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import bridge from '@vkontakte/vk-bridge';
import { API_URL } from './utils/config.js';

import BookingScreen from './screens/BookingScreen.jsx';
import InfoScreen from './screens/InfoScreen.jsx';
import ProfileScreen from './screens/ProfileScreen.jsx';
import ChatScreen from './screens/ChatScreen.jsx';
import MasterScreen from './screens/MasterScreen.jsx';
import OnboardingScreen from './screens/OnboardingScreen.jsx';
import TabBar from './components/TabBar.jsx';
import NeuralBackground from './components/NeuralBackground.jsx';
import { useVK } from './contexts/VKContext.jsx';

/**
 * Routes map. We use internal state for simplicity; @vkontakte/vk-mini-apps-router
 * is wired as a dependency and can be swapped in here for hash-based routing
 * when the app is published inside VK.
 */
const ROUTES = ['booking', 'info', 'profile', 'chat', 'master'];

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }
  }
};

function NotifyPermissionModal({ onAllow, onSkip }) {
  return (
    <motion.div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'flex-end'
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        style={{
          width: '100%',
          background: 'var(--cream)',
          borderRadius: '20px 20px 0 0',
          padding: '24px 20px 36px'
        }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
          <p style={{ fontWeight: 700, fontSize: 18, margin: '0 0 8px' }}>
            Уведомления о записях
          </p>
          <p style={{ color: '#888', fontSize: 14, lineHeight: 1.5, margin: 0 }}>
            Получайте напоминания о предстоящих визитах и статусе ваших записей
          </p>
        </div>
        <button
          onClick={onAllow}
          style={{
            width: '100%',
            padding: '14px',
            background: 'var(--ink)',
            color: 'var(--cream)',
            border: 'none',
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: 10
          }}
        >
          Включить уведомления
        </button>
        <button
          onClick={onSkip}
          style={{
            width: '100%',
            padding: '12px',
            background: 'none',
            color: '#aaa',
            border: 'none',
            fontSize: 14,
            cursor: 'pointer'
          }}
        >
          Пропустить
        </button>
      </motion.div>
    </motion.div>
  );
}

function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8, ease: 'easeOut' } }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--ink)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 999,
        pointerEvents: 'none'
      }}
    >
      <motion.span
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.04, transition: { duration: 0.8, ease: 'easeInOut' } }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '28px',
          letterSpacing: '0.45em',
          color: 'var(--cream)',
          textTransform: 'uppercase'
        }}
      >
        NATASHA LAB
      </motion.span>
    </motion.div>
  );
}

export default function App() {
  const { isBridgeLoading, isFirstVisit, completeOnboarding } = useVK();
  const [route, setRoute] = useState('profile');
  const [isConfirm, setIsConfirm] = useState(false);
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [preSelectedService, setPreSelectedService] = useState(null);
  const [chatUnread, setChatUnread] = useState(0);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const currentScreen = route;

  const navigate = (next, params = {}) => {
    if (!ROUTES.includes(next)) return;
    if (params?.serviceId) setPreSelectedService(params);
    else setPreSelectedService(null);
    setRoute(next);
  };

  useEffect(() => {
    if (isBridgeLoading) {
      setIsSplashVisible(true);
      return;
    }
    const timeout = setTimeout(() => setIsSplashVisible(false), 1200);
    return () => clearTimeout(timeout);
  }, [isBridgeLoading]);

  const showSplash = isBridgeLoading || isSplashVisible;

  useEffect(() => {
    if (isBridgeLoading || isFirstVisit) return;
    let cancelled = false;
    let intervalId;

    const loadUnread = () => {
      fetch(`${API_URL}?action=get_conversations`)
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return;
          const unread = (data.conversations || []).reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
          setChatUnread(unread);
        })
        .catch(() => {});
    };

    loadUnread();
    intervalId = setInterval(loadUnread, 30000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [isBridgeLoading, isFirstVisit]);

  useEffect(() => {
    if (isBridgeLoading || isFirstVisit) return;
    let timeoutId;

    const scheduleModal = () => {
      timeoutId = setTimeout(() => setShowNotifyModal(true), 1500);
    };

    bridge
      .send('VKWebAppStorageGet', { keys: ['notify_allowed'] })
      .then((data) => {
        const val = data?.keys?.find((k) => k.key === 'notify_allowed')?.value;
        if (!val) {
          scheduleModal();
        }
      })
      .catch(() => {
        if (typeof window !== 'undefined' && !localStorage.getItem('notify_allowed')) {
          scheduleModal();
        }
      });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isBridgeLoading, isFirstVisit]);

  const handleAllowNotify = async () => {
    setShowNotifyModal(false);
    try {
      const result = await bridge.send('VKWebAppAllowMessagesFromGroup', {
        group_id: 237746914,
        key: 'notify_booking'
      });
      if (result?.result) {
        await bridge.send('VKWebAppStorageSet', {
          key: 'notify_allowed',
          value: '1'
        }).catch(() => {
          if (typeof window !== 'undefined') {
            localStorage.setItem('notify_allowed', '1');
          }
        });
      }
    } catch (e) {
      // ignore
    }
  };

  const handleSkipNotify = async () => {
    setShowNotifyModal(false);
    try {
      await bridge.send('VKWebAppStorageSet', {
        key: 'notify_allowed',
        value: 'skipped'
      });
    } catch (e) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('notify_allowed', 'skipped');
      }
    }
  };

  if (isFirstVisit) {
    return (
      <div className="app-shell">
        <OnboardingScreen onComplete={completeOnboarding} />
        <AnimatePresence>{showSplash && <SplashScreen key="splash" />}</AnimatePresence>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="material" />
      <NeuralBackground />
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{ width: '100%', height: '100%' }}
        >
          {currentScreen === 'booking' && (
            <BookingScreen
              onNavigate={navigate}
              onConfirmChange={setIsConfirm}
              preSelectedService={preSelectedService}
              onServiceConsumed={() => setPreSelectedService(null)}
            />
          )}
          {currentScreen === 'info' && <InfoScreen />}
          {currentScreen === 'profile' && <ProfileScreen onNavigate={navigate} />}
          {currentScreen === 'chat' && <ChatScreen onNavigate={navigate} />}
          {currentScreen === 'master' && <MasterScreen />}
        </motion.div>
      </AnimatePresence>

      <TabBar active={route} onChange={navigate} isHidden={isConfirm} chatUnread={chatUnread} />

      <AnimatePresence>{showSplash && <SplashScreen key="splash" />}</AnimatePresence>

      <AnimatePresence>
        {showNotifyModal && !isBridgeLoading && (
          <NotifyPermissionModal onAllow={handleAllowNotify} onSkip={handleSkipNotify} />
        )}
      </AnimatePresence>
    </div>
  );
}
