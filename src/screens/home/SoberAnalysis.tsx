import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { InfoNotice } from '../../components/InfoNotice';
import { SoberIcon } from '../../components/SoberIcon';
import { Text } from '../../components/Text';
import { UnderlineTab } from '../../components/UnderlineTab';
import type { Sober, SoberRestart } from '../../db/types';
import { formatSoberDuration, getSoberStreaks } from '../../domain/sober';
import { useCurrentMinute } from '../../hooks/useCurrentMinute';
import { useModalNavigation } from '../../navigation/ModalNavigationProvider';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { UNDERLINE_TAB_LIST_CLASS_NAME } from '../../theme/classes';
import { AnalysisHeader } from './AnalysisHeader';

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
      <AnalysisHeader title="거리두기 기록">전체 항목 {sobers.length}개</AnalysisHeader>
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
      <View className="mx-1 px-4 py-4 bg-theme-surface-muted/60 ios:curve-continuous rounded-theme">
        {records.length ? (
          visibleRecords.map(({ sober, record }, index) => {
            const status = record.current ? '진행 중' : '종료';
            const duration = formatSoberDuration(record.duration);
            const [days, hours, minutes] = duration.split(' ');
            return (
              <Pressable
                key={`${sober.id}:${record.start}:${record.current ? 'current' : record.end}:${index}`}
                accessibilityRole="button"
                accessibilityLabel={`${sober.name}, ${status}, ${duration}, ${format(parseISO(record.start), 'yy년 M월 d일 HH:mm')}부터 ${record.current ? '현재까지' : `${format(parseISO(record.end), 'yy년 M월 d일 HH:mm')}까지`}, 거리두기 정보`}
                onPress={() => {
                  openModal(`/sober/${sober.id}`);
                }}
                className={`flex-row items-center gap-4 min-h-12 ${index > 0 ? 'pt-4' : ''} ${index < visibleRecords.length - 1 ? 'pb-4 border-b border-theme-border/50' : ''}`}
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
                  <Text
                    className={`text-sm ${record.current ? 'text-theme-accent' : 'text-theme-text-secondary'}`}
                  >
                    {status}
                  </Text>
                </View>
                <View className="shrink items-end gap-1">
                  <View className="flex-row items-baseline gap-1">
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      className="text-theme-text-primary font-semibold text-2xl"
                    >
                      {days.slice(0, -1)}
                    </Text>
                    <Text className="text-base text-theme-text-secondary">일</Text>
                  </View>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    className="text-base text-theme-text-secondary"
                  >
                    {hours} {minutes}
                  </Text>
                </View>
              </Pressable>
            );
          })
        ) : (
          <Text className="text-center text-theme-text-secondary text-sm">
            아직 거리두기 기록이 없어요.
          </Text>
        )}
      </View>
      <InfoNotice>선택 연도와 관계없이 전체 기간 기록이에요.</InfoNotice>
    </View>
  );
}
