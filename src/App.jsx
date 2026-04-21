import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import BookingScreen from './screens/BookingScreen.jsx';
import InfoScreen from './screens/InfoScreen.jsx';
import ProfileScreen from './screens/ProfileScreen.jsx';
import MasterScreen from './screens/MasterScreen.jsx';
import OnboardingScreen from './screens/OnboardingScreen.jsx';
import TabBar from './components/TabBar.jsx';
import { useVK } from './contexts/VKContext.jsx';

/**
 * Routes map. We use internal state for simplicity; @vkontakte/vk-mini-apps-router
 * is wired as a dependency and can be swapped in here for hash-based routing
 * when the app is published inside VK.
 */
const ROUTES = ['booking', 'info', 'profile', 'master'];

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } }
};

function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8, ease: 'easeOut' } }}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000000',
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
          color: '#FFFFFF',
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
  const currentScreen = route;

  const navigate = (next) => {
    if (!ROUTES.includes(next)) return;
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
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{ width: '100%', height: '100%' }}
        >
          {currentScreen === 'booking' && <BookingScreen onNavigate={navigate} onConfirmChange={setIsConfirm} />}
          {currentScreen === 'info' && <InfoScreen />}
          {currentScreen === 'profile' && <ProfileScreen />}
          {currentScreen === 'master' && <MasterScreen />}
        </motion.div>
      </AnimatePresence>

      <TabBar active={route} onChange={navigate} isHidden={isConfirm} />

      <AnimatePresence>{showSplash && <SplashScreen key="splash" />}</AnimatePresence>
    </div>
  );
}
