import { View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Text } from '../../components/Text';
import type { calendarHabitProgressCounts } from '../../domain/calendar';
import { useAppTheme } from '../../theme/AppThemeProvider';

export function CalendarRecordCounts({
  diaryCount,
  counts,
  unavailable = false,
}: {
  diaryCount: number;
  counts: ReturnType<typeof calendarHabitProgressCounts> | null;
  unavailable?: boolean;
}) {
  const { iconSizes } = useAppTheme();
  return (
    <View className="min-w-0 shrink flex-row items-center gap-2.5 ml-1">
      {[
        {
          key: 'diary',
          icon: 'diary' as const,
          className: 'text-theme-accent',
          value: `${diaryCount}개`,
          label: `일기 ${diaryCount}개`,
        },
        ...(
          [
            { band: 'low', label: '25% 미만', className: 'text-theme-progress-low' },
            { band: 'medium', label: '25% 이상 75% 미만', className: 'text-theme-progress-medium' },
            { band: 'high', label: '75% 이상', className: 'text-theme-progress-high' },
          ] as const
        ).map(({ band, label, className }) => ({
          key: band,
          icon: 'habit' as const,
          className,
          value: unavailable ? '–' : `${counts?.[band] ?? 0}일`,
          label: `습관 완료율 ${label}, ${unavailable ? '불러오지 못함' : `${counts?.[band] ?? 0}일`}`,
        })),
      ].map(({ key, icon, className, value, label }) => (
        <View
          key={key}
          accessible
          accessibilityLabel={label}
          className="min-w-0 shrink flex-row items-center gap-1.5"
        >
          <AppIcon name={icon} size={iconSizes.md} className={className} />
          <Text
            numberOfLines={1}
            className="text-sm leading-5 text-theme-text-secondary"
            style={{ includeFontPadding: false }}
          >
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
}
