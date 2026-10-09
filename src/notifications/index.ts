import * as Notifications from 'expo-notifications';
import type { Settings } from '../settings/model';

export const REMINDERS = [
  {
    key: 'diaryReminderTime',
    title: '일기 작성 알림',
    body: '오늘의 감정을 일기에 남겨보세요.',
    url: '/diary',
  },
  {
    key: 'habitReminderTime',
    title: '습관 실천 알림',
    body: '오늘의 습관을 실천하고 기록해보세요.',
    url: '/habit',
  },
  {
    key: 'soberReminderTime',
    title: '거리두기 확인 알림',
    body: '이어온 거리두기를 확인해보세요.',
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

export async function requestReminderPermission() {
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: '일기·습관·거리두기 알림',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!permission.granted) {
    throw new Error('기기 설정에서 took의 알림을 허용해주세요.');
  }
}

async function reconcile(times: ReminderTimes) {
  const permission = await Notifications.getPermissionsAsync();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const reminder of REMINDERS) {
    const identifier = `took-${reminder.key}`;
    const existing = scheduled.find((item) => item.identifier === identifier);
    const time = permission.granted ? times[reminder.key] : null;
    if (
      time &&
      existing?.content.data?.reminderTime === time &&
      existing.content.data?.url === reminder.url
    )
      continue;
    if (existing) await Notifications.cancelScheduledNotificationAsync(identifier);
    if (!time) continue;
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: '일기·습관·거리두기 알림',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    const [hour, minute] = time.split(':').map(Number);
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: reminder.title,
        body: reminder.body,
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

export function syncReminders(times: ReminderTimes) {
  return enqueue(() => reconcile(times));
}

export function saveReminder(
  times: ReminderTimes,
  key: ReminderKey,
  time: string | null,
  persist: (patch: Partial<Settings>) => Promise<void>,
) {
  return enqueue(async () => {
    if (time !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      throw new Error('올바른 시간을 입력해주세요.');
    }
    if (time !== null) await requestReminderPermission();
    try {
      await reconcile({ ...times, [key]: time });
      await persist({ [key]: time });
    } catch (error) {
      await reconcile(times).catch(() => undefined);
      throw error;
    }
  });
}
