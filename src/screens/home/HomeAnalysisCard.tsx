import { Image, Pressable, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Text } from '../../components/Text';
import { useModalNavigation } from '../../navigation/ModalNavigationProvider';
import { useAppTheme } from '../../theme/AppThemeProvider';

const analysisCat = require('../../../assets/cats/hiding-cat-analysis.png');
const analysisCatSize = Image.resolveAssetSource(analysisCat);

export function HomeAnalysisCard({ today }: { today: string }) {
  const { rem: appRem } = useAppTheme();
  const { openModal } = useModalNavigation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="기록 분석 보기, 이번 달 감정과 습관, 거리두기 기록 분석"
      onPress={() =>
        openModal({ pathname: '/home/[year]/stats', params: { year: today.slice(0, 4) } })
      }
      className="overflow-hidden rounded-2xl border border-theme-accent/20 bg-theme-accent/10 active:opacity-70 ios:curve-continuous"
    >
      <View pointerEvents="none" className="absolute bottom-0 right-0 h-24 w-36 overflow-hidden">
        <Image
          source={analysisCat}
          accessible={false}
          resizeMode="contain"
          className="absolute bottom-0 right-0 w-52"
          style={{
            height: 'auto',
            aspectRatio: analysisCatSize.width / analysisCatSize.height,
          }}
        />
      </View>
      <View className="flex-row items-start gap-3 p-4">
        <AppIcon
          name="statistics"
          size={appRem * 1.5}
          className="mt-1 shrink-0 text-theme-accent"
        />
        <View className="flex-1 min-w-0 gap-1">
          <View className="flex-row items-center gap-1">
            <Text className="flex-1 text-base leading-6 font-semibold">
              이번 달, 어떤 하루였을까요?
            </Text>
            <AppIcon
              name="chevron-right"
              size={appRem}
              className="shrink-0 text-theme-accent-deep"
            />
          </View>
          <Text className="text-sm leading-5 text-theme-text-secondary">
            {'감정과 습관, 거리두기 기록을\n한눈에 분석해보세요.'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
