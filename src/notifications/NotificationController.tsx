import { useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { useRootNavigationState, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useSettings } from '../settings/SettingsProvider';
import { REMINDERS, syncReminders } from './index';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function NotificationController() {
  const { settings } = useSettings();
  const router = useRouter();
  const navigation = useRootNavigationState();
  const current = useRef(settings);
  current.current = settings;
  useEffect(() => {
    const sync = () => {
      void syncReminders(current.current).catch(() => {
        Alert.alert('알림을 예약하지 못했어요', '설정에서 알림 시간을 다시 저장해주세요.');
      });
    };
    sync();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => subscription.remove();
  }, [
    settings.diaryReminderTime,
    settings.habitReminderTime,
    settings.soberReminderTime,
  ]);
  useEffect(() => {
    if (!navigation?.key) return;
    const redirect = (response: Notifications.NotificationResponse) => {
      const url = response.notification.request.content.data?.url;
      const reminder = REMINDERS.find((item) => item.url === url);
      if (!reminder) return;
      Notifications.clearLastNotificationResponse();
      router.push(reminder.url);
    };
    const response = Notifications.getLastNotificationResponse();
    if (response) redirect(response);
    const subscription = Notifications.addNotificationResponseReceivedListener(redirect);
    return () => subscription.remove();
  }, [router, navigation?.key]);
  return null;
}
