import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Platform, Switch, View } from 'react-native';
import { latestSafetyBackup, shareSafetyBackup } from '../../backup';
import {
  autoBackupStatus,
  configureAutomaticBackup,
  disableAutomaticBackup,
  refreshAutoBackupStatus,
  resumeAutomaticBackup,
  runAutomaticBackup,
  subscribeAutoBackup,
} from '../../backup/automatic';
import { backupErrorMessage } from '../../backup/errors';
import { backupBusy, subscribeBackupActivity } from '../../backup/operation';
import { Button } from '../../components/Button';
import { Text } from '../../components/Text';
import { useI18n } from '../../i18n/react';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { BackupPasswordSheet } from './BackupPasswordSheet';

export function AutomaticBackupSection({ disabled }: { disabled: boolean }) {
  const { t, formatLocale } = useI18n();
  const { colors } = useAppTheme();
  const db = useSQLiteContext();
  const status = useSyncExternalStore(subscribeAutoBackup, autoBackupStatus);
  const busy = useSyncExternalStore(subscribeBackupActivity, backupBusy);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    void refreshAutoBackupStatus();
  }, []);
  const perform = (action: () => Promise<unknown>) => {
    setError('');
    void action().catch((value) => setError(backupErrorMessage(value)));
  };
  return (
    <View className="gap-3 p-4">
      <View className="flex-row items-center gap-4">
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-base font-semibold">{t('settings.autoBackup')}</Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            className="text-sm text-theme-text-secondary"
          >
            {t('settings.autoBackupShort')}
          </Text>
        </View>
        <Switch
          accessibilityLabel={t('settings.autoBackup')}
          disabled={disabled || busy}
          value={status.enabled && !status.paused}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={colors.surface}
          onValueChange={(enabled) =>
            enabled
              ? status.configured
                ? perform(async () => {
                    await resumeAutomaticBackup();
                    await runAutomaticBackup(db);
                  })
                : setPasswordOpen(true)
              : perform(disableAutomaticBackup)
          }
        />
      </View>
      <View className="my-3 gap-3">
        <View className="flex-row items-start gap-4">
          <Text className="w-24 shrink text-sm leading-5 text-theme-text-secondary">
            {t('settings.backupLocationLabel')}
          </Text>
          <Text className="min-w-0 flex-1 text-right text-sm leading-5">
            {status.configured
              ? t(
                  Platform.OS === 'ios'
                    ? 'settings.autoBackupICloud'
                    : 'settings.autoBackupAndroid',
                )
              : t('settings.backupLocationUnset')}
          </Text>
        </View>
        <View className="flex-row items-start gap-4">
          <Text className="w-24 shrink text-sm leading-5 text-theme-text-secondary">
            {t('settings.backupRecentLabel')}
          </Text>
          <Text className="min-w-0 flex-1 text-right text-sm leading-5">
            {status.lastSuccess
              ? new Date(status.lastSuccess).toLocaleDateString(formatLocale, {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                })
              : t(status.error ? 'settings.backupRecentUnavailable' : 'settings.backupRecentNone')}
          </Text>
        </View>
      </View>
      {(busy || status.pending || status.paused) && (
        <Text className="text-sm text-theme-text-secondary">
          {t(
            busy
              ? 'settings.backupBusy'
              : status.pending
                ? 'settings.backupUploadPending'
                : 'settings.backupPausedAfterRestore',
          )}
        </Text>
      )}
      {!!(error || status.error) && (
        <Text className="text-sm text-theme-danger">
          {error || backupErrorMessage(status.error)}
        </Text>
      )}
      {status.configured && (
        <Button
          subtle
          className="!bg-theme-border/60 dark:!bg-theme-border-muted"
          disabled={disabled || busy}
          labelWeight="normal"
          label={t('settings.backupChangePassword')}
          onPress={() => setPasswordOpen(true)}
        />
      )}
      {!!latestSafetyBackup() && (
        <Button
          subtle
          disabled={disabled || busy}
          label={t('settings.backupSafetyExport')}
          onPress={() => perform(shareSafetyBackup)}
        />
      )}
      {passwordOpen && (
        <BackupPasswordSheet
          title={t('settings.autoBackup')}
          information={t('settings.autoBackupPolicy')}
          creating
          changing={status.configured}
          onClose={() => setPasswordOpen(false)}
          onSubmit={(password, oldPassword) => configureAutomaticBackup(db, password, oldPassword)}
        />
      )}
    </View>
  );
}
