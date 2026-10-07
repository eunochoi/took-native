import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { View } from 'react-native';
import { ColorView } from '../../src/components/ColorTransition';
import { Toolbar } from '../../src/components/Toolbar';
import { diaryQueries, habitQueries, useToday } from '../../src/queries';
import { CalendarDiaryCount } from '../../src/screens/calendar/CalendarDiaryCount';
import { CalendarHabitCompletionCount } from '../../src/screens/calendar/CalendarHabitCompletionCount';
import { CalendarTopSection } from '../../src/screens/calendar/CalendarTopSection';
import { DiaryHabitMonthCalendar } from '../../src/screens/calendar/DiaryHabitMonthCalendar';
import { useAppTheme } from '../../src/theme/AppThemeProvider';
import { PAGE_CLASS_NAME } from '../../src/theme/classes';

export default function CalendarScreen() {
  const today = useToday();
  const db = useSQLiteContext();
  const { tabContentBottom } = useAppTheme();
  const router = useRouter();
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const diaries = useQuery(diaryQueries.month(db, month));
  const completions = useQuery(habitQueries.completions(db, `${month}-01`, `${month}-31`));
  return (
    <ColorView className={PAGE_CLASS_NAME}>
      <CalendarTopSection>
        <Toolbar>
          <CalendarDiaryCount count={diaries.data?.length ?? 0} />
          <CalendarHabitCompletionCount count={completions.data?.length ?? 0} />
        </Toolbar>
      </CalendarTopSection>
      <View
        className="flex-1 min-h-0 pt-6"
        style={{ paddingHorizontal: '5%', paddingBottom: tabContentBottom }}
      >
        <DiaryHabitMonthCalendar
          fillHeight
          month={month}
          onMonthChange={setMonth}
          selected={selected}
          today={today}
          onSelect={(date) => {
            setSelected(date);
            setMonth(date.slice(0, 7));
            router.push({ pathname: '/calendar/[date]', params: { date } });
          }}
        />
      </View>
    </ColorView>
  );
}
