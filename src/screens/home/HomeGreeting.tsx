import { useRouter } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { EmotionImage } from '../../components/EmotionImage';
import { Text } from '../../components/Text';
import { useI18n } from '../../i18n/react';
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
  const { t } = useI18n();
  const navigationItems = [
    { label: t('home.emotionTag'), href: '/calendar', a11y: t('home.emotionLink') },
    { label: t('home.habitTag'), href: '/habit', a11y: t('home.habitLink') },
    { label: t('home.soberTag'), href: '/sober', a11y: t('home.soberLink') },
  ] as const;
  const router = useRouter();
  const { rem: appRem, reducedMotion } = useAppTheme();
  const focused = useIsFocused();

  return (
    <View className="shrink-0 gap-2">
      <View className="flex-row items-center gap-2">
        <Text className="tracking-tighter font-bold text-3xl">{t('home.greetingFirst')}</Text>
        <Animated.View
          key={focused && !reducedMotion ? 'moving' : 'idle'}
          className="h-10 w-10 mb-1 shrink-0 items-center justify-center"
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
      <Text className="tracking-tighter font-bold text-3xl">{t('home.greetingSecond')}</Text>
      <View className="flex-row flex-wrap items-center gap-1 px-0.5">
        {navigationItems.map(({ label, href, a11y }) => (
          <Pressable
            key={href}
            accessibilityRole="button"
            accessibilityLabel={a11y}
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
