import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../../components/Text';
import { formatSoberDuration, type SoberStreak } from '../../domain/sober';
import { MUTED_DESCRIPTION_CLASS_NAME } from '../../theme/classes';

export function SoberLongRecords({ records }: { records: SoberStreak[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!records.length) return null;
  const renderRecord = (item: SoberStreak, index: number) => (
    <View
      key={`${item.start}:${item.current ? 'current' : item.end}`}
      className="flex-row gap-4 py-3"
    >
      <Text className="w-6 text-lg font-semibold text-theme-accent">{index + 1}</Text>
      <View className="flex-1 gap-1">
        <Text className="text-base font-semibold">{formatSoberDuration(item.duration)}</Text>
        <Text className={MUTED_DESCRIPTION_CLASS_NAME}>
          {format(parseISO(item.start), 'yy년 M월 d일 HH:mm')} – {item.current ? '현재' : format(parseISO(item.end), 'yy년 M월 d일 HH:mm')}
        </Text>
      </View>
    </View>
  );
  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="text-xl font-semibold">
        오래 이어간 기록
      </Text>
      <Text className="text-sm text-theme-text-secondary">3일 이상 이어진 기록만 보여드려요.</Text>
      <View>
        {records.slice(0, expanded ? records.length : 5).map(renderRecord)}
        {records.length > 5 && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            onPress={() => setExpanded(!expanded)}
            className="min-h-11 items-center justify-center"
          >
            <Text className="text-sm text-theme-accent">{expanded ? '접기' : '기록 더보기'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
