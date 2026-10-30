import { itemAccentColors } from '../../../src/theme/colors';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { BottomSheetPage } from '../../../src/components/BottomSheetPage';
import { Button } from '../../../src/components/Button';
import { QueryState } from '../../../src/components/QueryState';
import { Text } from '../../../src/components/Text';
import type { SoberRestart } from '../../../src/db/types';
import { isDate } from '../../../src/domain/date';
import { getSoberAchievements, getSoberSummary } from '../../../src/domain/sober';
import { useCurrentMinute } from '../../../src/hooks/useCurrentMinute';
import { useI18n } from '../../../src/i18n/react';
import { useModalNavigation } from '../../../src/navigation/ModalNavigationProvider';
import { soberQueries } from '../../../src/queries';
import { SoberLongRecords } from '../../../src/screens/sober/SoberLongRecords';
import { SoberMenu } from '../../../src/screens/sober/SoberMenu';
import { SoberMonthCalendar } from '../../../src/screens/sober/SoberMonthCalendar';
import { SoberIcon } from '../../../src/components/SoberIcon';
import { useAppTheme } from '../../../src/theme/AppThemeProvider';
import { formatDisplayDate } from '../../../src/i18n/format';
import { formatSoberDuration, formatSoberGoal } from '../../../src/i18n/sober';
import { SoberInfoCarousel } from '../../../src/screens/sober/SoberInfoCarousel';
import { ProgressBar } from '../../../src/components/ProgressBar';
import { resolveIconColor } from '../../../src/domain/constants';

