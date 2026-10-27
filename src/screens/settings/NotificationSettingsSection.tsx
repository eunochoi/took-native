import { useI18n } from '../../i18n/react';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../../components/Text';
import { REMINDERS, saveReminder, type ReminderKey } from '../../notifications';
import { useSettings } from '../../settings/SettingsProvider';
import { NotificationTimePicker } from './NotificationTimePicker';

export function NotificationSettingsSection({ disabled }: { disabled: boolean }) {
  const { t, language } = useI18n();
  const { settings, updateSettings } = useSettings();
  const [selected, setSelected] = useState<ReminderKey | null>(null);
  const titles = {
    diaryReminderTime: t('settings.diaryReminder'),
    habitReminderTime: t('settings.habitReminder'),
    soberReminderTime: t('settings.soberReminder'),
  };
  const reminder = REMINDERS.find((item) => item.key === selected);
  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="text-xl py-2 font-semibold">
        {t('settings.reminders')}
      </Text>
      <View className="gap-6 py-2 px-1">
        {REMINDERS.map((item) => {
          const time = settings[item.key];
          const hour = time ? Number(time.slice(0, 2)) : 0;
          const label = time
            ? t('settings.time', {
                period: t(hour < 12 ? 'settings.am' : 'settings.pm'),
                time: `${hour % 12 || 12}:${time.slice(3)}`,
              })
            : t('settings.unset');
          return (
            <View
              key={item.key}
              className="w-full min-w-0 flex-row flex-wrap items-center justify-between gap-2"
            >
              <Text className="min-w-0 text-base text-theme-text-secondary">
                {titles[item.key]}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('settings.reminderTime', {
                  title: titles[item.key],
                  time: label,
                })}
                accessibilityState={{ disabled }}
                disabled={disabled}
                hitSlop={8}
                onPress={() => setSelected(item.key)}
                className={`ml-auto h-8 justify-center pl-2 active:opacity-65 ${disabled ? 'opacity-40' : 'opacity-100'}`}
              >
                <Text className="text-base text-theme-accent">{label}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      {reminder && (
        <NotificationTimePicker
          title={titles[reminder.key]}
          value={settings[reminder.key]}
          onClose={() => setSelected(null)}
          onApply={(time) => saveReminder(settings, reminder.key, time, updateSettings, language)}
        />
      )}
    </View>
  );
}
