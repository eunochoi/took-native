import { useI18n } from '../../i18n/react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from '../../components/Text';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { MUTED_CARD_BORDER_CLASS_NAME, MUTED_DESCRIPTION_CLASS_NAME } from '../../theme/classes';

export function BackupSection({
  activity,
  onExport,
  onRestore,
}: {
  activity: 'export' | 'restore' | 'settings' | null;
  onExport: () => void;
  onRestore: () => void;
}) {
  const { colors } = useAppTheme();
  const { t } = useI18n();
  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="text-xl py-2 font-semibold">
        {t('settings.backupRestore')}
      </Text>
      <View className="gap-6 px-1 pt-2">
        <View
          className={`${MUTED_CARD_BORDER_CLASS_NAME} gap-4 ios:curve-continuous rounded-2xl bg-theme-surface-muted p-4`}
        >
          <View className="gap-2">
            <Text className="text-base font-semibold">{t('settings.keepRecords')}</Text>
            <Text className={MUTED_DESCRIPTION_CLASS_NAME}>{t('settings.backupDescription')}</Text>
          </View>
          <View className="gap-2 border-t border-theme-border/50 pt-4">
            <Text className="text-base font-semibold">{t('settings.safeStorage')}</Text>
            <Text className={MUTED_DESCRIPTION_CLASS_NAME}>{t('settings.unencrypted')}</Text>
            <Text className={MUTED_DESCRIPTION_CLASS_NAME}>{t('settings.splitBackup')}</Text>
          </View>
          <View className="gap-2 border-t border-theme-border/50 pt-4">
            <Text className="text-base font-semibold">{t('settings.beforeRestore')}</Text>
            <Text className={MUTED_DESCRIPTION_CLASS_NAME}>{t('settings.replaceData')}</Text>
            <Text className="text-sm font-medium text-theme-danger font-bold">
              {t('settings.backupFirst')}
            </Text>
          </View>
        </View>
        <View className="flex-row gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: activity !== null, busy: activity === 'export' }}
            disabled={activity !== null}
            onPress={onExport}
            className={`flex-1 min-w-0 min-h-12 flex-row items-center justify-center gap-2 ios:curve-continuous rounded-full border border-theme-accent-deep bg-theme-accent px-3 ${activity !== null ? 'opacity-40' : 'opacity-100'}`}
          >
            {activity === 'export' && <ActivityIndicator color={colors.textOnAccent} />}
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              className="min-w-0 shrink text-base text-theme-text-on-accent"
            >
              {activity === 'export' ? t('settings.preparingBackup') : t('settings.createBackup')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: activity !== null, busy: activity === 'restore' }}
            disabled={activity !== null}
            onPress={onRestore}
            className={`flex-1 min-w-0 min-h-12 flex-row items-center justify-center gap-2 ios:curve-continuous rounded-full border border-theme-accent/20 bg-theme-accent/10 px-3 ${activity !== null ? 'opacity-40' : 'opacity-100'}`}
          >
            {activity === 'restore' && <ActivityIndicator color={colors.accent} />}
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              className="min-w-0 shrink text-base text-theme-accent"
            >
              {activity === 'restore'
                ? t('settings.preparingRestore')
                : t('settings.restoreBackup')}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
