import { View } from 'react-native';
import { format, parseISO } from 'date-fns';
import { RecordMenuButton } from '../../components/RecordMenuButton';
import { Text } from '../../components/Text';
import type { SoberRestart } from '../../db/types';
import { MUTED_DESCRIPTION_CLASS_NAME } from '../../theme/classes';

export function SoberRestartCard({
  record,
  pending = false,
  onMenu,
}: {
  record: SoberRestart;
  pending?: boolean;
  onMenu?: (record: SoberRestart) => void;
}) {
  const time = format(parseISO(record.restarted_at), 'HH:mm');
  return (
    <View className="gap-2 rounded-2xl bg-transparent border border-theme-border p-4">
      <View className="flex-row items-center gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-base">{time}</Text>
        </View>
        {onMenu && (
          <RecordMenuButton
            muted
            accessibilityLabel={`${time} 다시 시작 기록 메뉴`}
            disabled={pending}
            onPress={() => onMenu(record)}
            className={`h-11 w-11 items-center justify-center ${pending ? 'opacity-40' : 'opacity-100'}`}
          />
        )}
      </View>
      {!!record.memo && <Text className={MUTED_DESCRIPTION_CLASS_NAME}>{record.memo}</Text>}
    </View>
  );
}
