import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { EmotionImage } from '../../components/EmotionImage';
import { OrganicBadge } from '../../components/OrganicBadge';
import { Text } from '../../components/Text';
import { EMOTIONS } from '../../domain/constants';
import { diaryQueries, habitQueries } from '../../queries';
import { CalendarDay } from './CalendarDay';
import { MonthCalendar } from './MonthCalendar';

export function DiaryHabitMonthCalendar(props: Parameters<typeof MonthCalendar>[0]) {
  const db = useSQLiteContext();
  const diaries = useQuery(diaryQueries.month(db, props.month));
  const completions = useQuery(
    habitQueries.completions(db, `${props.month}-01`, `${props.month}-31`),
  );
  const diaryByDate = useMemo(
    () => new Map((diaries.data ?? []).map((diary) => [diary.date, diary])),
    [diaries.data],
  );
  const counts = useMemo(() => {
    const result = new Map<string, number>();
    for (const record of completions.data ?? [])
      result.set(record.date, (result.get(record.date) ?? 0) + 1);
    return result;
  }, [completions.data]);
  return (
    <View className={props.fillHeight ? 'flex-1 min-h-0 gap-4' : 'gap-4'}>
      {(diaries.isError || completions.isError) && (
        <View className="flex-row gap-2">
          <Text accessibilityRole="alert" className="text-sm text-theme-danger">
            월 기록을 불러오지 못했어요.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void diaries.refetch();
              void completions.refetch();
            }}
          >
            <Text className="text-sm underline text-theme-danger">다시 시도</Text>
          </Pressable>
        </View>
      )}
      <MonthCalendar
        {...props}
        renderDay={(day) => {
          const diary = day.outside ? undefined : diaryByDate.get(day.date);
          const count = day.outside ? 0 : (counts.get(day.date) ?? 0);
          const hasDecoration = diary !== undefined || count > 0;
          const rotation = -10 + ((diary ? new Date(diary.created_at).getTime() % 10 : 0) * 20) / 9;
          return (
            <CalendarDay
              {...day}
              selected={false}
              label={[
                day.date,
                diary ? `일기 있음, ${EMOTIONS[diary.emotion]?.name}` : '',
                count ? `습관 ${count}개 완료` : '',
              ]
                .filter(Boolean)
                .join(', ')}
            >
              {hasDecoration ? (
                <View
                  className={`items-center justify-center ${diary ? 'w-full h-4/5' : 'scale-[1.2]'}`}
                >
                  {diary && (
                    <View
                      className="w-full h-full"
                      style={{ transform: [{ rotate: `${rotation}deg` }] }}
                    >
                      <EmotionImage emotion={diary.emotion} fill />
                    </View>
                  )}
                  {count > 0 && (
                    <OrganicBadge
                      tone="calendar"
                      className={diary ? 'absolute -top-1 -right-2' : ''}
                    >
                      {count}
                    </OrganicBadge>
                  )}
                </View>
              ) : undefined}
            </CalendarDay>
          );
        }}
      />
    </View>
  );
}
