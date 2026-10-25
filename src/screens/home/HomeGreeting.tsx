import { useRouter } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { EmotionImage } from '../../components/EmotionImage';
import { Text } from '../../components/Text';
import { useAppTheme } from '../../theme/AppThemeProvider';
import tokens from '../../theme/tokens.json';

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

export function HomeGreeting() {
  const navigationItems = [
    { label: '감정기록', href: '/calendar', a11y: '감정기록 달력' },
    { label: '습관관리', href: '/habit', a11y: '습관관리 페이지' },
    { label: '거리두기', href: '/sober', a11y: '거리두기 페이지' },
  ] as const;
  const router = useRouter();
  const { rem: appRem, reducedMotion } = useAppTheme();
  const focused = useIsFocused();

  return (
    <View className="mt-5 shrink-0 gap-2">
      <Text className="font-bold text-4xl">오늘도 툭!</Text>
      <View className="flex-row items-center gap-2">
        <Text className="font-bold text-3xl">나답게 쌓는 하루</Text>
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
          <EmotionImage emotion={1} size={appRem * 2.25} iconStyle="basic" />
        </Animated.View>
      </View>
      <View className="flex-row flex-wrap items-center gap-1 px-0.5">
        {navigationItems.map(({ label, href, a11y }) => (
          <Pressable
            key={href}
            accessibilityRole="button"
            accessibilityLabel={`${a11y}로 이동`}
            onPress={() => router.push(href)}
            hitSlop={{ top: appRem * 0.5, bottom: appRem * 0.5 }}
            className="active:opacity-70"
          >
            <Text className="text-theme-accent-deep text-base font-semibold">#{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
