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
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const yearly = useMemo(
    () => getHabitYearSummary(year, dates, startedDate, today),
    [year, dates, startedDate, today],
  );
  return (
    <View className="gap-4">
      <Text accessibilityRole="header" className="text-xl font-semibold">
        연간 기록
      </Text>
      <View className="px-2 gap-4">
        <HabitYearHeader
          year={year}
          startedDate={startedDate}
          today={today}
          onYearChange={setYear}
        />
        <HabitStatisticsSummary
          stats={[
            { label: '실천 횟수', value: yearly.completed, unit: '회' },
            { label: '놓친 횟수', value: yearly.missed, unit: '회' },
            { label: '실천율', value: yearly.rate ?? '—', unit: '%' },
          ]}
          unavailable={unavailable}
        />
        <HabitYearChart monthly={yearly.monthly} />
      </View>
    </View>
  );
}
