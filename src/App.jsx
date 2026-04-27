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
import SplashScreen from './components/SplashScreen.jsx';
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

export default function App() {
  const { isBridgeLoading, isFirstVisit, isVKEnv, completeOnboarding } = useVK();
  const [route, setRoute] = useState('profile');
  const [isConfirm, setIsConfirm] = useState(false);
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [preSelectedService, setPreSelectedService] = useState(null);
  const [chatUnread, setChatUnread] = useState(0);
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
    if (isBridgeLoading || isFirstVisit || !isVKEnv) return;

    const timeoutId = setTimeout(() => {
      bridge
        .send('VKWebAppStorageGet', { keys: ['notify_allowed'] })
        .then((data) => {
          const val = data?.keys?.find((k) => k.key === 'notify_allowed')?.value;
          const isAllowed = val === '1';
          const isSkipped = val?.startsWith('skip_') && Date.now() < Number(val.split('_')[1]);
          if (isAllowed || isSkipped) return;

          bridge
            .send('VKWebAppAllowMessagesFromGroup', {
              group_id: 237746914,
              key: 'notify_booking'
            })
            .then((result) => {
              if (result?.result) {
                bridge.send('VKWebAppStorageSet', { key: 'notify_allowed', value: '1' }).catch(() => {});
              }
            })
            .catch(() => {
              const skipVal = 'skip_' + String(Date.now() + 3 * 24 * 60 * 60 * 1000);
              bridge.send('VKWebAppStorageSet', { key: 'notify_allowed', value: skipVal }).catch(() => {});
            });
        })
        .catch(() => {});
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [isBridgeLoading, isFirstVisit, isVKEnv]);

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
    </div>
  );
}
