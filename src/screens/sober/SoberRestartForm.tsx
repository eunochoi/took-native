import { useQuery } from '@tanstack/react-query';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { BottomSheetPage } from '../../components/BottomSheetPage';
import { Button } from '../../components/Button';
import { CharacterCount } from '../../components/CharacterCount';
import { DateTimeFields } from '../../components/DateTimeFields';
import { useNotice } from '../../components/NoticeProvider';
import { QueryState } from '../../components/QueryState';
import { Text } from '../../components/Text';
import { saveSoberRestart } from '../../db/sober';
import { dateTimeDraft, isDate, parseDateTime, todayString } from '../../domain/date';
import { SOBER_MEMO_MAX_LENGTH } from '../../domain/limits';
import { validateSoberRestart } from '../../domain/sober';
import { soberQueries, useRecordMutation } from '../../queries';
import { useAppTheme } from '../../theme/AppThemeProvider';

export function SoberRestartForm({
  soberId,
  restartId,
  initialDate,
}: {
  soberId: number;
  restartId?: number;
  initialDate?: string | string[];
}) {
  const db = useSQLiteContext();
  const { colors } = useAppTheme();
  const { showNotice } = useNotice();
  const editing = restartId !== undefined;
  const validId = Number.isSafeInteger(soberId) && soberId > 0;
  const validParams =
    validId &&
    (!editing || (Number.isSafeInteger(restartId) && restartId! > 0)) &&
    (initialDate === undefined || isDate(initialDate));
  const sober = useQuery({ ...soberQueries.byId(db, soberId), enabled: validParams });
  const records = useQuery({
    ...soberQueries.restarts(db, soberId),
    enabled: validParams && editing && !!sober.data,
  });
  const record = records.data?.find((item) => item.id === restartId && item.sober_id === soberId);
  const [draft, setDraft] = useState(() => {
    const timestamp = new Date(Math.floor(Date.now() / 60000) * 60000);
    if (isDate(initialDate)) {
      const [year, month, day] = initialDate.split('-').map(Number);
      timestamp.setFullYear(year, month - 1, day);
    }
    return dateTimeDraft(timestamp.toISOString());
  });
  const [memo, setMemo] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  useEffect(() => {
    if (record && !loaded) {
      setDraft(dateTimeDraft(record.restarted_at));
      setMemo(record.memo ?? '');
      setLoaded(true);
    }
  }, [record, loaded]);
  const mutation = useRecordMutation(
    (input: { restarted_at: string; memo: string | null }) =>
      saveSoberRestart(db, { id: restartId, sober_id: soberId, ...input }),
    'sober',
    () => {
      saving.current = false;
      setSaved(true);
    },
    (failure) => {
      setError(failure.message);
      showNotice({ tone: 'error', title: '기록을 처리하지 못했어요', message: failure.message });
    },
  );
  const busy = mutation.isPending || saved;
  const notifySaving = () =>
    showNotice({
      tone: 'info',
      title: '잠시만 기다려주세요',
      message: '다시 시작 기록을 저장하고 있어요.',
    });
  usePreventRemove(mutation.isPending, notifySaving);
  const onBeforeClose = () => {
    if (!saving.current && !mutation.isPending) return true;
    notifySaving();
    return false;
  };
  const onClosed = saved
    ? () =>
        showNotice({
          tone: 'success',
          title: editing ? '다시 시작 기록을 수정했어요' : '다시 시작 기록을 추가했어요',
        })
    : undefined;
  const title = editing ? '다시 시작 기록 수정' : '다시 거리를 둘까요?';
  const backRoute =
    !validId || (!sober.isPending && !sober.data)
      ? '/sober'
      : !editing && isDate(initialDate)
        ? (`/sober/${soberId}/day/${initialDate}` as const)
        : (`/sober/${soberId}` as const);
  if (
    !validParams ||
    !sober.data ||
    sober.error ||
    (editing && (!record || !loaded || records.error))
  )
    return (
      <BottomSheetPage
        title={title}
        backRoute={backRoute}
        closeRequested={saved && !mutation.isPending}
        onBeforeClose={onBeforeClose}
        onClosed={onClosed}
      >
        {validParams && <QueryState query={sober} />}
        {validParams && editing && !!sober.data && <QueryState query={records} />}
        {(!validParams || (!sober.isPending && !sober.error && !sober.data)) && (
          <Text className="text-center text-base">거리두기 항목이나 날짜를 확인해주세요.</Text>
        )}
        {validParams &&
          editing &&
          !!sober.data &&
          !records.isPending &&
          !records.error &&
          !record && (
            <Text className="text-center text-base">다시 시작 기록을 찾을 수 없어요.</Text>
          )}
      </BottomSheetPage>
    );
  const item = sober.data;
  return (
    <BottomSheetPage
      title={title}
      backRoute={backRoute}
      closeRequested={saved && !mutation.isPending}
      onClosed={onClosed}
      onBeforeClose={onBeforeClose}
      footer={
        <Button
          labelWeight="normal"
          label={editing ? '수정한 기록 저장하기' : '다시 시작 기록하기'}
          disabled={busy}
          onPress={() => {
            if (saving.current || busy) return;
            try {
              const input = {
                restarted_at: parseDateTime(draft, Date.now()),
                memo: memo.trim() || null,
              };
              validateSoberRestart(
                { sober_id: soberId, ...input },
                item.initial_started_at,
                Date.now(),
              );
              setError('');
              saving.current = true;
              void mutation
                .mutateAsync(input)
                .catch(() => undefined)
                .finally(() => {
                  saving.current = false;
                });
            } catch (failure) {
              setError(failure instanceof Error ? failure.message : '다시 시도해주세요.');
            }
          }}
        />
      }
    >
      <View className="gap-5">
        {!editing && (
          <Text className="text-center text-sm leading-relaxed text-theme-text-secondary mb-2">
            {(initialDate ?? todayString()) === todayString()
              ? '선택한 시각부터 거리를 둔 시간을 새로 세어요.'
              : '다시 거리를 두기 시작한 시각과 그때의 마음을 남겨요.'}
          </Text>
        )}
        <DateTimeFields
          draft={draft}
          minTime={item.initial_started_at}
          collapsible
          disabled={busy}
          onChange={(value) => {
            if (saving.current || busy) return;
            setDraft(value);
            setError('');
          }}
        />
        <View className="gap-2">
          <Text className="text-base font-normal">메모 (선택)</Text>
          <TextInput
            accessibilityLabel="다시 시작 메모"
            value={memo}
            editable={!busy}
            onChangeText={(value) => {
              if (saving.current || busy) return;
              setMemo(value);
              setError('');
            }}
            multiline
            scrollEnabled
            maxLength={SOBER_MEMO_MAX_LENGTH}
            textAlignVertical="top"
            placeholder="다시 거리를 두고 싶은 이유나 지금의 마음을 남겨보세요."
            placeholderTextColor={colors.textTertiary}
            className="h-28 rounded-2xl bg-transparent border border-theme-border p-4 text-base text-theme-text-primary font-normal"
          />
          <CharacterCount length={memo.length} maxLength={SOBER_MEMO_MAX_LENGTH} />
        </View>
        {!!error && (
          <Text accessibilityRole="alert" className="text-sm text-theme-danger">
            {error}
          </Text>
        )}
      </View>
    </BottomSheetPage>
  );
}
