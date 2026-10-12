import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useIsFocused } from 'expo-router/react-navigation';
import { Image, View } from 'react-native';
import Animated from 'react-native-reanimated';
import wordmarkSize from '../../assets/ui/wordmark.json';
import { ColorView } from '../../src/components/ColorTransition';
import { EmotionImage } from '../../src/components/EmotionImage';
import { Text } from '../../src/components/Text';
import { useToday } from '../../src/queries';
import { TodayRecordSection } from '../../src/screens/home/TodayRecordSection';
import { useAppTheme } from '../../src/theme/AppThemeProvider';
import tokens from '../../src/theme/tokens.json';

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
const cat = require('../../assets/cats/hiding-cat-home.png');
const catSize = Image.resolveAssetSource(cat);

export default function Home() {
  const today = useToday();
  const { rem: appRem, reducedMotion } = useAppTheme();
  const focused = useIsFocused();

  return (
    <ColorView className="flex-1 min-h-0 overflow-hidden bg-theme-accent-light px-[5%] pt-[5%]">
      <Image
        source={require('../../assets/ui/wordmark.png')}
        accessibilityLabel="to:ok"
        className="mb-8 shrink-0"
        resizeMode="contain"
        style={{ width: wordmarkSize.width, height: wordmarkSize.height }}
      />
      <View className="mb-10 shrink-0 gap-5">
        <View className="gap-1">
          <Text className="text-theme-accent-deep font-semibold text-base">
            {format(parseISO(today), 'M월 d일 EEEE', {
              locale: ko,
            })}
          </Text>
          <View className="flex-row items-center gap-2">
            <Text className="font-bold text-3xl">오늘을 툭,</Text>
            <Animated.View
              key={focused && !reducedMotion ? 'moving' : 'idle'}
              className="h-9 w-9 shrink-0 items-center justify-center"
              style={{
                transform: [{ rotate: '5deg' }],
                animationName: focused && !reducedMotion ? greeting : undefined,
                animationDuration: `${tokens.motion.greeting}ms`,
                animationTimingFunction: 'ease-in-out',
              }}
            >
              <EmotionImage emotion={1} size={appRem * 2.25} />
            </Animated.View>
          </View>
          <Text className="font-bold text-3xl">나답게 쌓는 하루</Text>
        </View>
        <Text className="text-theme-text-secondary text-lg">감정도 습관도 내 속도로 남겨요.</Text>
      </View>
      <View className="shrink-0">
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
          className="mx-auto w-full max-h-full shrink"
        />
      </View>
    </ColorView>
  );
}
