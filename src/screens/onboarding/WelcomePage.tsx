import { useI18n } from '../../i18n/react';
import { useState } from 'react';
import { Image, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { PickerOption } from '../../components/PickerOption';
import { Text } from '../../components/Text';
import { useAppTheme } from '../../theme/AppThemeProvider';

const moods = {
  positive: {
    label: 'onboarding.positive',
    image: require('../../../assets/cats/cat-blue-p.png'),
    description: 'onboarding.positiveStory',
    color: 'bg-theme-emotion-positive',
    bubbleColor: 'emotionPositive',
  },
  neutral: {
    label: 'onboarding.neutral',
    image: require('../../../assets/cats/cat-blue.png'),
    description: 'onboarding.neutralStory',
    color: 'bg-theme-emotion-neutral',
    bubbleColor: 'emotionNeutral',
  },
  negative: {
    label: 'onboarding.negative',
    image: require('../../../assets/cats/cat-blue-n.png'),
    description: 'onboarding.negativeStory',
    color: 'bg-theme-emotion-negative',
    bubbleColor: 'emotionNegative',
  },
} as const;

export function WelcomePage({ imageWidth }: { imageWidth: number }) {
  const { t } = useI18n();
  const { colors, reducedMotion } = useAppTheme();
  const [mood, setMood] = useState<keyof typeof moods>('neutral');
  return (
    <View className="w-full grow justify-between gap-6">
      <View className="gap-2">
        <Text
          accessibilityRole="header"
          className="text-center text-[21px] leading-[28px] font-semibold tracking-tight"
        >
          {t('onboarding.welcomeTitle')}
        </Text>
        <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
          {t('onboarding.welcomeDescription')}
        </Text>
      </View>
      <View className="gap-4">
        <View className="h-20">
          <View pointerEvents="none" className="absolute inset-0">
            <Svg
              width="100%"
              height="100%"
              viewBox="0 0 320 88"
              preserveAspectRatio="none"
              accessible={false}
            >
              <Path
                d="M42 4 C21 3 7 14 7 35 C6 56 20 69 43 70 C77 72 67 71 98 71 C102 78 111 83 124 82 C116 77 113 73 114 71 C157 73 242 72 277 69 C301 67 315 55 314 35 C314 14 299 5 276 4 C203 1 115 2 42 4 Z"
                fill={colors[moods[mood].bubbleColor]}
                fillOpacity={0.2}
              />
            </Svg>
          </View>
          <View className="h-16 items-center justify-center px-6">
            <Text
              accessibilityLiveRegion="polite"
              className="text-center text-[14px] leading-[21px]"
            >
              {t(moods[mood].description)}
            </Text>
          </View>
        </View>
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={t('onboarding.moodImage', { value: t(moods[mood].label) })}
          className="-mt-8 h-48 items-center justify-center"
        >
          <View className="h-full" style={{ width: imageWidth }}>
            {Object.entries(moods).map(([value, option]) => (
              <Animated.View
                key={value}
                pointerEvents="none"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                className="absolute inset-0"
                style={{
                  opacity: mood === value ? 1 : 0,
                  transitionProperty: 'opacity',
                  transitionDuration: `${reducedMotion ? 0 : 200}ms`,
                  transitionTimingFunction: 'ease-in-out',
                }}
              >
                <Image
                  source={option.image}
                  accessible={false}
                  resizeMode="contain"
                  className="h-full w-full"
                />
              </Animated.View>
            ))}
          </View>
        </View>
        <View className="gap-2">
          <View className="flex-row gap-2">
            {Object.entries(moods).map(([value, option]) => (
              <View key={value} className="flex-1">
                <PickerOption
                  compact
                  dense
                  selected={mood === value}
                  accessibilityLabel={t('onboarding.moodPreview', { value: t(option.label) })}
                  onPress={() => setMood(value as keyof typeof moods)}
                  className="flex-row gap-2"
                >
                  <View className={`h-2.5 w-2.5 rounded-full ${option.color}`} />
                  <Text
                    className={`text-[14px] leading-[21px] ${mood === value ? 'font-semibold text-theme-accent' : 'text-theme-text-primary'}`}
                  >
                    {t(option.label)}
                  </Text>
                </PickerOption>
              </View>
            ))}
          </View>
        </View>
      </View>
      <View className="gap-2">
        <Text className="text-center text-[21px] leading-[28px] font-semibold">
          {t('onboarding.everyColor')}
        </Text>
        <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
          {t('onboarding.welcomeSummary')}
        </Text>
      </View>
    </View>
  );
}
