import { useRef, useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';
import { validatePassword } from '../../backup/container';
import { backupErrorMessage } from '../../backup/errors';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { Button } from '../../components/Button';
import { InfoNotice } from '../../components/InfoNotice';
import { Text } from '../../components/Text';
import { useI18n } from '../../i18n/react';
import { useAppTheme } from '../../theme/AppThemeProvider';

export function BackupPasswordSheet({
  title,
  creating,
  information,
  changing = false,
  onClose,
  onSubmit,
}: {
  title: string;
  creating: boolean;
  information?: string;
  changing?: boolean;
  onClose: () => void;
  onSubmit: (password: string, oldPassword?: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(false);
  const input = (value: string, change: (value: string) => void, label: string) => (
    <TextInput
      secureTextEntry
      autoCapitalize="none"
      autoCorrect={false}
      value={value}
      onChangeText={change}
      placeholder={label}
      accessibilityLabel={label}
      placeholderTextColor={colors.textSecondary}
      editable={!busy}
      maxLength={256}
      className="min-h-12 rounded-2xl border border-theme-border bg-theme-surface px-4 py-3 text-base text-theme-text-primary"
    />
  );
  return (
    <BottomSheetModal
      visible
      title={title}
      onClose={onClose}
      dismissible={!busy}
      dismissOnBack={!busy}
    >
      <View className="gap-4">
        <Text className="text-sm text-theme-text-secondary">
          {t(creating ? 'settings.backupPasswordWarning' : 'settings.backupPasswordPrompt')}
          {creating && `\n${t('settings.backupSingleFile')}`}
        </Text>
        {changing && input(oldPassword, setOldPassword, t('settings.backupOldPassword'))}
        {input(password, setPassword, t('settings.backupPassword'))}
        {creating && input(confirmation, setConfirmation, t('settings.backupPasswordConfirm'))}
        {!!error && (
          <Text accessibilityRole="alert" className="text-sm text-theme-danger">
            {error}
          </Text>
        )}
        {busy && <ActivityIndicator color={colors.accent} />}
        {!!information && (
          <InfoNotice numberOfLines={0} adjustsFontSizeToFit={false}>
            {information}
          </InfoNotice>
        )}
        <Button
          disabled={busy || !password}
          label={t('common.confirm')}
          onPress={() => {
            if (active.current) return;
            if (creating && password !== confirmation) {
              setError(t('settings.backupPasswordMismatch'));
              return;
            }
            active.current = true;
            setBusy(true);
            setError('');
            void (async () => {
              try {
                if (creating) validatePassword(password);
                await onSubmit(password, changing ? oldPassword : undefined);
                setPassword('');
                setConfirmation('');
                setOldPassword('');
                onClose();
              } catch (value) {
                setError(backupErrorMessage(value));
              } finally {
                active.current = false;
                setBusy(false);
              }
            })();
          }}
        />
      </View>
    </BottomSheetModal>
  );
}
