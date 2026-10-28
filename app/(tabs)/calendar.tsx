import { useI18n } from '../../src/i18n/react';
import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ColorView } from '../../src/components/ColorTransition';
import { PageTopSection } from '../../src/components/PageTopSection';
import { Toolbar } from '../../src/components/Toolbar';
import { calendarHabitProgressCounts } from '../../src/domain/calendar';
import { useModalNavigation } from '../../src/navigation/ModalNavigationProvider';
import { diaryQueries, habitQueries, useToday } from '../../src/queries';
import { CalendarRecordCounts } from '../../src/screens/calendar/CalendarRecordCounts';
import { DiaryHabitMonthCalendar } from '../../src/screens/calendar/DiaryHabitMonthCalendar';
import { useAppTheme } from '../../src/theme/AppThemeProvider';
import { PAGE_CLASS_NAME } from '../../src/theme/classes';

export default function CalendarScreen() {
  const { t } = useI18n();

  const today = useToday();
  const db = useSQLiteContext();
  const { navigationBottom, navigationHeight, rem } = useAppTheme();
  const { openModal } = useModalNavigation();
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const scrollRef = useRef<ScrollView>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const overflowing = contentHeight > viewportHeight + 1;
  useEffect(() => {
    if (viewportHeight > 0 && !overflowing) scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [viewportHeight, overflowing]);
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
    <ColorView background="surface" className={PAGE_CLASS_NAME}>
      <ScrollView
        ref={scrollRef}
        className="flex-1 min-h-0"
        contentContainerClassName="grow"
        contentContainerStyle={{ minHeight: viewportHeight }}
        onLayout={({ nativeEvent }) => setViewportHeight(nativeEvent.layout.height)}
        onContentSizeChange={(_width, content) => setContentHeight(content)}
        scrollEnabled={overflowing}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
      >
        <PageTopSection title={t('calendar.title')} hashtags={t('calendar.tags')} />
        <Toolbar>
          <CalendarRecordCounts
            diaryCount={diaries.data?.length ?? 0}
            counts={progressCounts}
            unavailable={habits.isError || completions.isError}
          />
        </Toolbar>
        <View
          className="grow"
          style={{
            paddingHorizontal: '5%',
            paddingBottom: navigationBottom + navigationHeight + rem,
          }}
        >
          <DiaryHabitMonthCalendar
            fillHeight
            minimumRowHeight={rem * 3.5}
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
      </ScrollView>
    </ColorView>
  );
}
