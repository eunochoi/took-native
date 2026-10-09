import { useModalNavigation } from '../../navigation/ModalNavigationProvider';
import { UNDERLINE_TAB_LIST_CLASS_NAME } from '../../theme/classes';
import { UnderlineTab } from '../../components/UnderlineTab';
import { AnalysisHeader } from './AnalysisHeader';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Pressable, View } from 'react-native';
import { SoberIcon } from '../../components/SoberIcon';
import { Text } from '../../components/Text';
import type { Sober, SoberRestart } from '../../db/types';
import { formatSoberDuration, getSoberStreaks } from '../../domain/sober';
import { useCurrentMinute } from '../../hooks/useCurrentMinute';
import { useAppTheme } from '../../theme/AppThemeProvider';

export function SoberAnalysis({ sobers, restarts }: { sobers: Sober[]; restarts: SoberRestart[] }) {
  const { openModal } = useModalNavigation();
  const now = useCurrentMinute();
  const { rem: appRem } = useAppTheme();
  const [tab, setTab] = useState<'top' | 'bottom'>('top');
  const records = sobers.flatMap((sober) =>
    getSoberStreaks(
      sober,
      restarts.filter((item) => item.sober_id === sober.id),
      now,
    ).map((record) => ({ sober, record })),
  );
  const visibleRecords = records
    .sort(
      (a, b) =>
        (tab === 'top'
          ? b.record.duration - a.record.duration
          : a.record.duration - b.record.duration) ||
        a.sober.id - b.sober.id ||
        Date.parse(a.record.start) - Date.parse(b.record.start),
    )
    .slice(0, 3);
  return (
    <View className="gap-4">
      <AnalysisHeader title="거리두기 기록">전체 거리두기 항목 {sobers.length}개</AnalysisHeader>
      <View accessibilityRole="tablist" className={UNDERLINE_TAB_LIST_CLASS_NAME}>
        {(
          [
            { value: 'top', label: '오래 유지한 순' },
            { value: 'bottom', label: '짧게 유지한 순' },
          ] as const
        ).map((option) => (
          <UnderlineTab
            key={option.value}
            selected={tab === option.value}
            onPress={() => setTab(option.value)}
          >
            {option.label}
          </UnderlineTab>
        ))}
      </View>
      {records.length ? (
        <View className="gap-4 px-2">
          {visibleRecords.map(({ sober, record }, index) => {
            return (
              <Pressable
                key={`${sober.id}:${record.start}:${record.current ? 'current' : record.end}:${index}`}
                accessibilityRole="button"
                accessibilityLabel={`${sober.name}, ${formatSoberDuration(record.duration)}, ${format(parseISO(record.start), 'yy년 M월 d일 HH:mm')}부터 ${record.current ? '현재까지 진행 중' : `${format(parseISO(record.end), 'yy년 M월 d일 HH:mm')}까지`}, 거리두기 정보`}
                onPress={() => {
                  openModal(`/sober/${sober.id}`);
                }}
                className={`flex-row items-center gap-6 min-h-24 py-3 ${index < visibleRecords.length - 1 ? 'border-b border-theme-border/60' : ''}`}
              >
                <View className="h-9 w-9 shrink-0 items-center justify-center">
                  <SoberIcon
                    name={sober.icon_key}
                    colorKey={sober.icon_color}
                    size={appRem * 2.25}
                  />
                </View>
                <View className="flex-1 min-w-0 gap-1">
                  <Text numberOfLines={1} className="text-base leading-relaxed">
                    {sober.name}
                  </Text>
                  <Text className="text-base font-bold text-theme-text-primary">
                    {formatSoberDuration(record.duration)}
                  </Text>
                  <Text className="text-sm text-theme-text-secondary">
                    시작 시간 : {format(parseISO(record.start), 'yy년 M월 d일 HH:mm')}
                  </Text>
                  <Text className="text-sm text-theme-text-secondary">
                    종료 시간 :{' '}
                    {record.current ? (
                      <Text className="text-sm text-theme-accent">진행 중</Text>
                    ) : (
                      format(parseISO(record.end), 'yy년 M월 d일 HH:mm')
                    )}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text className="px-2 py-8 text-center text-theme-text-secondary text-sm">
          아직 거리두기 기록이 없어요.
        </Text>
      )}
    </View>
  );
}
