import { formatSoberDuration, formatSoberGoal } from '../../i18n/sober';
import { useI18n } from '../../i18n/react';
import { Pressable, View } from 'react-native';
import { ProgressBar } from '../../components/ProgressBar';
import { SoberIcon } from '../../components/SoberIcon';
import { StarIcon } from '../../components/StarIcon';
import { Text } from '../../components/Text';
import type { Sober, SoberRestart } from '../../db/types';
import { resolveIconColor } from '../../domain/constants';
import { getAutoSoberGoal, getCurrentSoberStart, getSoberProgress } from '../../domain/sober';
import { useModalNavigation } from '../../navigation/ModalNavigationProvider';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { adjustColorBrightness } from '../../theme/colors';
import { SoberMenu } from './SoberMenu';

export function SoberBox({
  sober,
  restarts,
  now,
  isFirst,
  isLast = false,
}: {
  sober: Sober;
  restarts: SoberRestart[];
  now: number;
  isFirst: boolean;
  isLast?: boolean;
}) {
  const { t, language } = useI18n();

  const { openModal } = useModalNavigation();
  const { colors, rem: appRem } = useAppTheme();
  const start = getCurrentSoberStart(sober, restarts);
  const duration = Math.max(0, now - Date.parse(start));
  const goalDays = sober.goal_mode === 'AUTO' ? getAutoSoberGoal(duration) : sober.goal_days!;
  const progress = getSoberProgress(duration, goalDays);
  const iconColor = resolveIconColor(sober.icon_color, colors.accent);
  return (
    <View className={`gap-3 px-2 ${isLast ? 'pb-0' : 'pb-7'} ${isFirst ? 'pt-0' : 'pt-5'}`}>
      <View className="flex-row items-center gap-3">
        <SoberIcon name={sober.icon_key} colorKey={sober.icon_color} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('sober.itemInfo', { value: sober.name })}
          onPress={() => openModal(`/sober/${sober.id}`)}
          className="min-h-11 min-w-0 flex-1 flex-row items-center gap-2"
        >
          <Text numberOfLines={1} className="min-w-0 shrink text-base font-semibold">
            {sober.name}
          </Text>
          {sober.is_priority ? (
            <View className="shrink-0">
              <StarIcon size={appRem * 1.125} color={colors.textPrimary} />
            </View>
          ) : null}
        </Pressable>
        <SoberMenu sober={sober} showDetail />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('sober.itemSummary', {
          title: sober.name,
          value: formatSoberDuration(duration, language),
          setting: formatSoberGoal(goalDays, language),
        })}
        onPress={() => openModal(`/sober/${sober.id}`)}
        className="flex-row items-end gap-4"
      >
        <View className="flex-1 min-w-0 gap-3">
          <Text className="text-lg font-semibold text-theme-text-primary">
            {formatSoberDuration(duration, language)}
          </Text>
          <ProgressBar value={progress} color={adjustColorBrightness(iconColor, 0.15)} />
        </View>
        <View className="w-28 shrink-0 items-end gap-1">
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            className="text-2xl font-bold text-theme-text-primary"
          >
            {`${Number(progress.toFixed(1))}%`}
          </Text>
          <Text className="text-sm text-theme-text-secondary">
            {t('sober.goalLabel', { value: formatSoberGoal(goalDays, language) })}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
