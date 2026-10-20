import { format, parseISO } from 'date-fns';
import { View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Text } from '../../components/Text';
import { formatSoberGoal, type getSoberSummary } from '../../domain/sober';
import { useAppTheme } from '../../theme/AppThemeProvider';

export function SoberStatisticsSummary({
  summary,
  initialStartedAt,
}: {
  summary: ReturnType<typeof getSoberSummary>;
  initialStartedAt: string;
}) {
  const { rem: appRem } = useAppTheme();
  const longestMinutes = Math.max(0, Math.floor(summary.longest / 60000));
  const initialStart = parseISO(initialStartedAt);
  return (
    <View className="w-full flex-row">
      {(
        [
          {
            icon: 'flag',
            label: '진행률',
            value: `${summary.progress.toFixed(0)}%`,
            note: `목표 ${formatSoberGoal(summary.goalDays)}`,
          },
          {
            icon: 'play-circle-outline',
            label: '첫 시작일',
            value: format(initialStart, 'M월 d일'),
            note: format(initialStart, 'yyyy년'),
          },
          {
            icon: 'emoji-events',
            label: '최고 기록',
            value: `${Math.floor(longestMinutes / 1440)}일`,
            note: `${Math.floor((longestMinutes % 1440) / 60)}시간 ${longestMinutes % 60}분`,
          },
        ] as const
      ).map((stat, index) => (
        <View
          key={stat.label}
          className={`flex-1 min-w-0 items-center gap-2.5 px-1 py-3 border-theme-border-muted ${index < 2 ? 'border-r' : ''}`}
        >
          <View className="flex-col gap-1.5 items-center">
            <AppIcon name={stat.icon} size={appRem * 1.7} className="text-theme-accent" />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              className="tracking-tighter text-sm text-theme-text-secondary"
            >
              {stat.label}
            </Text>
          </View>
          <View className="flex gap-0.5 items-center">
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              className="tracking-tighter w-full text-center text-xl font-bold leading-snug text-theme-text-primary"
            >
              {stat.value}
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              className="tracking-tighter w-full text-center text-sm text-theme-text-secondary"
            >
              {stat.note}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
