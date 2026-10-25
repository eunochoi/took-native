import { MUTED_CARD_BORDER_CLASS_NAME } from '../../theme/classes';
import { View } from 'react-native';
import { InfoNotice } from '../../components/InfoNotice';
import { Text } from '../../components/Text';
import { CalendarHabitProgress } from '../calendar/CalendarHabitProgress';
import { CalendarRecordCounts } from '../calendar/CalendarRecordCounts';

export function CalendarGuidePage() {
  return (
    <View className="w-full gap-6">
      <View className="gap-2">
        <Text
          accessibilityRole="header"
          className="text-center text-[21px] leading-[28px] font-semibold tracking-tight"
        >
          달력 기록을 읽어요
        </Text>
        <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
          한 달의 일기와 습관을 확인해요.
        </Text>
      </View>
      <View
        className={`${MUTED_CARD_BORDER_CLASS_NAME} gap-5 ios:curve-continuous rounded-2xl bg-theme-surface-muted p-4`}
      >
        <View className="gap-4">
          <View className="gap-2">
            <Text className="text-center text-[15.75px] leading-[24.5px] font-semibold">
              습관 진행바
            </Text>
            <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
              색상과 길이로 습관 완료율을 확인해요.
            </Text>
          </View>
          {[
            { label: '분홍 · 25% 미만', done: 1, total: 5 },
            { label: '노랑 · 25% 이상 75% 미만', done: 2, total: 4 },
            { label: '초록 · 75% 이상', done: 4, total: 4 },
          ].map(({ label, done, total }) => (
            <View key={label} className="gap-1.5">
              <Text className="text-[14px] leading-[21px] text-theme-text-secondary">{label}</Text>
              <CalendarHabitProgress done={done} total={total} />
            </View>
          ))}
          <Text className="text-center text-[10.5px] leading-[14px] text-theme-text-secondary">
            완료율이 0%인 날에는 진행바를 표시하지 않아요.
          </Text>
        </View>
        <View className="h-px bg-theme-border/50" />
        <View className="gap-3">
          <Text className="text-center text-[15.75px] leading-[24.5px] font-semibold">
            상단 툴바의 숫자
          </Text>
          <View className="items-center">
            <CalendarRecordCounts
              diaryCount={12}
              counts={{ low: 2, medium: 5, high: 8 }}
              textSize="base"
              textClassName="text-[14px] leading-[21px]"
            />
          </View>
          <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
            일기 숫자는 이번 달에 쓴 일기의 개수예요.{'\n'}습관 숫자는 각 진행바 색상에 해당하는
            날짜 수예요.
          </Text>
        </View>
      </View>
      <InfoNotice textClassName="text-[10.5px] leading-[17.5px]" adjustsFontSizeToFit={false}>
        자유 기록 습관은 완료율 계산에 포함되지 않아요.
      </InfoNotice>
    </View>
  );
}
