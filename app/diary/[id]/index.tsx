import { AppIcon } from '../../../src/components/AppIcon';
import { useAppTheme } from '../../../src/theme/AppThemeProvider';
import { useScrollFade } from '../../../src/hooks/useScrollFade';
import { ScrollEdgeFade } from '../../../src/components/ScrollEdgeFade';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { diaryQueries, useToday } from '../../../src/queries';
import { Text } from '../../../src/components/Text';
import { EmotionImage } from '../../../src/components/EmotionImage';
import { QueryState } from '../../../src/components/QueryState';
import { EMOTIONS, resolveIconColor } from '../../../src/domain/constants';
import { RecordHeader } from '../../../src/components/RecordHeader';
import { DiaryMenu } from '../../../src/screens/diary/DiaryMenu';
import { DiaryGallery } from '../../../src/screens/diary/DiaryGallery';

export default function DiaryDetail() {
  const { colors, rem: appRem, iconSizes } = useAppTheme();
  const fade = useScrollFade();
  const today = useToday();
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const query = useQuery(diaryQueries.byId(db, Number(id)));
  const diary = query.data;
  const title = diary
    ? format(parseISO(diary.date), 'yyyy년 M월 d일 EEEE', { locale: ko })
    : '일기';
  return (
    <View className="flex-1 bg-theme-surface">
      <RecordHeader
        backRoute="/diary"
        title={title}
        rightAction={
          diary ? (
            <DiaryMenu diary={diary} today={today} onDeleted={() => router.replace('/diary')} />
          ) : undefined
        }
      />
      <View className="flex-1">
        <ScrollView
          onScroll={fade.onScroll}
          onLayout={fade.onLayout}
          onContentSizeChange={fade.onContentSizeChange}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="pt-6 pb-screen-content-bottom gap-12"
          contentContainerStyle={{ paddingHorizontal: '5%' }}
        >
          <QueryState query={query} />
          {diary ? (
            <>
              <View className="gap-6">
                <View className="flex-row items-center gap-5">
                  <EmotionImage emotion={diary.emotion} size={appRem * 5} />
                  <View>
                    <Text className="text-sm text-theme-accent-text">오늘의 마음</Text>
                    <Text className="mt-1 text-2xl font-medium">
                      {EMOTIONS[diary.emotion]?.name ?? EMOTIONS[9].name}
                    </Text>
                  </View>
                </View>
                {diary.completedHabits.length > 0 && (
                  <View className="flex-row flex-wrap gap-x-4 gap-y-2 px-2">
                    {diary.completedHabits.map((habit) => (
                      <View
                        key={habit.id}
                        accessibilityLabel={habit.name}
                        className="max-w-full flex-row items-center gap-1"
                      >
                        <AppIcon
                          name="check"
                          size={iconSizes.sm}
                          color={resolveIconColor(habit.icon_color, colors.accent)}
                        />
                        <Text
                          numberOfLines={1}
                          className="shrink text-sm text-theme-text-secondary"
                        >
                          {habit.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                <Text selectable className="p-2 text-base leading-[1.9]">
                  {diary.text}
                </Text>
              </View>
              {diary.images.length > 0 && (
                <View>
                  <View className="mb-4 flex-row items-center gap-2">
                    <AppIcon name="image" size={appRem * 1.125} color={colors.accentText} />
                    <Text className="text-sm text-theme-text-secondary">함께 남긴 장면</Text>
                  </View>
                  <DiaryGallery
                    key={diary.images.map((image) => image.file_name).join(',')}
                    images={diary.images}
                    detail
                  />
                </View>
              )}
            </>
          ) : !query.isPending && !query.error ? (
            <Text>일기를 찾을 수 없습니다.</Text>
          ) : null}
        </ScrollView>
        <ScrollEdgeFade edge="top" visible={fade.topVisible} tone="surface" />
        <ScrollEdgeFade
          edge="bottom"
          visible={fade.bottomVisible}
          tone="surface"
          includeBottomInset={false}
        />
      </View>
    </View>
  );
}
