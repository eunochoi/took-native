import { Image, View } from 'react-native';
import { Text } from '../../components/Text';
const widgetPreview = require('../../../assets/widgets/sober-preview.png');

export function WidgetPage({ imageWidth }: { imageWidth: number }) {
  return (
    <View className="w-full gap-5">
      <View className="gap-2">
        <Text
          accessibilityRole="header"
          className="text-center text-2xl font-semibold tracking-tight"
        >
          위젯으로 바로 확인해요
        </Text>
        <Text className="text-center text-sm text-theme-text-secondary">
          앱을 열지 않아도, 기록을 가까이.
        </Text>
      </View>
      <View className="items-center gap-5 rounded-2xl bg-theme-surface-muted px-4 py-6">
        <Image
          source={widgetPreview}
          accessibilityLabel="TOOK 거리두기 홈 화면 위젯 예시"
          resizeMode="contain"
          className="h-36"
          style={{ width: imageWidth }}
        />
        <View className="gap-2">
          <Text className="text-center text-base font-semibold">나만의 거리두기 위젯</Text>
          <Text className="text-center text-sm text-theme-text-secondary">
            홈 화면에 TOOK 위젯을 추가한 뒤{'\n'}보여줄 기록과 모양을 골라주세요.
          </Text>
        </View>
      </View>
    </View>
  );
}
