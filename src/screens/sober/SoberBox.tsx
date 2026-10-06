import { StarIcon } from '../../components/StarIcon';
import { format, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { SoberIcon } from '../../components/SoberIcon';
import { Text } from '../../components/Text';
import type { Sober, SoberRestart } from '../../db/types';
import {
  formatSoberDuration,
  formatSoberGoal,
  getCurrentSoberStart,
  getAutoSoberGoal,
  getSoberProgress,
} from '../../domain/sober';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { SoberMenu } from './SoberMenu';

export function SoberBox({
  sober,
  restarts,
  now,
  isFirst,
}: {
  sober: Sober;
  restarts: SoberRestart[];
  now: number;
  isFirst: boolean;
}) {
  const router = useRouter();
  const { colors, rem: appRem } = useAppTheme();
  const start = getCurrentSoberStart(sober, restarts);
  const duration = Math.max(0, now - Date.parse(start));
  const goalDays = sober.goal_mode === 'AUTO' ? getAutoSoberGoal(duration) : sober.goal_days!;
  const progress = getSoberProgress(duration, goalDays);
  return (
    <View className={`gap-3 pb-5 px-2 ${isFirst ? 'pt-0' : 'pt-5'}`}>
      <View className="flex-row items-center gap-3">
        <SoberIcon name={sober.icon_key} colorKey={sober.icon_color} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${sober.name} 절제 항목 정보`}
          onPress={() => router.push(`/sober/${sober.id}`)}
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
        <SoberMenu sober={sober} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${sober.name}, ${formatSoberDuration(duration)}, 목표 ${formatSoberGoal(goalDays)}`}
        onPress={() => router.push(`/sober/${sober.id}`)}
        className="gap-3"
      >
        <View className="flex-row flex-wrap items-baseline justify-between gap-2">
          <Text className="text-lg font-semibold text-theme-text-primary">
            {formatSoberDuration(duration)}
          </Text>
          <Text className="text-sm text-theme-text-secondary">{progress.toFixed(1)}%</Text>
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: progress }}
          className="h-2 overflow-hidden rounded-full bg-theme-border-muted"
        >
          <View className="h-full rounded-full bg-theme-accent" style={{ width: `${progress}%` }} />
        </View>
        <Text className="text-sm text-theme-text-secondary">
          목표 {formatSoberGoal(goalDays)} · {format(parseISO(start), 'yyyy. M. d')}
          부터
        </Text>
      </Pressable>
    </View>
  );
}
