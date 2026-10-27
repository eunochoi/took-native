import { translateErrorMessage } from '../../i18n/errors';
import { useI18n } from '../../i18n/react';
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
import { dateTimeDraft, isDate, parseDateTime } from '../../domain/date';
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
  const { t, language } = useI18n();

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
      showNotice({ tone: 'error', title: t('sober.recordFailed'), message: failure.message });
    },
  );
  const busy = mutation.isPending || saved;
  const notifySaving = () =>
    showNotice({
      tone: 'info',
      title: t('sober.wait'),
      message: t('sober.savingRestart'),
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
          title: editing ? t('sober.restartEdited') : t('sober.restartAdded'),
        })
    : undefined;
  const title = editing ? t('sober.restartEdit') : t('sober.restartAdd');
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
          <Text className="text-center text-base">{t('sober.checkItemDate')}</Text>
        )}
        {validParams &&
          editing &&
          !!sober.data &&
          !records.isPending &&
          !records.error &&
          !record && <Text className="text-center text-base">{t('sober.restartNotFound')}</Text>}
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
          label={editing ? t('diary.saveEdited') : t('sober.recordRestart')}
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
              setError(failure instanceof Error ? failure.message : t('common.retryMessage'));
            }
          }}
        />
      }
    >
      <View className="gap-5">
        <DateTimeFields
          compactCalendar
          draft={draft}
          minTime={item.initial_started_at}
          disabled={busy}
          onChange={(value) => {
            if (saving.current || busy) return;
            setDraft(value);
            setError('');
          }}
        />
        <View className="gap-2">
          <Text className="text-base font-normal">{t('sober.noteOptional')}</Text>
          <TextInput
            accessibilityLabel={t('sober.note')}
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
            placeholder={t('sober.notePlaceholder')}
            placeholderTextColor={colors.textTertiary}
            className="h-28 ios:curve-continuous rounded-2xl bg-transparent border border-theme-border p-4 text-base text-theme-text-primary font-normal"
          />
          <CharacterCount length={memo.length} maxLength={SOBER_MEMO_MAX_LENGTH} />
        </View>
        {!!error && (
          <Text accessibilityRole="alert" className="text-sm text-theme-danger">
            {translateErrorMessage(error, language)}
          </Text>
        )}
      </View>
    </BottomSheetPage>
  );
}
