import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import bridge from '@vkontakte/vk-bridge';

const VKContext = createContext(null);

export function VKProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [isBridgeLoading, setIsBridgeLoading] = useState(true);
  const [cardTheme, setCardTheme] = useState('light');
  const [seenTips, setSeenTips] = useState([]);
  const isVKEnv = typeof window !== 'undefined' && window.location.search.includes('vk_user_id');

  useEffect(() => {
    let isMounted = true;

    const initBridge = async () => {
      if (!isVKEnv) {
        if (isMounted) {
          setUser({
            first_name: 'Разработчик',
            photo_200: 'https://vk.com/images/camera_200.png',
            id: 123456789
          });
          setIsFirstVisit(false);
          setCardTheme('dark');
          setSeenTips([]);
          setIsBridgeLoading(false);
        }
        return;
      }

      try {
      bridge.send('VKWebAppInit');

        const [profile, storage] = await Promise.all([
          bridge.send('VKWebAppGetUserInfo'),
          bridge.send('VKWebAppStorageGet', { keys: ['is_registered', 'card_theme', 'seen_tips'] }),
          new Promise((resolve) => setTimeout(resolve, 1200))
        ]);
        if (isMounted) {
          setUser(profile ?? null);
        }

        const storedEntry = Array.isArray(storage?.keys)
          ? storage.keys.find((item) => item?.key === 'is_registered')
          : null;
        const themeEntry = Array.isArray(storage?.keys)
          ? storage.keys.find((item) => item?.key === 'card_theme')
          : null;
        const seenTipsEntry = Array.isArray(storage?.keys)
          ? storage.keys.find((item) => item?.key === 'seen_tips')
          : null;
        const isRegistered = storedEntry?.value;
        const themeValue = themeEntry?.value;
        const seenTipsValue = seenTipsEntry?.value;

        if (themeValue) {
          setCardTheme(themeValue);
        }

        if (seenTipsValue) {
          try {
            const parsedSeenTips = JSON.parse(seenTipsValue);
            if (Array.isArray(parsedSeenTips)) {
              setSeenTips(parsedSeenTips);
            }
          } catch (error) {
            console.error('VK Storage seen_tips parse failed:', error);
          }
        }

        if (isMounted) {
          setIsFirstVisit(!isRegistered);
        }
      } catch (error) {
        console.error('VK Bridge initialization failed:', error);
      } finally {
        if (isMounted) {
          setIsBridgeLoading(false);
        }
      }
    };

    initBridge();

    return () => {
      isMounted = false;
    };
  }, [isVKEnv]);

  const completeOnboarding = useCallback(async () => {
    setIsFirstVisit(false);

    if (!isVKEnv) return;

    try {
      await bridge.send('VKWebAppStorageSet', { key: 'is_registered', value: 'true' });
    } catch (error) {
      console.error('VK Storage is_registered update failed:', error);
    }
  }, [isVKEnv]);

  const toggleTheme = useCallback(async () => {
    let newTheme = 'light';

    setCardTheme((prevTheme) => {
      newTheme = prevTheme === 'dark' ? 'light' : 'dark';
      return newTheme;
    });

    if (!isVKEnv) return;

    try {
      await bridge.send('VKWebAppStorageSet', { key: 'card_theme', value: newTheme });
    } catch (error) {
      console.error('VK Storage card_theme update failed:', error);
    }
  }, [isVKEnv]);

  const triggerHaptic = useCallback((style = 'light') => {
    if (!isVKEnv) return;

    if (bridge.supports('VKWebAppTapticImpactOccurred')) {
      bridge.send('VKWebAppTapticImpactOccurred', { style }).catch(() => {});
    }
  }, [isVKEnv]);

  const value = useMemo(
    () => ({
      user,
      isFirstVisit,
      isBridgeLoading,
      cardTheme,
      toggleTheme,
      seenTips,
      isVKEnv,
      completeOnboarding,
      triggerHaptic
    }),
    [user, isFirstVisit, isBridgeLoading, cardTheme, toggleTheme, seenTips, isVKEnv, completeOnboarding, triggerHaptic]
  );

  return <VKContext.Provider value={value}>{children}</VKContext.Provider>;
}

export function useVK() {
  const context = useContext(VKContext);
  if (!context) {
    throw new Error('useVK must be used within VKProvider');
  }
  return context;
}
