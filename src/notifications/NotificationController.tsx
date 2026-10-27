import { useI18n } from '../i18n/react';
import { t } from '../i18n/core';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useRootNavigationState, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useSettings } from '../settings/SettingsProvider';
import { REMINDERS, syncReminders } from './index';
import { useNotice } from '../components/NoticeProvider';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function NotificationController() {
  const { language } = useI18n();
  const { showNotice } = useNotice();
  const { settings } = useSettings();
  const router = useRouter();
  const navigation = useRootNavigationState();
  const current = useRef({ settings, language });
  current.current = { settings, language };
  useEffect(() => {
    const sync = () => {
      void syncReminders(current.current.settings, current.current.language).catch(() => {
        showNotice({
          tone: 'error',
          title: t('notifications.syncFailed', { locale: current.current.language }),
          message: t('notifications.syncRetry', { locale: current.current.language }),
        });
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
    showNotice,
    language,
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
