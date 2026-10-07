import { useRouter } from 'expo-router';
import { twMerge } from 'tailwind-merge';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Text } from '../../components/Text';
import type { DiaryDetail } from '../../db/types';
import { EMOTIONS } from '../../domain/constants';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { BODY_DESCRIPTION_CLASS_NAME } from '../../theme/classes';
import { DiaryGallery } from '../diary/DiaryGallery';
import { DiaryMenu } from '../diary/DiaryMenu';

export function DayInfoDiarySection({
  date,
  today,
  diary,
}: {
  date: string;
  today: string;
  diary: DiaryDetail | null;
}) {
  const { colors, rem: appRem } = useAppTheme();
  const router = useRouter();
  const { fontScale } = useWindowDimensions();
  // Three relaxed body lines, the link, spacing, and native font padding.
  const contentHeight = appRem * Math.max(26 / 3, (3 * 1.625 + 1.25) * fontScale + 1.25);
  const galleryHeight = appRem * 8.25 + 6;
  const emotion = diary ? EMOTIONS[diary.emotion] : undefined;
  const open = () => {
    if (!diary) return;
    router.push(`/diary/${diary.id}`);
  };
  return (
    <View
      className="shrink-0 p-1"
      style={{ height: Math.max(contentHeight, galleryHeight) + appRem * 5 }}
    >
      <View className="h-12 flex-row items-center justify-between gap-2 py-2">
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          <Text accessibilityRole="header" className="text-base font-semibold">
            감정 일기
            {emotion && (
              <>
                {' · '}
                <Text className="text-base font-semibold" style={{ color: emotion.color }}>
                  {emotion.name}
                </Text>
              </>
            )}
          </Text>
        </View>
        {diary && <DiaryMenu diary={diary} today={today} />}
      </View>
      <View className="flex-1 min-h-0 py-3 px-2">
        {diary ? (
          <View className="h-full flex-row items-center gap-3">
            {diary.images.length > 0 && (
              <View className="w-28 shrink-0">
                <DiaryGallery key={diary.id} images={diary.images} square onPress={open} />
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="일기 전체 보기"
              onPress={open}
              className={twMerge(
                'h-full flex-1 min-w-0 gap-3',
                diary.images.length > 0 ? 'justify-evenly' : 'justify-between',
              )}
            >
              <Text numberOfLines={3} className={BODY_DESCRIPTION_CLASS_NAME}>
                {diary.text}
              </Text>
              <View className="flex-row items-center self-end">
                <Text className="text-sm text-theme-accent">일기 전체 보기</Text>
                <AppIcon name="chevron-right" size={appRem * 1.125} color={colors.accent} />
              </View>
            </Pressable>
          </View>
        ) : (
          <View className="h-full items-center justify-center px-2">
            {date > today ? (
              <>
                <Text className="text-center text-sm leading-relaxed text-theme-text-tertiary">
                  아직 기록할 수 없는 날짜예요.
                </Text>
                <Text className="text-center text-sm leading-relaxed text-theme-text-tertiary">
                  미래의 이야기는 조금 기다렸다가 적어주세요.
                </Text>
              </>
            ) : (
              <>
                <Text className="mt-1 text-sm text-theme-text-tertiary">
                  아직 작성한 일기가 없어요.
                </Text>
                <Text className="mt-1 text-sm text-theme-text-tertiary">
                  하루의 이야기를 간단히 툭 남겨보세요.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    router.push({ pathname: '/diary/new', params: { date } });
                  }}
                  className="mt-6 flex-row min-h-9 items-center gap-1.5 rounded-full bg-theme-accent px-4"
                >
                  <AppIcon name="add" size={appRem * 1.125} color={colors.textOnAccent} />
                  <Text
                    className="text-xs leading-none text-theme-text-on-accent"
                    style={{ includeFontPadding: false, textAlignVertical: 'center' }}
                  >
                    일기 쓰기
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
