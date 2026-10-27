import { MUTED_CARD_BORDER_CLASS_NAME } from '../../theme/classes';
import { Image, View } from 'react-native';
import { Text } from '../../components/Text';
import { InfoNotice } from '../../components/InfoNotice';
const widgetPreview = require('../../../assets/widgets/sober-preview.png');

export function WidgetPage({ imageWidth }: { imageWidth: number }) {
  return (
    <View className="w-full grow justify-between gap-6">
      <View className="gap-2">
        <Text
          accessibilityRole="header"
          className="text-center text-[21px] leading-[28px] font-semibold tracking-tight"
        >
          위젯으로 바로 확인해요
        </Text>
        <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
          홈 화면에서도 거리두기 시간을 확인해요.
        </Text>
      </View>
      <View
        className={`${MUTED_CARD_BORDER_CLASS_NAME} gap-5 ios:curve-continuous rounded-2xl bg-theme-surface-muted p-4`}
      >
        <Image
          source={widgetPreview}
          accessibilityLabel="거리두기 타이머 홈 화면 위젯 예시"
          resizeMode="contain"
          className="h-36 self-center"
          style={{ width: imageWidth }}
        />
        <View className="gap-2">
          <Text className="text-center text-[15.75px] leading-[24.5px] font-semibold">
            1. 홈 화면에 위젯을 추가해요
          </Text>
          <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
            휴대폰 홈 화면을 길게 누르고{'\n'}위젯 목록에서 거리두기 타이머를 찾아주세요.
          </Text>
        </View>
        <View className="h-px bg-theme-border/50" />
        <View className="gap-2">
          <Text className="text-center text-[15.75px] leading-[24.5px] font-semibold">
            2. 보여줄 기록을 골라요
          </Text>
          <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
            거리두기 기록과 위젯 모양을 선택하면{'\n'}홈 화면에서 바로 확인할 수 있어요.
          </Text>
        </View>
      </View>
      <InfoNotice textClassName="text-[10.5px] leading-[17.5px]" adjustsFontSizeToFit={false}>
        거리두기 기록을 먼저 만들면 위젯에 연결할 수 있어요.
      </InfoNotice>
    </View>
  );
}
