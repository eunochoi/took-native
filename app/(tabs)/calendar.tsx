import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { calendarHabitProgressCounts } from '../../src/domain/calendar';
import { ColorView } from '../../src/components/ColorTransition';
import { PageTopSection } from '../../src/components/PageTopSection';
import { Toolbar } from '../../src/components/Toolbar';
import { useModalNavigation } from '../../src/navigation/ModalNavigationProvider';
import { diaryQueries, habitQueries, useToday } from '../../src/queries';
import { CalendarRecordCounts } from '../../src/screens/calendar/CalendarRecordCounts';
import { DiaryHabitMonthCalendar } from '../../src/screens/calendar/DiaryHabitMonthCalendar';
import { useAppTheme } from '../../src/theme/AppThemeProvider';
import { PAGE_CLASS_NAME } from '../../src/theme/classes';

export default function CalendarScreen() {
  const today = useToday();
  const db = useSQLiteContext();
  const { navigationBottom, navigationHeight, rem } = useAppTheme();
  const { openModal } = useModalNavigation();
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const diaries = useQuery(diaryQueries.month(db, month));
  const completions = useQuery(habitQueries.completions(db, `${month}-01`, `${month}-31`));
  const habits = useQuery(habitQueries.list(db));
  const progressCounts = useMemo(
    () =>
      habits.data && completions.data && !habits.isError && !completions.isError
        ? calendarHabitProgressCounts(habits.data, completions.data, month, today)
        : null,
    [habits.data, completions.data, habits.isError, completions.isError, month, today],
  );
  return (
    <ColorView className={PAGE_CLASS_NAME}>
      <PageTopSection title="월간 기록" hashtags="#기록 #발자국">
        <Toolbar>
          <CalendarRecordCounts diaryCount={diaries.data?.length ?? 0} counts={progressCounts} />
        </Toolbar>
      </PageTopSection>
      <View
        className="flex-1 min-h-0 pt-6"
        style={{
          paddingHorizontal: '5%',
          paddingBottom: navigationBottom + navigationHeight + rem,
        }}
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
            openModal({ pathname: '/calendar/[date]', params: { date } });
          }}
        />
      </View>
    </ColorView>
  );
}