export default function SoberDetail() {
  const { t, language, formatLocale } = useI18n();
  const { rem, colors, mode } = useAppTheme();

  const { id } = useLocalSearchParams<{ id: string }>();
  const soberId = typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : NaN;
  const validId = Number.isSafeInteger(soberId) && soberId > 0;
  const db = useSQLiteContext();
  const router = useRouter();
  const { openModal } = useModalNavigation();
  const now = useCurrentMinute();
  const today = format(new Date(now), 'yyyy-MM-dd');
  const [hoursOnly, setHoursOnly] = useState(false);
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const query = useQuery({ ...soberQueries.byId(db, soberId), enabled: validId });
  const restarts = useQuery({
    ...soberQueries.restarts(db, soberId),
    enabled: validId && !!query.data,
  });
  const grouped = useMemo(() => {
    const result = new Map<string, SoberRestart[]>();
    for (const item of restarts.data ?? []) {
      const date = format(parseISO(item.restarted_at), 'yyyy-MM-dd');
      const rows = result.get(date) ?? [];
      rows.push(item);
      result.set(date, rows);
    }
    return result;
  }, [restarts.data]);
  const sober = query.data;
  if (!validId || !sober || restarts.isPending || query.error || restarts.error)
    return (
      <BottomSheetPage title={t('sober.detailTitle')} backRoute="/sober">
        {validId && <QueryState query={query} />}
        {validId && !!sober && <QueryState query={restarts} />}
        {(!validId || (!query.isPending && !query.error && !sober)) && (
          <Text className="px-6">{t('sober.notFound')}</Text>
        )}
      </BottomSheetPage>
    );
  const summary = getSoberSummary(sober, restarts.data ?? [], now);
  const firstDate = format(parseISO(sober.initial_started_at), 'yyyy-MM-dd');
  const elapsedMinutes = Math.max(0, Math.floor(summary.duration / 60000));
  const durationText = hoursOnly
    ? t('sober.hoursMinutes', {
        value: Math.floor(elapsedMinutes / 60),
        count: elapsedMinutes % 60,
      })
    : formatSoberDuration(summary.duration, language);
  const accent = itemAccentColors(
    resolveIconColor(sober.icon_color, colors.accent),
    colors.surface,
    mode,
  );
  const progressColor = accent.color;
  return (
    <BottomSheetPage
      handleColor={accent.color}
      title={t('sober.detailTitle')}
      backRoute="/sober"
      menuAction={<SoberMenu sober={sober} onDeleted={() => router.dismissTo('/sober')} />}
    >
      <View className="gap-8">
        <View className="gap-7">
          <View className="items-center gap-3 pt-2">
            <SoberIcon name={sober.icon_key} colorKey={sober.icon_color} size={rem * 4} />
            <Text accessibilityRole="header" className="text-center text-xl font-semibold">
              {sober.name}
            </Text>
          </View>
          <View className="px-1 w-full gap-7">
            <SoberInfoCarousel
              color={progressColor}
              pages={[
                <View key="current" className="items-center gap-0.5">
                  <Text className="text-center text-sm text-theme-text-secondary">
                    {t('sober.currentDuration')}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('sober.currentDuration')}
                    accessibilityHint={t('sober.durationToggleHint')}
                    accessibilityValue={{ text: durationText }}
                    onPress={() => setHoursOnly((value) => !value)}
                    className="min-h-12 justify-center self-stretch active:opacity-65"
                  >
                    <Text className="text-center text-3xl leading-tight font-bold text-theme-text-primary">
                      {durationText}
                    </Text>
                  </Pressable>
                  <Text className="text-center text-sm text-theme-text-secondary">
                    {t('sober.started', {
                      value: formatDisplayDate(summary.start, formatLocale, 'shortDateTime'),
                    })}
                  </Text>
                </View>,
                <View key="summary" className="flex-row">
                  {[
                    {
                      label: t('sober.longest'),
                      value: formatSoberDuration(summary.longest, language),
                    },
                    {
                      label: t('sober.firstStart'),
                      value: formatDisplayDate(
                        sober.initial_started_at,
                        formatLocale,
                        'shortDateTime',
                      ),
                    },
                  ].map((item, index) => (
                    <View
                      key={item.label}
                      className={`flex-1 min-w-0 items-center gap-2 px-2 ${index > 0 ? 'border-l border-theme-border' : ''}`}
                    >
                      <View className="items-center gap-1">
                        <Text className="text-center text-base font-semibold text-theme-text-primary">
                          {item.label}
                        </Text>
                        <Text className="text-center text-base tracking-tighter font-medium text-theme-text-primary">
                          {item.value}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>,
              ]}
            />
            {!!sober.description?.trim() && (
              <Text
                textBreakStrategy="highQuality"
                lineBreakStrategyIOS="standard"
                className="w-[90%] self-center text-center text-base leading-relaxed text-theme-text-secondary"
              >
                {sober.description}
              </Text>
            )}
            <View className="w-[90%] self-center gap-3">
              <View className="flex-row flex-wrap justify-between gap-2">
                <Text className="text-center text-sm text-theme-text-secondary">
                  {t('sober.goalLabel', { value: formatSoberGoal(summary.goalDays, language) })}
                </Text>
                <Text className="text-sm font-semibold" style={{ color: progressColor }}>
                  {summary.progress.toFixed(0)}%
                </Text>
              </View>
              <ProgressBar
                className="h-4"
                value={summary.progress}
                color={progressColor}
                accessibilityLabel={t('sober.goalLabel', {
                  value: formatSoberGoal(summary.goalDays, language),
                })}
              />
            </View>
          </View>
          <View className="w-full px-1 gap-3">
            <Button
              labelWeight="normal"
              className="w-full"
              style={{ backgroundColor: accent.color, borderColor: accent.color }}
              labelStyle={{ color: colors.surface }}
              label={t('sober.restart')}
              onPress={() =>
                openModal({
                  pathname: '/sober/[id]/restart/new',
                  params: { id: String(soberId) },
                })
              }
            />
            <Button
              subtle
              labelWeight="normal"
              className="w-full"
              label={t('sober.viewNotes')}
              onPress={() =>
                openModal({ pathname: '/sober/[id]/memos', params: { id: String(soberId) } })
              }
            />
          </View>
        </View>
        <SoberMonthCalendar
          month={month}
          selected={selected}
          today={today}
          firstDate={firstDate}
          iconKey={sober.icon_key}
          iconColor={sober.icon_color}
          recordsByDate={grouped}
          achievements={getSoberAchievements(sober, restarts.data ?? [], now)}
          onMonthChange={setMonth}
          onSelect={(date) => {
            if (!isDate(date)) return;
            setSelected(date);
            setMonth(date.slice(0, 7));
            openModal({
              pathname: '/sober/[id]/day/[date]',
              params: { id: String(soberId), date },
            });
          }}
        />
        <SoberLongRecords accent={accent} records={summary.longRecords} />
      </View>
    </BottomSheetPage>
  );
}
