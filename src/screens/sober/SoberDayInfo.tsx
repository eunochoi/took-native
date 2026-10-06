import { MUTED_DESCRIPTION_CLASS_NAME } from '../../theme/classes';
import { Pressable, View } from 'react-native';
import { format, parseISO } from 'date-fns';
import { AppIcon } from '../../components/AppIcon';
import { RecordMenuButton } from '../../components/RecordMenuButton';
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
          <View
            key={item.id}
            className="gap-2 rounded-2xl bg-transparent border border-theme-border p-4"
          >
            <View className="flex-row items-center gap-3">
              <View className="flex-1 gap-1">
                <Text className="text-base">
                  다시 시작 · {format(parseISO(item.restarted_at), 'HH:mm')}
                </Text>
              </View>
              <RecordMenuButton
                muted
                accessibilityLabel={`${format(parseISO(item.restarted_at), 'HH:mm')} 다시 시작 기록 메뉴`}
                disabled={pending}
                onPress={() => onMenu(item)}
                className={`h-11 w-11 items-center justify-center ${pending ? 'opacity-40' : 'opacity-100'}`}
              />
            </View>
            {!!item.memo && <Text className={MUTED_DESCRIPTION_CLASS_NAME}>{item.memo}</Text>}
          </View>
        ))
      ) : (
        <View className="items-center gap-3 py-8">
          <AppIcon name="description" size={iconSizes.lg} color={colors.accent} />
          <Text className="text-center text-base">이 날의 다시 시작 기록이 없어요.</Text>
          <Text className="text-center text-sm text-theme-text-tertiary">
            {canAdd
              ? date === format(new Date(), 'yyyy-MM-dd')
                ? '오늘도 절제를 이어가고 있어요.'
                : '절제를 이어가고 있던 날이에요.'
              : '절제를 시작하기 전이에요.'}
          </Text>
        </View>
      )}
    </View>
  );
}
