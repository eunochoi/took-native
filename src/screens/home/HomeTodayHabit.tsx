import { useI18n } from '../../i18n/react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { AppIcon } from '../../components/AppIcon';
import { Text } from '../../components/Text';
import { habitProgressBand } from '../../domain/calendar';
import { getHabitDaySummary } from '../../domain/habitStats';
import { habitQueries } from '../../queries';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { HomeTodayItem } from './HomeTodayItem';

export function HomeTodayHabit({ today }: { today: string }) {
  const { t } = useI18n();
  const db = useSQLiteContext();
  const router = useRouter();
  const { colors, rem } = useAppTheme();
  const habits = useQuery(habitQueries.list(db));
  const completions = useQuery(habitQueries.completions(db, today, today));
  const { completed, total, excludedCompleted } = getHabitDaySummary(
    today,
    habits.data ?? [],
    completions.data ?? [],
  );
  const pending = habits.isPending || completions.isPending;
  const error = habits.isError || completions.isError;
  const progress = total > 0 ? Math.min(1, Math.max(0, completed / total)) : 0;
  const progressBand = habitProgressBand(progress * 100);
  const progressColor =
    progressBand === 'high'
      ? colors.progressHigh
      : progressBand === 'medium'
        ? colors.progressMedium
        : progressBand === 'low'
          ? colors.progressLow
          : colors.border;
  const status = error
    ? t('home.loadFailed')
    : total === 0
      ? habits.data?.some((habit) => habit.priority === 0)
        ? t('home.freeRecords', { count: excludedCompleted })
        : t('home.addHabit')
      : completed === total
        ? t('home.completed')
        : `${completed > 0 ? Math.min(99, Math.max(1, Math.round(progress * 100))) : 0}%`;
  const visualSize = rem * 3.5;
  const circumference = 2 * Math.PI * 45.5;

  return (
    <HomeTodayItem
      title={t('home.habitTitle')}
      status={status}
      pending={pending}
      accessibilityLabel={t('home.habitLinkStatus', {
        value: error
          ? status
          : t('home.completedStatus', { value: `${completed}/${total}`, title: status }),
      })}
      onPress={() => router.push('/habit')}
    >
      {error ? (
        <AppIcon name="habit" size={visualSize} className="text-theme-text-disabled" />
      ) : (
        <View className="h-14 w-14 items-center justify-center">
          <View className="absolute inset-0" pointerEvents="none">
            <Svg width={visualSize} height={visualSize} viewBox="0 0 100 100" accessible={false}>
              <Circle cx={50} cy={50} r={45.5} fill="none" stroke={colors.border} strokeWidth={9} />
              {progress > 0 && (
                <Circle
                  cx={50}
                  cy={50}
                  r={45.5}
                  fill="none"
                  stroke={progressColor}
                  strokeWidth={9}
                  strokeLinecap="round"
                  strokeDasharray={[circumference, circumference]}
                  strokeDashoffset={circumference * (1 - progress)}
                  rotation={-90}
                  origin="50, 50"
                />
              )}
            </Svg>
          </View>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
            className="w-10 text-center text-base font-semibold"
          >
            {`${completed}/${total}`}
          </Text>
        </View>
      )}
    </HomeTodayItem>
  );
}
