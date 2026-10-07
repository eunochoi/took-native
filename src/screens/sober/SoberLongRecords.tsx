import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { twMerge } from 'tailwind-merge';
import { Text } from '../../components/Text';
import { formatSoberDuration, type SoberStreak } from '../../domain/sober';
import { MUTED_DESCRIPTION_CLASS_NAME } from '../../theme/classes';

const RANK_BACKGROUND_CLASSES = [
  'bg-theme-accent',
  'bg-theme-accent/[0.92]',
  'bg-theme-accent/[0.84]',
  'bg-theme-accent/[0.76]',
  'bg-theme-accent/[0.68]',
  'bg-theme-accent/60',
  'bg-theme-accent/[0.52]',
  'bg-theme-accent/[0.44]',
];

export function SoberLongRecords({ records }: { records: SoberStreak[] }) {
  const [expanded, setExpanded] = useState(false);
  const renderRecord = (item: SoberStreak, index: number) => (
    <View
      key={`${item.start}:${item.current ? 'current' : item.end}`}
      className="flex-row gap-4 py-3 items-center"
    >
      <View
        className={`w-7 h-7 rounded-full flex items-center justify-center ${RANK_BACKGROUND_CLASSES[index] ?? 'bg-theme-accent/40'}`}
      >
        <Text className={`text-base font-semibold text-theme-surface`}>{index + 1}</Text>
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-base font-semibold">{formatSoberDuration(item.duration)}</Text>
        <Text
          className={twMerge(MUTED_DESCRIPTION_CLASS_NAME, item.current && 'text-theme-accent')}
        >
          {format(parseISO(item.start), 'yy년 M월 d일 HH:mm')} –{' '}
          {item.current ? '현재' : format(parseISO(item.end), 'yy년 M월 d일 HH:mm')}
        </Text>
      </View>
    </View>
  );
  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="text-xl font-semibold">
        거리두기 기록
      </Text>
      <Text className="text-sm text-theme-text-secondary">
        오래 유지한 순으로 최대 20개의 기록을 보여드려요.
      </Text>
      <View>
        {records.slice(0, expanded ? 20 : 5).map(renderRecord)}
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
