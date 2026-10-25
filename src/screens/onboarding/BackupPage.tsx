import { Pressable, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { InfoNotice } from '../../components/InfoNotice';
import { Text } from '../../components/Text';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { MUTED_CARD_BORDER_CLASS_NAME } from '../../theme/classes';

export function BackupPage({ onOpenWeb }: { onOpenWeb: () => void }) {
  const { iconSizes } = useAppTheme();
  return (
    <View className="w-full gap-6">
      <View className="gap-2">
        <Text
          accessibilityRole="header"
          className="text-center text-2xl font-semibold tracking-tight"
        >
          소중한 기록을 보관해요
        </Text>
        <Text className="text-center text-sm text-theme-text-secondary">
          앱 삭제나 기기 변경 전에는{'\n'}설정에서 기록을 백업해 주세요.
        </Text>
      </View>
      <View
        className={`${MUTED_CARD_BORDER_CLASS_NAME} gap-5 ios:curve-continuous rounded-2xl bg-theme-surface-muted p-6`}
      >
        <View className="gap-2">
          <Text className="text-center text-base font-semibold">이 기기에 저장되는 기록</Text>
          <Text className="text-center text-sm text-theme-text-secondary">
            계정 없이 바로 시작할 수 있어요.{'\n'}앱의 기록은 이 기기에 저장돼요.
          </Text>
        </View>
        <View className="h-px bg-theme-border/50" />
        <View className="gap-2">
          <Text className="text-center text-base font-semibold">백업 파일로 이어가기</Text>
          <Text className="text-center text-sm text-theme-text-secondary">
            설정에서 기록을 백업하고,{'\n'}새 기기에서 백업 파일을 복원해요.
          </Text>
        </View>
        <View className="h-px bg-theme-border/50" />
        <View className="gap-2">
          <Text className="text-center text-base font-semibold">여러 기기에서는 포포툭 웹</Text>
          <Text className="text-center text-sm text-theme-text-secondary">
            웹은 계정으로 로그인해 서버에 저장하고,{'\n'}다른 기기에서도 기록을 볼 수 있어요.
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="포포툭 웹 열기"
            onPress={onOpenWeb}
            className="min-h-12 flex-row items-center justify-center gap-2 ios:curve-continuous rounded-xl active:opacity-65"
          >
            <Text className="text-sm font-semibold text-theme-accent">포포툭 웹 열기</Text>
            <AppIcon name="arrow-forward" size={iconSizes.sm} className="text-theme-accent" />
          </Pressable>
        </View>
      </View>
      <InfoNotice>앱과 웹의 기록은 자동으로 연동되지 않아요.</InfoNotice>
    </View>
  );
}
