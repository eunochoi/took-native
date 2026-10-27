import { Platform } from 'react-native';
import { t, type Language } from '../i18n/core';
import { getLocale } from '../i18n/locale';
import * as Notifications from 'expo-notifications';
import type { Settings } from '../settings/model';

export const REMINDERS = [
  {
    key: 'diaryReminderTime',
    title: 'notifications.diaryTitle',
    body: 'notifications.diaryBody',
    url: '/diary',
  },
  {
    key: 'habitReminderTime',
    title: 'notifications.habitTitle',
    body: 'notifications.habitBody',
    url: '/habit',
  },
  {
    key: 'soberReminderTime',
    title: 'notifications.soberTitle',
    body: 'notifications.soberBody',
    url: '/sober',
  },
] as const;
export type ReminderKey = (typeof REMINDERS)[number]['key'];
export type ReminderTimes = Pick<Settings, ReminderKey>;
const CHANNEL_ID = 'daily-reminders';
let pending: Promise<unknown> = Promise.resolve();

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.then(operation);
  pending = result.catch(() => undefined);
  return result;
}

export async function requestReminderPermission(language: Language = getLocale().language) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: t('notifications.channelName', { locale: language }),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!permission.granted) {
    throw new Error('기기 설정에서 BlooLog의 알림을 허용해주세요.');
  }
}

async function reconcile(times: ReminderTimes, language: Language) {
  const permission = await Notifications.getPermissionsAsync();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  if (Platform.OS === 'android') {
    const channel = await Notifications.getNotificationChannelAsync(CHANNEL_ID);
    const channelName = t('notifications.channelName', { locale: language });
    if (
      channel?.name !== channelName &&
      (channel || (permission.granted && REMINDERS.some((reminder) => times[reminder.key])))
    ) {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: channelName,
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
  }
  for (const reminder of REMINDERS) {
    const identifier = `took-${reminder.key}`;
    const title = t(reminder.title, { locale: language });
    const body = t(reminder.body, { locale: language });
    const existing = scheduled.find((item) => item.identifier === identifier);
    const time = permission.granted ? times[reminder.key] : null;
    if (
      time &&
      existing?.content.title === title &&
      existing.content.body === body &&
      existing?.content.data?.reminderTime === time &&
      existing.content.data?.url === reminder.url
    )
      continue;
    if (existing) await Notifications.cancelScheduledNotificationAsync(identifier);
    if (!time) continue;
    const [hour, minute] = time.split(':').map(Number);
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title,
        body,
        sound: 'default',
        data: { url: reminder.url, reminderTime: time },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: CHANNEL_ID,
      },
    });
  }
}

export function syncReminders(times: ReminderTimes, language: Language = getLocale().language) {
  return enqueue(() => reconcile(times, language));
}

export function saveReminder(
  times: ReminderTimes,
  key: ReminderKey,
  time: string | null,
  persist: (patch: Partial<Settings>) => Promise<void>,
  language: Language = getLocale().language,
) {
  return enqueue(async () => {
    if (time !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      throw new Error('올바른 시간을 입력해주세요.');
    }
    if (time !== null) await requestReminderPermission(language);
    try {
      await reconcile({ ...times, [key]: time }, language);
      await persist({ [key]: time });
    } catch (error) {
      await reconcile(times, language).catch(() => undefined);
      throw error;
    }
  });
}
