import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { BottomSheetModal } from '../../src/components/BottomSheetModal';
import { ColorView } from '../../src/components/ColorTransition';
import { Toolbar } from '../../src/components/Toolbar';
import { diaryQueries, habitQueries, useToday } from '../../src/queries';
import { CalendarDiaryCount } from '../../src/screens/calendar/CalendarDiaryCount';
import { CalendarHabitCompletionCount } from '../../src/screens/calendar/CalendarHabitCompletionCount';
import { CalendarTopSection } from '../../src/screens/calendar/CalendarTopSection';
import { DayInfo } from '../../src/screens/calendar/DayInfo';
import { DiaryHabitMonthCalendar } from '../../src/screens/calendar/DiaryHabitMonthCalendar';
import { useAppTheme } from '../../src/theme/AppThemeProvider';
import { PAGE_CLASS_NAME } from '../../src/theme/classes';

export default function CalendarScreen() {
  const today = useToday();
  const db = useSQLiteContext();
  const { tabContentBottom } = useAppTheme();
  const { height } = useWindowDimensions();
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const diaries = useQuery(diaryQueries.month(db, month));
  const completions = useQuery(habitQueries.completions(db, `${month}-01`, `${month}-31`));
  const [dayOpen, setDayOpen] = useState(false);
  useFocusEffect(
    useCallback(
      () => () => {
        setDayOpen(false);
      },
      [],
    ),
  );
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
            setDayOpen(true);
          }}
        />
      </View>
      <BottomSheetModal
        visible={dayOpen}
        title={
          selected === today ? '오늘' : format(parseISO(selected), 'M월 d일 EEEE', { locale: ko })
        }
        scrollFade
        fixedHeight
        contentKey={selected}
        maxHeight={height * 0.9}
        onClose={() => setDayOpen(false)}
      >
        {(closeSheet) => (
          <View className="pb-6">
            <DayInfo
              key={selected}
              date={selected}
              today={today}
              onNavigate={(action) => {
                closeSheet(action);
              }}
            />
          </View>
        )}
      </BottomSheetModal>
    </ColorView>
  );
}
