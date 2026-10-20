import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { View } from 'react-native';
import { Text } from '../../components/Text';

export function HabitRecentRecord({
  dates,
  startedDate,
  today,
  unavailable,
}: {
  dates: string[];
  startedDate: string;
  today: string;
  unavailable: boolean;
}) {
  const latest = dates
    .filter((date) => date >= startedDate && date <= today)
    .sort()
    .at(-1);
  const daysAgo = latest ? differenceInCalendarDays(parseISO(today), parseISO(latest)) : null;
  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="text-xl font-semibold">
        최근 기록
      </Text>
      <Text className="text-base text-theme-text-secondary">
        {unavailable
          ? '—'
          : latest
            ? `${format(parseISO(latest), 'yyyy년 M월 d일')} · ${daysAgo === 0 ? '오늘' : `${daysAgo}일 전`}`
            : '아직 기록이 없어요.'}
      </Text>
    </View>
  );
}
