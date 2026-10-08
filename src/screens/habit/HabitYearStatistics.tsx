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
    () => getHabitYearSummary(year, dates, startedDate),
    [year, dates, startedDate],
  );
  return (
    <View className="gap-4">
      <Text accessibilityRole="header" className="text-xl font-bold">연도별 기록</Text>
      <HabitYearHeader year={year} today={today} onYearChange={setYear} />
      <HabitStatisticsSummary
        stats={[
          { label: '실천 횟수', value: yearly.completed, unit: '회' },
          { label: '실천율', value: yearly.rate, unit: '%' },
        ]}
        unavailable={unavailable}
      />
      <HabitYearChart monthly={yearly.monthly} />
    </View>
  );
}
