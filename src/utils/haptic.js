import bridge from '@vkontakte/vk-bridge';

export const haptic = {
  light: () => bridge.send('VKWebAppTapticImpactOccurred', { style: 'light' }).catch(() => {}),
  medium: () => bridge.send('VKWebAppTapticImpactOccurred', { style: 'medium' }).catch(() => {}),
  success: () => bridge.send('VKWebAppTapticNotificationOccurred', { type: 'success' }).catch(() => {}),
  select: () => bridge.send('VKWebAppTapticSelectionChanged', {}).catch(() => {})
};
