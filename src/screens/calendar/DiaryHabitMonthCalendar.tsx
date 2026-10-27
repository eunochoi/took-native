import { useI18n } from '../../i18n/react';
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
  minimumRowHeight?: number;
}) {
  const { t } = useI18n();

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
    <View
      className={
        props.fillHeight ? (props.minimumRowHeight === undefined ? 'flex-1 min-h-0' : 'grow') : ''
      }
    >
      {(diaries.isError || completions.isError || habits.isError) && (
        <QueryError
          className="flex-row gap-2"
          message={t('calendar.monthFailed')}
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
        minimumRowHeight={props.minimumRowHeight}
        fillHeight={props.fillHeight}
        {...swipe.panHandlers}
        accessibilityLabel={t('calendar.monthLabel', { value: props.month })}
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
          let rotation = 0;
          if (diary) {
            // Hash the date so restored timestamps and IDs cannot change the tilt.
            let hash = 2166136261;
            for (const character of date)
              hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
            rotation = ((hash >>> 0) % 21) - 10;
          }
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
                  ? t('calendar.hasDiary', {
                      value: t(`emotions.${(EMOTIONS[diary.emotion] ?? EMOTIONS[9]).key}`),
                    })
                  : count > 0
                    ? t('calendar.noDiary')
                    : '',
                count ? t('calendar.completedSummary', { value: `${count}/${total}` }) : '',
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
