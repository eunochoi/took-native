import { format, parseISO } from 'date-fns';
import { View } from 'react-native';
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
    <View className="gap-2 ios:curve-continuous rounded-2xl bg-transparent border border-theme-border p-4">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-base">{time}</Text>
        {onMenu && (
          <RecordMenuButton
            muted
            accessibilityLabel={`${time} 다시 시작 기록 메뉴`}
            disabled={pending}
            onPress={() => onMenu(record)}
            className={`-mr-4 w-11 items-center justify-center ${pending ? 'opacity-40' : 'opacity-100'}`}
          />
        )}
      </View>
      {!!record.memo && <Text className={MUTED_DESCRIPTION_CLASS_NAME}>{record.memo}</Text>}
    </View>
  );
}
