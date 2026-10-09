import { format, parseISO } from 'date-fns';
import { View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Text } from '../../components/Text';
import { formatSoberDuration, formatSoberGoal, type getSoberSummary } from '../../domain/sober';
import { useAppTheme } from '../../theme/AppThemeProvider';

export function SoberStatisticsSummary({
  summary,
  initialStartedAt,
}: {
  summary: ReturnType<typeof getSoberSummary>;
  initialStartedAt: string;
}) {
  const { rem: appRem } = useAppTheme();
  return (
    <View className="w-full flex-row">
      {(
        [
          {
            icon: 'emoji-events',
            label: '최고 기록',
            value: formatSoberDuration(summary.longest),
          },
          {
            icon: 'flag',
            label: `목표 ${formatSoberGoal(summary.goalDays)}`,
            value: `${summary.progress.toFixed(1)}%`,
          },
          {
            icon: 'play-circle-outline',
            label: '시작일',
            value: format(parseISO(initialStartedAt), 'yy년 M월 d일'),
          },
        ] as const
      ).map((stat, index) => (
        <View
          key={stat.label}
          className={`flex-1 min-w-0 items-center gap-2 px-1 py-4 border-theme-border-muted ${index < 2 ? 'border-r' : ''}`}
        >
          <AppIcon name={stat.icon} size={appRem * 2} className="text-theme-accent" />
          <Text className="text-center text-sm text-theme-text-secondary">
            {stat.label}
          </Text>
          <Text className="whitespace-nowrap text-center text-sm tracking-tighter font-bold leading-snug text-theme-text-primary">
            {stat.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
