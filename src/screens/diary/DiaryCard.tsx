import { AppIcon } from '../../components/AppIcon';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Text } from '../../components/Text';
import { EmotionImage } from '../../components/EmotionImage';
import type { DiaryDetail } from '../../db/types';
import { EMOTIONS, resolveIconColor } from '../../domain/constants';
import { DiaryMenu } from './DiaryMenu';
import { DiaryGallery } from './DiaryGallery';

export function DiaryCard({
  diary,
  first,
  today,
}: {
  diary: DiaryDetail;
  first: boolean;
  today: string;
}) {
  const { colors, rem: appRem, iconSizes } = useAppTheme();
  const router = useRouter();
  const open = () => router.push(`/diary/${diary.id}`);
  return (
    <View className={`gap-4 pb-6 ${first ? 'pt-0' : 'pt-6'}`}>
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${diary.date} 일기 상세보기`}
          onPress={open}
          className="min-w-0 shrink flex-row items-center gap-3"
        >
          <EmotionImage emotion={diary.emotion} size={appRem * 3} />
          <View className="min-w-0 shrink gap-0.5">
            <Text className="text-base font-semibold">
              {format(parseISO(diary.date), 'yy년 M월 d일')}
            </Text>
            <View className="flex-row items-center gap-1">
              <Text className="text-sm text-theme-text-tertiary">
                {format(parseISO(diary.date), 'EEEE', { locale: ko })}
              </Text>
              <Text className="text-sm text-theme-text-tertiary">·</Text>
              <Text className="text-sm text-theme-text-tertiary">
                {EMOTIONS[diary.emotion]?.name ?? EMOTIONS[9].name}
              </Text>
            </View>
          </View>
        </Pressable>
        <View className="ml-auto shrink-0">
          <DiaryMenu diary={diary} today={today} />
        </View>
      </View>
      <View className="p-2 gap-3">
        {diary.images.length > 0 && (
          <DiaryGallery
            key={diary.images.map((image) => image.file_name).join(',')}
            images={diary.images}
            onPress={open}
          />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${diary.date} 일기 상세보기`}
          onPress={open}
        >
          <Text numberOfLines={3} className="text-base leading-[1.8] text-theme-text-secondary">
            {diary.text}
          </Text>
        </Pressable>
        {diary.completedHabits.length > 0 && (
          <View className="flex-row flex-wrap gap-x-4 gap-y-2">
            {diary.completedHabits.map((habit) => (
              <Pressable
                key={habit.id}
                accessibilityRole="button"
                accessibilityLabel={`${habit.name} 습관 상세보기`}
                onPress={() => router.push(`/habit/${habit.id}`)}
                className="max-w-full flex-row items-center gap-1"
              >
                <AppIcon
                  name="check"
                  size={iconSizes.sm}
                  color={resolveIconColor(habit.icon_color, colors.accent)}
                />
                <Text numberOfLines={1} className="shrink text-sm text-theme-text-secondary">
                  {habit.name}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
