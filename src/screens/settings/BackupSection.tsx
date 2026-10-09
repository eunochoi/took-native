import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from '../../components/Text';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { MUTED_DESCRIPTION_CLASS_NAME } from '../../theme/classes';

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
  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="text-xl py-2 font-semibold">
        백업 / 복원
      </Text>
      <View className="gap-6 px-2 pt-2">
        <View className="gap-4 rounded-2xl bg-theme-surface-muted p-4">
          <View className="gap-2">
            <Text className="text-base font-semibold">기록 보관</Text>
            <Text className={MUTED_DESCRIPTION_CLASS_NAME}>
              기록·사진·설정을 파일로 저장해요. 자동 업로드는 하지 않아요.
            </Text>
          </View>
          <View className="gap-2 border-t border-theme-border/60 pt-4">
            <Text className="text-base font-semibold">안전한 저장</Text>
            <Text className={MUTED_DESCRIPTION_CLASS_NAME}>
              암호화하지 않으니 안전한 곳에 보관해주세요.
            </Text>
            <Text className={MUTED_DESCRIPTION_CLASS_NAME}>
              1GB 초과 시 분할해요. 복원할 땐 같은 세트의 ZIP을 모두 선택해주세요.
            </Text>
          </View>
          <View className="gap-2 border-t border-theme-border/60 pt-4">
            <Text className="text-base font-semibold">복원 전 확인</Text>
            <Text className={MUTED_DESCRIPTION_CLASS_NAME}>
              현재 데이터가 백업 내용으로 교체돼요.
            </Text>
            <Text className="text-sm font-medium text-theme-danger font-bold">
              복원 전에 먼저 백업해주세요.
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: activity !== null, busy: activity === 'export' }}
          disabled={activity !== null}
          onPress={onExport}
          className={`min-h-12 flex-row items-center justify-center gap-2 rounded-full bg-theme-accent px-5 ${activity !== null ? 'opacity-40' : 'opacity-100'}`}
        >
          {activity === 'export' && <ActivityIndicator color={colors.textOnAccent} />}
          <Text className="text-base text-theme-text-on-accent">
            {activity === 'export' ? '백업 준비 중…' : '백업하기'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: activity !== null, busy: activity === 'restore' }}
          disabled={activity !== null}
          onPress={onRestore}
          className={`min-h-12 flex-row items-center justify-center gap-2 rounded-full bg-theme-accent/10 px-5 ${activity !== null ? 'opacity-40' : 'opacity-100'}`}
        >
          {activity === 'restore' && <ActivityIndicator color={colors.accent} />}
          <Text className="text-base text-theme-accent">
            {activity === 'restore' ? '복원 준비 중…' : '백업 파일에서 복원하기'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
