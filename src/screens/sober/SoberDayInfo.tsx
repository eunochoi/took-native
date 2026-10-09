import { Pressable, View } from 'react-native';
import { format } from 'date-fns';
import { AppIcon } from '../../components/AppIcon';
import { SoberRestartCard } from './SoberRestartCard';
import type { SoberRestart } from '../../db/types';
import { Text } from '../../components/Text';
import { useAppTheme } from '../../theme/AppThemeProvider';

export function SoberDayInfo({
  date,
  records,
  canAdd,
  pending,
  onAdd,
  onMenu,
}: {
  date: string;
  records: SoberRestart[];
  canAdd: boolean;
  pending: boolean;
  onAdd: () => void;
  onMenu: (record: SoberRestart) => void;
}) {
  const { colors, iconSizes } = useAppTheme();
  return (
    <View className="gap-3">
      {canAdd && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="이 날짜에 다시 시작 기록 추가"
          disabled={pending}
          onPress={onAdd}
          className={`min-h-11 self-end flex-row items-center gap-1 ${pending ? 'opacity-40' : 'opacity-100'}`}
        >
          <AppIcon name="add" size={iconSizes.sm} color={colors.accent} />
          <Text className="text-sm text-theme-accent">기록 추가</Text>
        </Pressable>
      )}
      {records.length ? (
        records.map((item) => (
          <SoberRestartCard key={item.id} record={item} pending={pending} onMenu={onMenu} />
        ))
      ) : (
        <View className={`items-center gap-3 ${canAdd ? 'pt-8' : ''}`}>
          <AppIcon name="description" size={iconSizes.lg} color={colors.accent} />
          <Text className="text-center text-base">이날은 다시 시작한 기록이 없어요.</Text>
          <Text className="text-center text-sm text-theme-text-tertiary">
            {canAdd
              ? date === format(new Date(), 'yyyy-MM-dd')
                ? '오늘도 잠시 거리를 두고 있어요.'
                : '거리를 두고 지낸 날이에요.'
              : '거리두기를 시작하기 전이에요.'}
          </Text>
        </View>
      )}
    </View>
  );
}
