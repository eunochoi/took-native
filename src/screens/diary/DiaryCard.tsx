import { formatDisplayDate } from '../../i18n/format';
import { useI18n } from '../../i18n/react';
import { useModalNavigation } from '../../navigation/ModalNavigationProvider';
import { HabitIcon } from '../../components/HabitIcon';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { Pressable, View } from 'react-native';
import { Text } from '../../components/Text';
import { EmotionImage } from '../../components/EmotionImage';
import type { DiaryDetail } from '../../db/types';
import { EMOTIONS } from '../../domain/constants';
import { DiaryMenu } from './DiaryMenu';
import { DiaryGallery } from './DiaryGallery';

export function DiaryCard({
  diary,
  first,
  last = false,
  today,
}: {
  diary: DiaryDetail;
  first: boolean;
  last?: boolean;
  today: string;
}) {
  const { t, formatLocale } = useI18n();

  const { rem: appRem, iconSizes } = useAppTheme();
  const { openModal } = useModalNavigation();
  const open = () => openModal(`/diary/${diary.id}`);
  return (
    <View className={`gap-4 ${last ? 'pb-0' : 'pb-6'} ${first ? 'pt-0' : 'pt-6'}`}>
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('diary.entryDetail', { value: diary.date })}
          onPress={open}
          className="min-w-0 shrink flex-row items-center gap-3"
        >
          <EmotionImage emotion={diary.emotion} size={appRem * 3} />
          <View className="min-w-0 shrink gap-0.5">
            <Text className="text-base font-semibold">
              {formatDisplayDate(diary.date, formatLocale, 'short')}
            </Text>
            <View className="flex-row items-center gap-1">
              <Text className="text-sm text-theme-text-tertiary">
                {formatDisplayDate(diary.date, formatLocale, 'weekday')}
              </Text>
              <Text className="text-sm text-theme-text-tertiary">·</Text>
              <Text className="text-sm text-theme-text-tertiary">
                {t(`emotions.${(EMOTIONS[diary.emotion] ?? EMOTIONS[9]).key}`)}
              </Text>
            </View>
          </View>
        </Pressable>
        <View className="ml-auto shrink-0">
          <DiaryMenu diary={diary} today={today} showDetail />
        </View>
      </View>
      <View className="py-2 px-1 gap-3">
        {diary.images.length > 0 && (
          <DiaryGallery
            key={diary.images.map((image) => image.file_name).join(',')}
            images={diary.images}
            onPress={open}
          />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('diary.entryDetail', { value: diary.date })}
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
                accessibilityLabel={t('diary.habitDetail', { value: habit.name })}
                onPress={() => openModal(`/habit/${habit.id}`)}
                className="max-w-full flex-row items-center gap-1"
              >
                <HabitIcon name={habit.icon_key} size={iconSizes.sm} colorKey={habit.icon_color} />
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
