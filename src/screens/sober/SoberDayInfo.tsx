import { useI18n } from '../../i18n/react';
import { format, parseISO } from 'date-fns';
import { Pressable, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Text } from '../../components/Text';
import type { SoberRestart } from '../../db/types';
import type { SoberAchievement } from '../../domain/sober';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { SoberRestartCard } from './SoberRestartCard';

export function SoberDayInfo({
  records,
  achievements = [],
  canAdd,
  pending,
  onAdd,
  onMenu,
}: {
  date: string;
  records: SoberRestart[];
  achievements?: SoberAchievement[];
  canAdd: boolean;
  pending: boolean;
  onAdd: () => void;
  onMenu: (record: SoberRestart) => void;
}) {
  const { t } = useI18n();

  const { colors, iconSizes } = useAppTheme();
  return (
    <View className="gap-3">
      {canAdd && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('sober.restartAddDate')}
          disabled={pending}
          onPress={onAdd}
          className={`min-h-11 self-end flex-row items-center gap-1 ${pending ? 'opacity-40' : 'opacity-100'}`}
        >
          <AppIcon name="add" size={iconSizes.sm} color={colors.accent} />
          <Text className="text-sm text-theme-accent">{t('sober.recordAdd')}</Text>
        </Pressable>
      )}
      {achievements.map((item) => (
        <View
          key={item.achievedAt}
          className="flex-row items-center gap-3 ios:curve-continuous rounded-2xl border border-theme-border p-4"
        >
          <AppIcon name="auto-awesome" size={iconSizes.lg} color={colors.achievement} />
          <View className="gap-1">
            <Text className="text-base font-semibold">
              {t('sober.achievement', { count: item.days })}
            </Text>
            <Text className="text-sm text-theme-text-tertiary">
              {format(parseISO(item.achievedAt), 'HH:mm')}
            </Text>
          </View>
        </View>
      ))}
      {records.length ? (
        records.map((item) => (
          <SoberRestartCard key={item.id} record={item} pending={pending} onMenu={onMenu} />
        ))
      ) : achievements.length ? null : (
        <View className={`items-center gap-3 ${canAdd ? 'pt-8' : ''}`}>
          <AppIcon name="description" size={iconSizes.lg} color={colors.accent} />
          <Text className="text-center text-base">{t('sober.noRestartDay')}</Text>
        </View>
      )}
    </View>
  );
}
