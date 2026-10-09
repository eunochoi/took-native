import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { AlertModal, type AlertContent } from '../../../src/components/AlertModal';
import { BottomSheetModal } from '../../../src/components/BottomSheetModal';
import { BottomSheetPage } from '../../../src/components/BottomSheetPage';
import { Button } from '../../../src/components/Button';
import { ConfirmModal } from '../../../src/components/ConfirmModal';
import { DateTimePicker } from '../../../src/components/DateTimePicker';
import { PickerAction } from '../../../src/components/PickerAction';
import { QueryState } from '../../../src/components/QueryState';
import { Text } from '../../../src/components/Text';
import { deleteSoberRestart, saveSoberRestart } from '../../../src/db/sober';
import type { SoberRestart } from '../../../src/db/types';
import { getSoberSummary, type SoberRestartInput } from '../../../src/domain/sober';
import { useCurrentMinute } from '../../../src/hooks/useCurrentMinute';
import { soberQueries, useRecordMutation } from '../../../src/queries';
import { SoberDayInfo } from '../../../src/screens/sober/SoberDayInfo';
import { SoberGauge } from '../../../src/screens/sober/SoberGauge';
import { SoberLongRecords } from '../../../src/screens/sober/SoberLongRecords';
import { SoberMenu } from '../../../src/screens/sober/SoberMenu';
import { SoberMonthCalendar } from '../../../src/screens/sober/SoberMonthCalendar';
import { SoberStatisticsSummary } from '../../../src/screens/sober/SoberStatisticsSummary';
import { BODY_DESCRIPTION_CLASS_NAME, SECTION_TITLE_CLASS_NAME } from '../../../src/theme/classes';

type Overlay =
  | { kind: 'day' }
  | { kind: 'restart'; id?: number; value: string; memo: string }
  | { kind: 'menu' | 'delete'; record: SoberRestart }
  | null;

