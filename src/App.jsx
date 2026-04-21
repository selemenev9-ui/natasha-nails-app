import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import HomeScreen from './screens/HomeScreen.jsx';
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
const ROUTES = ['home', 'booking', 'info', 'profile', 'master'];

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.22, ease: 'easeOut' } },
  exit: { opacity: 1, transition: { duration: 0 } }
};

const homeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.22, ease: 'easeOut' } },
  exit: { opacity: 1, transition: { duration: 0 } }
};

function Loader() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        fontSize: '13px',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'var(--ink-60)'
      }}
    >
      Загрузка
    </div>
  );
}

export default function App() {
  const { isBridgeLoading, isFirstVisit, completeOnboarding } = useVK();
  const [route, setRoute] = useState('home');
  const [isConfirm, setIsConfirm] = useState(false);
  const currentScreen = route;

  const navigate = (next) => {
    if (!ROUTES.includes(next)) return;
    setRoute(next);
  };
  if (isBridgeLoading) {
    return (
      <div className="app-shell">
        <Loader />
      </div>
    );
  }

  if (isFirstVisit) {
    return (
      <div className="app-shell">
        <OnboardingScreen onComplete={completeOnboarding} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="material" />
      <AnimatePresence mode="wait">
        {currentScreen === 'home' && (
          <motion.div
            key={currentScreen}
            variants={homeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ width: '100%', height: '100%' }}
          >
            <HomeScreen onNavigate={navigate} />
          </motion.div>
        )}

        {currentScreen === 'booking' && (
          <motion.div
            key={currentScreen}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ width: '100%', height: '100%' }}
          >
            <BookingScreen onNavigate={navigate} onConfirmChange={setIsConfirm} />
          </motion.div>
        )}

        {currentScreen === 'info' && (
          <motion.div
            key={currentScreen}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ width: '100%', height: '100%' }}
          >
            <InfoScreen />
          </motion.div>
        )}

        {currentScreen === 'profile' && (
          <motion.div
            key="profile"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ width: '100%', height: '100%' }}
          >
            <ProfileScreen />
          </motion.div>
        )}
        {currentScreen === 'master' && (
          <motion.div
            key="master"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ width: '100%', height: '100%' }}
          >
            <MasterScreen />
          </motion.div>
        )}
        
      </AnimatePresence>

      <TabBar active={route} onChange={navigate} isHidden={isConfirm} />
    </div>
  );
}
