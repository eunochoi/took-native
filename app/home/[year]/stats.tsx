import { useLocalSearchParams, useRouter } from 'expo-router';
import { useToday } from '../../../src/queries';
import { HomeStatsScreen } from '../../../src/screens/home/HomeStatsScreen';

export default function HomeStats() {
  const { year: parameter } = useLocalSearchParams<{ year: string }>();
  const router = useRouter();
  const currentYear = Number(useToday().slice(0, 4));
  const parsedYear = Number(parameter);
  const year =
    /^\d{4}$/.test(parameter ?? '') && parsedYear >= 1900 && parsedYear <= 2100
      ? parsedYear
      : currentYear;
  return (
    <HomeStatsScreen
      year={year}
      currentYear={currentYear}
      onYearChange={(value) => router.setParams({ year: String(value) })}
    />
  );
}
