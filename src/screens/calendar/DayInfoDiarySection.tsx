import { Pressable, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Text } from '../../components/Text';
import type { DiaryDetail } from '../../db/types';
import { useModalNavigation } from '../../navigation/ModalNavigationProvider';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { BODY_TEXT_CLASS_NAME } from '../../theme/classes';
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
  const { openModal } = useModalNavigation();
  const open = () => {
    if (!diary) return;
    openModal(`/diary/${diary.id}`);
  };
  return (
    <View className="shrink-0 px-1 pb-1">
      <View className="h-12 flex-row items-center justify-between gap-2 py-2">
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          <Text accessibilityRole="header" className="text-base font-semibold">
            감정 일기
          </Text>
        </View>
        {diary && <DiaryMenu diary={diary} today={today} />}
      </View>
      <View className="py-3 px-1">
        {diary ? (
          <View className="gap-3">
            <View className="flex-row items-start gap-3">
              {diary.images.length > 0 && (
                <View className="w-28 shrink-0">
                  <DiaryGallery key={diary.id} images={diary.images} square onPress={open} />
                </View>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="일기 전체 보기"
                onPress={open}
                className="flex-1 min-w-0"
              >
                <Text numberOfLines={4} className={BODY_TEXT_CLASS_NAME}>
                  {diary.text}
                </Text>
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="일기 전체 보기"
              onPress={open}
              className="min-h-9 flex-row items-center self-end"
            >
              <Text className="text-sm text-theme-accent">일기 전체 보기</Text>
              <AppIcon name="chevron-right" size={appRem * 1.125} color={colors.accent} />
            </Pressable>
          </View>
        ) : (
          <View className="min-h-32 items-center justify-center px-2">
            <Text className="mt-1 text-sm text-theme-text-tertiary">
              아직 작성한 일기가 없어요.
            </Text>
            <Text className="mt-1 text-sm text-theme-text-tertiary">
              하루의 이야기를 가볍게 남겨보세요.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                openModal({ pathname: '/diary/new', params: { date } });
              }}
              className="mt-6 flex-row min-h-9 items-center gap-1.5 ios:curve-continuous rounded-full border border-theme-accent-deep bg-theme-accent px-4"
            >
              <AppIcon name="add" size={appRem * 1.125} color={colors.textOnAccent} />
              <Text
                className="text-xs leading-none text-theme-text-on-accent"
                style={{ includeFontPadding: false, textAlignVertical: 'center' }}
              >
                일기 쓰기
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}
