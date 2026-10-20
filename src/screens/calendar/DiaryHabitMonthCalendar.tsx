import { useQuery } from '@tanstack/react-query';
import { getDay, parseISO } from 'date-fns';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';
import { View } from 'react-native';
import { EmotionImage } from '../../components/EmotionImage';
import { QueryError } from '../../components/QueryError';
import { Text } from '../../components/Text';
import { calendarDays } from '../../domain/calendar';
import { EMOTIONS } from '../../domain/constants';
import { getHabitDaySummary } from '../../domain/habitStats';
import { useCalendarNavigation } from '../../hooks/useCalendarNavigation';
import { useMonthSwipe } from '../../hooks/useMonthSwipe';
import { diaryQueries, habitQueries } from '../../queries';
import { CalendarDay } from './CalendarDay';
import { CalendarGrid } from './CalendarGrid';
import { CalendarHabitProgress } from './CalendarHabitProgress';
import { CalendarHeader } from './CalendarHeader';

export function DiaryHabitMonthCalendar(props: {
  month: string;
  today: string;
  selected: string;
  onMonthChange: (month: string) => void;
  onSelect: (date: string) => void;
  fillHeight?: boolean;
}) {
  const days = useMemo(() => calendarDays(props.month), [props.month]);
  const navigation = useCalendarNavigation(
    props.month,
    props.onMonthChange,
    undefined,
    props.today,
  );
  const swipe = useMonthSwipe(navigation.changeMonth);
  const db = useSQLiteContext();
  const diaries = useQuery(diaryQueries.month(db, props.month));
  const habits = useQuery(habitQueries.list(db));
  const completions = useQuery(
    habitQueries.completions(db, `${props.month}-01`, `${props.month}-31`),
  );
  const diaryByDate = useMemo(
    () => new Map((diaries.data ?? []).map((diary) => [diary.date, diary])),
    [diaries.data],
  );
  return (
    <View className={props.fillHeight ? 'flex-1 min-h-0' : ''}>
      {(diaries.isError || completions.isError || habits.isError) && (
        <QueryError
          className="flex-row gap-2"
          message="월 기록을 불러오지 못했어요."
          onRetry={() => {
            void diaries.refetch();
            void completions.refetch();
            void habits.refetch();
          }}
        />
      )}
      <View className="px-1">
        <CalendarHeader month={props.month} today={props.today} navigation={navigation} />
      </View>
      <CalendarGrid
        minimumRows={6}
        fillHeight={props.fillHeight}
        {...swipe.panHandlers}
        accessibilityLabel={`${props.month} 월간 달력`}
      >
        {days.map((date) => {
          const outside = date.slice(0, 7) !== props.month;
          const diary = outside ? undefined : diaryByDate.get(date);
          const summary = getHabitDaySummary(date, habits.data ?? [], completions.data ?? []);
          const progressReady =
            !outside &&
            date <= props.today &&
            habits.data !== undefined &&
            completions.data !== undefined &&
            !habits.isError &&
            !completions.isError;
          const count = progressReady ? summary.completed : 0;
          const total = summary.total;
          const rotation = diary ? -10 + ((new Date(diary.created_at).getTime() % 10) * 20) / 9 : 0;
          const weekday = getDay(parseISO(date));
          return (
            <CalendarDay
              key={date}
              date={date}
              month={props.month}
              today={props.today}
              selected={props.selected}
              fillHeight={props.fillHeight}
              showSelectedIndicator={false}
              showTodayIndicator={false}
              disabled={!navigation.isDateAvailable(date)}
              dimmed={!navigation.isDateAvailable(date)}
              onSelect={props.onSelect}
              onMonthChange={navigation.changeToMonth}
              label={[
                date,
                diary
                  ? `일기 있음, ${EMOTIONS[diary.emotion]?.name}`
                  : count > 0
                    ? '일기 없음'
                    : '',
                count ? `집계 대상 ${count}/${total}개 완료` : '',
              ]
                .filter(Boolean)
                .join(', ')}
            >
              <View key="day-content" className="items-center w-full flex-1 min-h-0 gap-1 py-1">
                <View
                  className="w-full flex-1 min-h-0 items-center justify-center"
                  style={{ transform: [{ rotate: `${rotation}deg` }] }}
                >
                  {diary ? (
                    <EmotionImage emotion={diary.emotion} fill />
                  ) : (
                    <Text
                      className={`text-xs ${weekday === 6 ? 'text-theme-calendar-saturday' : weekday === 0 ? 'text-theme-calendar-sunday' : 'text-theme-text-secondary'}`}
                    >
                      {Number(date.slice(-2))}
                    </Text>
                  )}
                </View>
                <View className="h-2 w-full px-2.5 shrink-0">
                  {count > 0 && progressReady && (
                    <CalendarHabitProgress done={count} total={total} />
                  )}
                </View>
              </View>
            </CalendarDay>
          );
        })}
      </CalendarGrid>
    </View>
  );
}
