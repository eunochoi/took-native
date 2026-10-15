import { Pressable, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Text } from '../../components/Text';
import { useAppTheme } from '../../theme/AppThemeProvider';

export function WelcomePage({ onOpenWeb }: { onOpenWeb: () => void }) {
  const { iconSizes } = useAppTheme();
  return (
    <View className="w-full gap-8">
      <View className="gap-2">
        <Text
          accessibilityRole="header"
          className="text-center text-2xl font-semibold tracking-tight"
        >
          하루를 기록하는 TOOK
        </Text>
        <Text className="text-center text-sm text-theme-text-secondary">
          일기와 습관, 거리두기 기록을{'\n'}한곳에서 관리해요.
        </Text>
      </View>
      <View className="gap-6 ios:curve-continuous rounded-2xl bg-theme-surface-muted p-6">
        <View className="gap-2">
          <Text className="text-center text-base font-semibold">기록은 이 기기에</Text>
          <Text className="text-center text-sm text-theme-text-secondary">
            계정 없이 바로 시작할 수 있어요.{'\n'}앱의 기록은 이 기기에 저장돼요.
          </Text>
        </View>
        <View className="h-px bg-theme-border/50" />
        <View className="gap-2">
          <Text className="text-center text-base font-semibold">여러 기기에서는 TOOK 웹</Text>
          <Text className="text-center text-sm text-theme-text-secondary">
            계정으로 로그인해 서버에 기록을 저장하고,{'\n'}다른 기기에서도 이용할 수 있어요.
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="TOOK 웹 열기"
            onPress={onOpenWeb}
            className="min-h-12 flex-row items-center justify-center gap-2 ios:curve-continuous rounded-xl active:opacity-65"
          >
            <Text className="text-sm font-semibold text-theme-accent">TOOK 웹 열기</Text>
            <AppIcon name="arrow-forward" size={iconSizes.sm} className="text-theme-accent" />
          </Pressable>
        </View>
      </View>
      <Text className="text-center text-xs text-theme-text-secondary">
        앱과 웹의 기록은 자동으로 연동되지 않아요.
      </Text>
    </View>
  );
}
