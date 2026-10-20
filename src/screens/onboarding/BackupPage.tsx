import { View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Button } from '../../components/Button';
import { Text } from '../../components/Text';
import { InfoNotice } from '../../components/InfoNotice';
import { useAppTheme } from '../../theme/AppThemeProvider';

export function BackupPage({ busy, onConfirm }: { busy: boolean; onConfirm: () => void }) {
  const { iconSizes } = useAppTheme();
  return (
    <View className="w-full gap-8">
      <View className="gap-2">
        <Text
          accessibilityRole="header"
          className="text-center text-2xl font-semibold tracking-tight"
        >
          기록을 안전하게 보관해요
        </Text>
        <Text className="text-center text-sm text-theme-text-secondary">
          앱 삭제나 기기 변경 전에는{'\n'}설정에서 기록을 백업해 주세요.
        </Text>
      </View>
      <View className="items-center gap-6 ios:curve-continuous rounded-2xl bg-theme-surface-muted p-8">
        <View className="h-12 w-12 items-center justify-center ios:curve-continuous rounded-full bg-theme-surface">
          <AppIcon name="save-alt" size={iconSizes.lg} className="text-theme-accent" />
        </View>
        <Text className="text-center text-base font-semibold">백업 파일로 이어가기</Text>
        <Text className="text-center text-sm text-theme-text-secondary">
          새 기기에서 백업 파일을 불러오면{'\n'}지금까지의 기록을 이어갈 수 있어요.
        </Text>
      </View>
      <View className="gap-3">
        <Button label={busy ? '저장 중…' : '확인'} disabled={busy} onPress={onConfirm} />
        <InfoNotice>이 안내는 설정에서 다시 볼 수 있어요.</InfoNotice>
      </View>
    </View>
  );
}
