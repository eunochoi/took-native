import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { AppIcon } from '../../src/components/AppIcon';
import { BottomSheetModal } from '../../src/components/BottomSheetModal';
import { ColorView } from '../../src/components/ColorTransition';
import { Text } from '../../src/components/Text';
import { Toolbar } from '../../src/components/Toolbar';
import { diaryQueries, habitQueries, useToday } from '../../src/queries';
import { CalendarTopSection } from '../../src/screens/calendar/CalendarTopSection';
import { DayInfo } from '../../src/screens/calendar/DayInfo';
import { DiaryHabitMonthCalendar } from '../../src/screens/calendar/DiaryHabitMonthCalendar';
import { useAppTheme } from '../../src/theme/AppThemeProvider';
import { PAGE_CLASS_NAME, RECORD_SURFACE_CLASS_NAME } from '../../src/theme/classes';

export default function CalendarScreen() {
  const today = useToday();
  const db = useSQLiteContext();
  const { tabContentBottom, iconSizes } = useAppTheme();
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
          <View
            className={`h-11 max-w-full flex-row items-center gap-3 rounded-full ${RECORD_SURFACE_CLASS_NAME} pl-3.5 pr-4`}
          >
            <View className="min-w-0 shrink flex-row items-center gap-1.5">
              <View className="h-5 shrink-0 items-center justify-center">
                <AppIcon
                  name="diary"
                  size={iconSizes.md}
                  className="text-theme-accent -mb-0.5"
                  style={{ includeFontPadding: false, lineHeight: iconSizes.sm }}
                />
              </View>
              <Text
                numberOfLines={1}
                className="shrink text-sm leading-5 text-theme-text-secondary"
                style={{ includeFontPadding: false }}
              >
                마음{' '}
                <Text
                  className="text-sm leading-5 font-semibold text-theme-accent-deep"
                  style={{ includeFontPadding: false }}
                >
                  {diaries.data?.length ?? '0'}
                </Text>
                개
              </Text>
            </View>
            <View className="h-4 w-px bg-theme-accent/20" />
            <View className="min-w-0 shrink flex-row items-center gap-1.5">
              <View className="h-5 shrink-0 items-center justify-center">
                <AppIcon
                  name="habit"
                  size={iconSizes.md}
                  className="text-theme-accent -mb-0.5"
                  style={{ includeFontPadding: false, lineHeight: iconSizes.sm }}
                />
              </View>
              <Text
                numberOfLines={1}
                className="shrink text-sm leading-5 text-theme-text-secondary"
                style={{ includeFontPadding: false }}
              >
                실천{' '}
                <Text
                  className="text-sm leading-5 font-semibold text-theme-accent-deep"
                  style={{ includeFontPadding: false }}
                >
                  {completions.data?.length ?? '0'}
                </Text>
                번
              </Text>
            </View>
          </View>
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
