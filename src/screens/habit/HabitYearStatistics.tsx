import { useI18n } from '../../i18n/react';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Text } from '../../components/Text';
import { getHabitYearSummary } from '../../domain/habitStats';
import { HabitStatisticsSummary } from './HabitStatisticsSummary';
import { HabitYearChart } from './HabitYearChart';
import { HabitYearHeader } from './HabitYearHeader';

export function HabitYearStatistics({
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
  const { t } = useI18n();

  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const yearly = useMemo(
    () => getHabitYearSummary(year, dates, startedDate, today),
    [year, dates, startedDate, today],
  );
  return (
    <View className="gap-6">
      <Text accessibilityRole="header" className="text-xl font-semibold">
        {t('habit.yearly')}
      </Text>
      <HabitStatisticsSummary
        stats={[
          {
            label: t('habit.completionCount'),
            icon: 'check',
            value: yearly.completed,
            unit: t('habit.timesUnit', { count: yearly.completed }),
          },
          {
            label: t('habit.missedCount'),
            icon: 'close',
            value: yearly.missed,
            unit: t('habit.timesUnit', { count: yearly.missed }),
          },
          { label: t('habit.rate'), icon: 'habit-rate', value: yearly.rate ?? '—', unit: '%' },
        ]}
        unavailable={unavailable}
      />
      <View className="px-1 gap-4">
        <HabitYearHeader
          year={year}
          startedDate={startedDate}
          today={today}
          onYearChange={setYear}
        />

        <HabitYearChart monthly={yearly.monthly} />
      </View>
    </View>
  );
}