type RestartAction = { kind: 'save'; input: SoberRestartInput } | { kind: 'delete'; id: number };
export default function SoberDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const soberId = Number(id);
  const db = useSQLiteContext();
  const router = useRouter();
  const now = useCurrentMinute();
  const today = format(new Date(now), 'yyyy-MM-dd');
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const query = useQuery(soberQueries.byId(db, soberId));
  const restarts = useQuery(soberQueries.restarts(db, soberId));
  const [alert, setAlert] = useState<AlertContent | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const picker = overlay?.kind === 'restart' ? overlay : null;
  const menu = overlay?.kind === 'menu' ? overlay.record : null;
  const confirm = overlay?.kind === 'delete' ? overlay.record : null;
  const writing = useRef(false);
  const mutation = useRecordMutation(
    async (action: RestartAction) => {
      if (action.kind === 'save') await saveSoberRestart(db, action.input);
      else await deleteSoberRestart(db, action.id, soberId);
    },
    'sober',
    undefined,
    (error) => setAlert({ title: '기록을 처리하지 못했어요', message: error.message }),
  );
  usePreventRemove(mutation.isPending, () =>
    setAlert({ title: '잠시만 기다려주세요', message: '다시 시작 기록을 저장하고 있어요.' }),
  );
  const submit = (action: RestartAction) => {
    if (writing.current) return;
    writing.current = true;
    void mutation
      .mutateAsync(action)
      .catch(() => undefined)
      .finally(() => {
        writing.current = false;
      });
  };
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
  if (!sober || restarts.isPending || query.error || restarts.error)
    return (
      <BottomSheetPage title="거리두기 정보" backRoute="/sober">
        <QueryState query={query} />
        <QueryState query={restarts} />
        {!query.isPending && !query.error && !sober && (
          <Text className="px-6">거리두기 항목을 찾을 수 없어요.</Text>
        )}
      </BottomSheetPage>
    );
  const summary = getSoberSummary(sober, restarts.data ?? [], now);
  const firstDate = format(parseISO(sober.initial_started_at), 'yyyy-MM-dd');
  const newRecord = (date: string) => {
    const timestamp = new Date(Math.floor(Date.now() / 60000) * 60000);
    const [year, localMonth, day] = date.split('-').map(Number);
    timestamp.setFullYear(year, localMonth - 1, day);
    setOverlay({ kind: 'restart', value: timestamp.toISOString(), memo: '' });
  };
  return (
    <>
      <BottomSheetPage
        onBeforeClose={() => {
          if (!mutation.isPending) return true;
          setAlert({ title: '잠시만 기다려주세요', message: '다시 시작 기록을 저장하고 있어요.' });
          return false;
        }}
        title={sober.name}
        backRoute="/sober"
        menuAction={
          <SoberMenu
            sober={sober}
            disabled={mutation.isPending}
            onDeleted={() => router.dismissTo('/sober')}
          />
        }
      >
        <View className="gap-12">
          <View className="gap-5 items-center">
            <SoberGauge
              progress={summary.progress}
              goalDays={summary.goalDays}
              duration={summary.duration}
              start={summary.start}
              iconKey={sober.icon_key}
              iconColor={sober.icon_color}
            />
            <SoberStatisticsSummary
              summary={summary}
              initialStartedAt={sober.initial_started_at}
            />
            <Button
              labelWeight="normal"
              className="w-full"
              disabled={mutation.isPending}
              label="다시 시작하기"
              onPress={() => newRecord(today)}
            />
          </View>
          {!!sober.description && (
            <View className="gap-3">
              <Text accessibilityRole="header" className={SECTION_TITLE_CLASS_NAME}>
                나의 다짐
              </Text>
              <Text className={BODY_DESCRIPTION_CLASS_NAME}>{sober.description}</Text>
            </View>
          )}
          <SoberMonthCalendar
            month={month}
            selected={selected}
            today={today}
            firstDate={firstDate}
            recordsByDate={grouped}
            onMonthChange={setMonth}
            onSelect={(date) => {
              setSelected(date);
              setMonth(date.slice(0, 7));
              setOverlay({ kind: 'day' });
            }}
          />
          <SoberLongRecords records={summary.longRecords} />
        </View>
      </BottomSheetPage>
      <BottomSheetModal
        visible={overlay?.kind === 'day'}
        title={format(parseISO(selected), 'M월 d일 EEEE', { locale: ko })}
        onClose={() => setOverlay(null)}
      >
        {(close) => (
          <SoberDayInfo
            date={selected}
            records={grouped.get(selected) ?? []}
            pending={mutation.isPending}
            canAdd={selected >= firstDate && selected <= today}
            onAdd={() => close(() => newRecord(selected))}
            onMenu={(record) => close(() => setOverlay({ kind: 'menu', record }))}
          />
        )}
      </BottomSheetModal>
      {picker && (
        <DateTimePicker
          mode="restart"
          title={picker.id ? '다시 시작 기록 수정' : '다시 거리를 둘까요?'}
          description={
            picker.id
              ? undefined
              : format(parseISO(picker.value), 'yyyy-MM-dd') === today
                ? '선택한 시각부터 거리를 둔 시간을 새로 세어요.'
                : '다시 거리를 두기 시작한 시각과 그때의 마음을 남겨요.'
          }
          confirmLabel={picker.id ? '수정한 기록 저장하기' : '다시 시작 기록하기'}
          value={picker.value}
          memo={picker.memo}
          minTime={sober.initial_started_at}
          onClose={() => setOverlay(null)}
          onApply={(restarted_at, memo) =>
            submit({
              kind: 'save',
              input: { id: picker.id, sober_id: soberId, restarted_at, memo },
            })
          }
        />
      )}
      <BottomSheetModal
        visible={menu !== null}
        title="다시 시작 기록"
        onClose={() => setOverlay(null)}
      >
        {(close) => (
          <View className="gap-3">
            <PickerAction
              icon="edit"
              title="기록 수정하기"
              description="날짜와 시간, 메모를 바꿔요."
              onPress={() => {
                const record = menu;
                close(() => {
                  if (record)
                    setOverlay({
                      kind: 'restart',
                      id: record.id,
                      value: record.restarted_at,
                      memo: record.memo ?? '',
                    });
                });
              }}
            />
            <PickerAction
              icon="delete-outline"
              title="기록 삭제하기"
              description="이 시점의 다시 시작 기록을 삭제해요."
              danger
              onPress={() => {
                const record = menu;
                close(() => {
                  if (record) setOverlay({ kind: 'delete', record });
                });
              }}
            />
          </View>
        )}
      </BottomSheetModal>
      <ConfirmModal
        visible={confirm !== null}
        title="기록을 삭제하시겠어요?"
        message="이 다시 시작 기록과 메모가 삭제돼요. 삭제한 뒤에는 되돌릴 수 없어요."
        danger
        confirmLabel="삭제하기"
        onCancel={() => setOverlay(null)}
        onConfirm={() => {
          if (confirm) submit({ kind: 'delete', id: confirm.id });
          setOverlay(null);
        }}
      />
      <AlertModal
        visible={alert !== null}
        title={alert?.title ?? ''}
        message={alert?.message}
        onConfirm={() => setAlert(null)}
      />
    </>
  );
}
