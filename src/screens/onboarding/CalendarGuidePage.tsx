import { View } from 'react-native';
import { Text } from '../../components/Text';
import { CalendarHabitProgress } from '../calendar/CalendarHabitProgress';
import { CalendarRecordCounts } from '../calendar/CalendarRecordCounts';

export function CalendarGuidePage() {
  return (
    <View className="w-full gap-6">
      <View className="gap-2">
        <Text
          accessibilityRole="header"
          className="text-center text-2xl font-semibold tracking-tight"
        >
          달력 기록을 읽어요
        </Text>
        <Text className="text-center text-sm text-theme-text-secondary">
          한 달의 일기와 습관을 확인해요.
        </Text>
      </View>
      <View className="gap-6 ios:curve-continuous rounded-2xl bg-theme-surface-muted p-6">
        <View className="gap-4">
          <View className="gap-2">
            <Text className="text-center text-base font-semibold">습관 진행바</Text>
            <Text className="text-center text-sm text-theme-text-secondary">
              색상과 길이로 습관 완료율을 확인해요.
            </Text>
          </View>
          {[
            { label: '분홍 · 25% 미만', done: 1, total: 5 },
            { label: '노랑 · 25% 이상 75% 미만', done: 2, total: 4 },
            { label: '초록 · 75% 이상', done: 4, total: 4 },
          ].map(({ label, done, total }) => (
            <View key={label} className="gap-1.5">
              <Text className="text-sm text-theme-text-secondary">{label}</Text>
              <CalendarHabitProgress done={done} total={total} />
            </View>
          ))}
          <Text className="text-center text-xs text-theme-text-secondary">
            0%는 표시하지 않아요.
          </Text>
        </View>
        <View className="h-px bg-theme-border/50" />
        <View className="gap-3">
          <Text className="text-center text-base font-semibold">상단 툴바의 숫자</Text>
          <View className="items-center">
            <CalendarRecordCounts diaryCount={12} counts={{ low: 2, medium: 5, high: 8 }} />
          </View>
          <Text className="text-center text-sm text-theme-text-secondary">
            일기는 개수, 습관 진행바 색상별 날짜 수예요.
          </Text>
        </View>
      </View>
    </View>
  );
}
