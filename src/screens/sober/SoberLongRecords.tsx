import type { itemAccentColors } from '../../theme/colors';
import { formatDisplayDate } from '../../i18n/format';
import { formatSoberDuration } from '../../i18n/sober';
import { useI18n } from '../../i18n/react';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { twMerge } from 'tailwind-merge';
import { Text } from '../../components/Text';
import { type SoberStreak } from '../../domain/sober';
import { MUTED_DESCRIPTION_CLASS_NAME } from '../../theme/classes';

export function SoberLongRecords({
  records,
  accent,
}: {
  records: SoberStreak[];
  accent?: ReturnType<typeof itemAccentColors>;
}) {
  const { t, language, formatLocale } = useI18n();

  const [expanded, setExpanded] = useState(false);
  const renderRecord = (item: SoberStreak, index: number) => (
    <View
      key={`${item.start}:${item.current ? 'current' : item.end}`}
      className="flex-row gap-4 py-3 items-center"
    >
      <View className="w-7 items-start justify-center">
        <Text
          style={accent ? { color: accent.text } : undefined}
          className={`text-base font-semibold text-theme-accent`}
        >
          {index + 1}
        </Text>
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-base font-semibold">
          {formatSoberDuration(item.duration, language)}
        </Text>
        <Text
          style={item.current && accent ? { color: accent.text } : undefined}
          className={twMerge(MUTED_DESCRIPTION_CLASS_NAME, item.current && 'text-theme-accent')}
        >
          {formatDisplayDate(item.start, formatLocale, 'shortDateTime')} –{' '}
          {item.current
            ? t('sober.current')
            : formatDisplayDate(item.end, formatLocale, 'shortDateTime')}
        </Text>
      </View>
    </View>
  );
  return (
    <View className="gap-4 border-t border-theme-border pt-8">
      <View className="flex-row items-center gap-2">
        <Text
          accessibilityRole="header"
          className="text-lg leading-6 font-semibold text-theme-text-primary"
        >
          {t('sober.topRecords')}
        </Text>
      </View>
      <View className="px-1 gap-4">
        <View>
          {records.slice(0, expanded ? 20 : 5).map(renderRecord)}
          {records.length > 5 && (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => setExpanded(!expanded)}
              className="min-h-11 items-center justify-center"
            >
              <Text
                style={accent ? { color: accent.text } : undefined}
                className="text-sm text-theme-accent"
              >
                {expanded ? t('sober.collapse') : t('sober.moreRecords')}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
