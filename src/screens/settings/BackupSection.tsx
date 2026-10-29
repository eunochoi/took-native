import { ActivityIndicator, Pressable, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Text } from '../../components/Text';
import { useI18n } from '../../i18n/react';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { MUTED_CARD_BORDER_CLASS_NAME } from '../../theme/classes';
import { AutomaticBackupSection } from './AutomaticBackupSection';

export function BackupSection({
  activity,
  onExport,
  onRestore,
}: {
  activity: 'export' | 'restore' | 'settings' | null;
  onExport: () => void;
  onRestore: () => void;
}) {
  const { colors, iconSizes } = useAppTheme();
  const { t } = useI18n();
  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="text-xl py-2 font-semibold">
        {t('settings.backupRestore')}
      </Text>
      <View className="gap-3 px-1 pt-2">
        <View
          className={`${MUTED_CARD_BORDER_CLASS_NAME} overflow-hidden rounded-2xl ios:curve-continuous bg-theme-surface-muted`}
        >
          <AutomaticBackupSection disabled={activity !== null} />
          {(['export', 'restore'] as const).map((action) => (
            <Pressable
              key={action}
              accessibilityRole="button"
              accessibilityState={{ disabled: activity !== null, busy: activity === action }}
              disabled={activity !== null}
              onPress={action === 'export' ? onExport : onRestore}
              className={`min-h-16 flex-row items-center gap-4 p-4 active:opacity-70 border-t border-theme-border/50 ${activity !== null ? 'opacity-40' : 'opacity-100'}`}
            >
              <View className="shrink-0 items-center" style={{ width: iconSizes.lg }}>
                {activity === action ? (
                  <ActivityIndicator color={colors.accent} />
                ) : (
                  <AppIcon
                    name={action === 'export' ? 'save-alt' : 'undo'}
                    size={iconSizes.lg}
                    color={colors.accent}
                  />
                )}
              </View>
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-base font-semibold">
                  {t(
                    action === 'export' ? 'settings.backupMenuTitle' : 'settings.restoreMenuTitle',
                  )}
                </Text>
                <Text className="text-sm text-theme-text-secondary">
                  {t(
                    action === 'export'
                      ? 'settings.backupMenuDescription'
                      : 'settings.restoreMenuDescription',
                  )}
                </Text>
              </View>
              <AppIcon name="chevron-right" size={iconSizes.md} color={colors.textTertiary} />
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
