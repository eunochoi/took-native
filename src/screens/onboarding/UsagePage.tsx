import { Image, View } from 'react-native';
import { Text } from '../../components/Text';
const navigationPreview = require('../../../assets/onboarding/navigation.png');
const diaryPreview = require('../../../assets/onboarding/diary-calendar-header.png');

export function UsagePage({ imageWidth }: { imageWidth: number }) {
  return (
    <View className="w-full gap-8">
      <View className="gap-2">
        <Text
          accessibilityRole="header"
          className="text-center text-2xl font-semibold tracking-tight"
        >
          편리하게 사용해요
        </Text>
        <Text className="text-center text-sm text-theme-text-secondary">
          자주 쓰는 화면을 더 빠르게 오가세요.
        </Text>
      </View>
      <View className="gap-6 rounded-2xl bg-theme-surface-muted p-6">
        <View className="items-center gap-2">
          <Text className="text-center text-sm font-semibold">맨 위로 이동하기</Text>
          <Image
            source={navigationPreview}
            accessibilityLabel="현재 메뉴를 원형 점선으로 표시한 네비게이션 바"
            resizeMode="contain"
            style={{
              width: imageWidth,
              height:
                (imageWidth * Image.resolveAssetSource(navigationPreview).height) /
                Image.resolveAssetSource(navigationPreview).width,
            }}
          />
          <Text className="text-center text-sm text-theme-text-secondary">
            선택된 아래 메뉴를 다시 누르면{'\n'}화면 맨 위로 이동해요.
          </Text>
        </View>
        <View className="h-px bg-theme-border/50" />
        <View className="items-center gap-2">
          <Text className="text-center text-sm font-semibold">이번 달로 돌아오기</Text>
          <Image
            source={diaryPreview}
            accessibilityLabel="날짜를 점선으로 표시한 달력 헤더"
            resizeMode="contain"
            style={{
              width: imageWidth,
              height:
                (imageWidth * Image.resolveAssetSource(diaryPreview).height) /
                Image.resolveAssetSource(diaryPreview).width,
            }}
          />
          <Text className="text-center text-sm text-theme-text-secondary">
            달력 위 날짜를 누르면{'\n'}이번 달로 돌아와요.
          </Text>
        </View>
      </View>
      <Text className="text-center text-xs text-theme-text-secondary">
        이번 달 이동은 일기·습관, 습관 상세,{'\n'}거리두기 달력에서 사용할 수 있어요.
      </Text>
    </View>
  );
}
