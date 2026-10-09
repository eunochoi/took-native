import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../../components/Text';
import { REMINDERS, saveReminder, type ReminderKey } from '../../notifications';
import { useSettings } from '../../settings/SettingsProvider';
import { NotificationTimePicker } from './NotificationTimePicker';

export function NotificationSettingsSection({ disabled }: { disabled: boolean }) {
  const { settings, updateSettings } = useSettings();
  const [selected, setSelected] = useState<ReminderKey | null>(null);
  const reminder = REMINDERS.find((item) => item.key === selected);
  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="text-xl py-2 font-semibold">
        알림
      </Text>
      <View className="gap-6 p-2">
        {REMINDERS.map((item) => {
          const time = settings[item.key];
          const hour = time ? Number(time.slice(0, 2)) : 0;
          const label = time
            ? `${hour < 12 ? '오전' : '오후'} ${hour % 12 || 12}:${time.slice(3)}`
            : '미정';
          return (
            <View
              key={item.key}
              className="w-full min-w-0 flex-row flex-wrap items-center justify-between gap-2"
            >
              <Text className="min-w-0 text-base text-theme-text-secondary">{item.title}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.title} 시간, ${label}`}
                accessibilityState={{ disabled }}
                disabled={disabled}
                hitSlop={8}
                onPress={() => setSelected(item.key)}
                className={`ml-auto h-8 justify-center px-2 active:opacity-65 ${disabled ? 'opacity-40' : 'opacity-100'}`}
              >
                <Text className="text-base text-theme-accent">{label}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      {reminder && (
        <NotificationTimePicker
          title={reminder.title}
          value={settings[reminder.key]}
          onClose={() => setSelected(null)}
          onApply={(time) => saveReminder(settings, reminder.key, time, updateSettings)}
        />
      )}
    </View>
  );
}
