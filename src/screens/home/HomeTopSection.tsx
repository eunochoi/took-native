import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useIsFocused } from 'expo-router/react-navigation';
import { Image, View } from 'react-native';
import Animated from 'react-native-reanimated';
import wordmarkSize from '../../../assets/ui/wordmark.json';
import { ColorView } from '../../components/ColorTransition';
import { EmotionImage } from '../../components/EmotionImage';
import { Text } from '../../components/Text';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { TOP_SECTION_BORDER_CLASS_NAME } from '../../theme/classes';
import tokens from '../../theme/tokens.json';
import { TodayRecordSection } from './TodayRecordSection';
const greeting = {
  '0%': { transform: [{ rotate: '5deg' }] },
  '10%': { transform: [{ rotate: '15deg' }] },
  '20%': { transform: [{ rotate: '-3deg' }] },
  '32%': { transform: [{ rotate: '13deg' }] },
  '42%': { transform: [{ rotate: '-1deg' }] },
  '52%': { transform: [{ rotate: '10deg' }] },
  '64%': { transform: [{ rotate: '2deg' }] },
  '78%': { transform: [{ rotate: '7deg' }] },
  '94%': { transform: [{ rotate: '5deg' }] },
  '100%': { transform: [{ rotate: '5deg' }] },
} as const;
const cat = require('../../../assets/cats/hiding-cat-home.png');
const catSize = Image.resolveAssetSource(cat);
export function HomeTopSection({ today }: { today: string }) {
  const { rem: appRem, reducedMotion } = useAppTheme();
  const focused = useIsFocused();
  return (
    <ColorView className={`flex-1 min-h-0 bg-theme-accent-light ${TOP_SECTION_BORDER_CLASS_NAME}`}>
      <View className="gap-6 shrink-0 px-[5%] pt-[5%]">
        <Image
          source={require('../../../assets/ui/wordmark.png')}
          accessibilityLabel="to:ok"
          resizeMode="contain"
          style={{ width: wordmarkSize.width, height: wordmarkSize.height }}
        />
        <View className="pb-2 gap-6 pl-1">
          <View className="gap-1">
            <Text className="text-theme-accent-deep font-semibold text-xl">
              {format(parseISO(today), 'M월 d일 EEEE', {
                locale: ko,
              })}
            </Text>
            <View className="flex-row flex-wrap items-end gap-2 min-h-10">
              <Text className="font-bold text-4xl">오늘을 툭!</Text>
              <Animated.View
                key={focused && !reducedMotion ? 'moving' : 'idle'}
                className="-mb-1"
                style={{
                  transform: [{ rotate: '5deg' }],
                  animationName: focused && !reducedMotion ? greeting : undefined,
                  animationDuration: `${tokens.motion.greeting}ms`,
                  animationTimingFunction: 'ease-in-out',
                }}
              >
                <EmotionImage emotion={1} size={appRem * 3} />
              </Animated.View>
            </View>
          </View>
          <View className="gap-1">
            <Text className="text-theme-text-secondary text-lg">마음도 습관도 오늘의 기록으로</Text>
            <Text className="text-theme-text-secondary text-lg">툭, 툭 하나씩 남겨봐요.</Text>
          </View>
        </View>
        <TodayRecordSection today={today} />
      </View>
      <View pointerEvents="none" className="flex-1 min-h-0 justify-end overflow-hidden">
        <Image
          source={cat}
          accessibilityLabel="hiding-cat"
          resizeMode="contain"
          style={{
            height: 'auto',
            aspectRatio: catSize.width / catSize.height,
          }}
          className="ml-auto pt-4 w-1/2 max-h-full shrink"
        />
      </View>
    </ColorView>
  );
}
