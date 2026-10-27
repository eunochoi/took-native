import { Pressable, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { InfoNotice } from '../../components/InfoNotice';
import { Text } from '../../components/Text';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { MUTED_CARD_BORDER_CLASS_NAME } from '../../theme/classes';

export function BackupPage({ onOpenWeb }: { onOpenWeb: () => void }) {
  const { iconSizes } = useAppTheme();
  return (
    <View className="w-full grow justify-between gap-6">
      <View className="gap-2">
        <Text
          accessibilityRole="header"
          className="text-center text-[21px] leading-[28px] font-semibold tracking-tight"
        >
          소중한 기록을 보관해요
        </Text>
        <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
          삭제·기기 변경 전 백업하세요.
        </Text>
      </View>
      <View
        className={`${MUTED_CARD_BORDER_CLASS_NAME} gap-5 ios:curve-continuous rounded-2xl bg-theme-surface-muted p-6`}
      >
        <View className="gap-2">
          <Text className="text-center text-[15.75px] leading-[24.5px] font-semibold">
            이 기기에 저장
          </Text>
          <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
            계정 없이 바로 시작할 수 있어요.{'\n'}앱의 기록은 이 기기에 저장돼요.
          </Text>
        </View>
        <View className="h-px bg-theme-border/50" />
        <View className="gap-2">
          <Text className="text-center text-[15.75px] leading-[24.5px] font-semibold">
            백업·복원
          </Text>
          <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
            설정에서 기록을 백업하고,{'\n'}새 기기에서 백업 파일을 복원해요.
          </Text>
        </View>
        <View className="h-px bg-theme-border/50" />
        <View className="gap-2">
          <Text className="text-center text-[15.75px] leading-[24.5px] font-semibold">
            웹에서 이용
          </Text>
          <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
            웹은 계정으로 로그인해 서버에 저장하고,{'\n'}다른 기기에서도 기록을 볼 수 있어요.
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="오늘 툭 웹 열기"
            onPress={onOpenWeb}
            className="min-h-12 flex-row items-center justify-center gap-2 ios:curve-continuous rounded-xl active:opacity-65"
          >
            <Text className="text-[14px] leading-[21px] font-semibold text-theme-accent">
              오늘 툭 웹 열기
            </Text>
            <AppIcon name="arrow-forward" size={iconSizes.sm} className="text-theme-accent" />
          </Pressable>
        </View>
      </View>
      <InfoNotice textClassName="text-[10.5px] leading-[17.5px]" adjustsFontSizeToFit={false}>
        앱과 웹의 기록은 자동으로 연동되지 않아요.
      </InfoNotice>
    </View>
  );
}
