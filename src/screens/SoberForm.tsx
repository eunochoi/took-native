import { SECTION_TITLE_CLASS_NAME, FORM_TEXT_INPUT_CLASS_NAME } from '../theme/classes';
import { CharacterCount } from '../components/CharacterCount';
import { RecordFormLayout } from '../components/RecordFormLayout';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Switch, TextInput, View } from 'react-native';
import { AlertModal, type AlertContent } from '../components/AlertModal';
import { Button } from '../components/Button';
import { FormPickerRow } from '../components/FormPickerRow';
import { IconColorPicker } from '../components/IconColorPicker';
import { QueryState } from '../components/QueryState';
import { BottomSheetPage } from '../components/BottomSheetPage';
import { SoberIcon } from '../components/SoberIcon';
import { Text } from '../components/Text';
import { saveSober } from '../db/sober';
import { DEFAULT_HABIT_ICON_COLOR, HABIT_ICON_COLORS } from '../domain/constants';
import { SOBER_DESCRIPTION_MAX_LENGTH, SOBER_NAME_MAX_LENGTH } from '../domain/limits';
import { formatSoberGoal, SOBER_ICONS, type SoberInput } from '../domain/sober';
import { soberQueries, useRecordMutation } from '../queries';
import { useAppTheme } from '../theme/AppThemeProvider';
import { DateTimePicker } from '../components/DateTimePicker';
import { SoberGoalPicker } from './sober/SoberGoalPicker';
import { SoberIconPicker } from './sober/SoberIconPicker';

export function SoberForm({ id }: { id?: number }) {
  const db = useSQLiteContext();
  const { colors, rem: appRem } = useAppTheme();
  const query = useQuery({ ...soberQueries.byId(db, id ?? 0), enabled: id !== undefined });
  const [draft, setDraft] = useState<SoberInput>(() => ({
    id,
    name: '',
    description: null,
    icon_key: 'favorite',
    icon_color: DEFAULT_HABIT_ICON_COLOR,
    is_priority: 0,
    initial_started_at: new Date(Math.floor(Date.now() / 60000) * 60000).toISOString(),
    goal_mode: 'AUTO',
    goal_days: null,
  }));
  const [loaded, setLoaded] = useState(false);
  const [picker, setPicker] = useState<'goal' | 'date' | 'icon' | 'color' | null>(null);
  const [alert, setAlert] = useState<AlertContent | null>(null);
  const [saved, setSaved] = useState(false);
  const saving = useRef(false);
  useEffect(() => {
    if (query.data && !loaded) {
      setDraft(query.data);
      setLoaded(true);
    }
  }, [query.data, loaded]);
  const mutation = useRecordMutation(
    () => saveSober(db, draft),
    'sober',
    () => setSaved(true),
    (error) => setAlert({ title: '저장하지 못했어요', message: error.message }),
  );
  usePreventRemove(mutation.isPending, () =>
    setAlert({ title: '잠시만 기다려주세요', message: '거리두기 항목을 저장하고 있어요.' }),
  );
  const title = id ? '거리두기 수정' : '거리두기 추가';
  if (id !== undefined && (query.isPending || query.error || !query.data || !loaded))
    return (
      <BottomSheetPage
        closeRequested={saved && !mutation.isPending}
        backRoute="/sober"
        title={title}
      >
        <QueryState query={query} />
        {!query.isPending && !query.error && (
          <Text className="px-6">거리두기 항목을 찾을 수 없어요.</Text>
        )}
      </BottomSheetPage>
    );
  return (
    <RecordFormLayout
      closeRequested={saved && !mutation.isPending}
      title={title}
      backRoute="/sober"
      onBeforeClose={() => {
        if (!mutation.isPending) return true;
        setAlert({
          title: '잠시만 기다려주세요',
          message: '저장이 진행 중입니다. 완료될 때까지 기다려주세요.',
        });
        return false;
      }}
      footer={
        <>
          {mutation.isPending && <ActivityIndicator color={colors.accent} />}
          <Button
            label={mutation.isPending ? '저장 중...' : id ? '변경사항 저장하기' : '저장하기'}
            disabled={!draft.name.trim() || mutation.isPending}
            onPress={() => {
              if (saving.current) return;
              saving.current = true;
              void mutation
                .mutateAsync(undefined)
                .catch(() => undefined)
                .finally(() => {
                  saving.current = false;
                });
            }}
          />
        </>
      }
      overlays={
        <>
          {picker === 'goal' && (
            <SoberGoalPicker
              mode={draft.goal_mode}
              days={draft.goal_days}
              onClose={() => setPicker(null)}
              onApply={(goal_mode, goal_days) => setDraft({ ...draft, goal_mode, goal_days })}
            />
          )}
          {picker === 'date' && id === undefined && (
            <DateTimePicker
              mode="start"
              title="언제부터 거리를 두기 시작했나요?"
              value={draft.initial_started_at}
              onClose={() => setPicker(null)}
              onApply={(initial_started_at) => setDraft({ ...draft, initial_started_at })}
            />
          )}
          {picker === 'icon' && (
            <SoberIconPicker
              value={draft.icon_key}
              colorKey={draft.icon_color}
              onClose={() => setPicker(null)}
              onApply={(icon_key) => setDraft({ ...draft, icon_key })}
            />
          )}
          {picker === 'color' && (
            <IconColorPicker
              value={draft.icon_color}
              onClose={() => setPicker(null)}
              onApply={(icon_color) => setDraft({ ...draft, icon_color })}
            />
          )}
          <AlertModal
            visible={alert !== null}
            title={alert?.title ?? ''}
            message={alert?.message}
            onConfirm={() => setAlert(null)}
          />
        </>
      }
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text className={SECTION_TITLE_CLASS_NAME}>중요 항목으로 저장</Text>
        <Switch
          accessibilityLabel="중요 항목으로 저장"
          disabled={mutation.isPending}
          value={draft.is_priority === 1}
          onValueChange={(value) => setDraft({ ...draft, is_priority: value ? 1 : 0 })}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={colors.surface}
        />
      </View>
      <View className="gap-3">
        <Text accessibilityRole="header" className={SECTION_TITLE_CLASS_NAME}>
          거리를 두고 싶은 것
        </Text>
        <View className="gap-3 px-2">
          <TextInput
            accessibilityLabel="거리두기 항목 이름"
            value={draft.name}
            onChangeText={(name) => setDraft({ ...draft, name })}
            editable={!mutation.isPending}
            maxLength={SOBER_NAME_MAX_LENGTH}
            placeholder="예: 야식, 쇼츠, 커피"
            placeholderTextColor={colors.textTertiary}
            className={`min-h-12 ${FORM_TEXT_INPUT_CLASS_NAME}`}
          />
          <CharacterCount length={draft.name.length} maxLength={SOBER_NAME_MAX_LENGTH} />
        </View>
      </View>
      <View className="gap-3">
        <Text accessibilityRole="header" className={SECTION_TITLE_CLASS_NAME}>
          아이콘
        </Text>
        <FormPickerRow
          label={SOBER_ICONS[draft.icon_key].label}
          accessibilityLabel="아이콘 선택"
          disabled={mutation.isPending}
          onPress={() => setPicker('icon')}
          leading={
            <SoberIcon name={draft.icon_key} colorKey={draft.icon_color} size={appRem * 1.75} />
          }
        />
      </View>
      <View className="gap-3">
        <Text accessibilityRole="header" className={SECTION_TITLE_CLASS_NAME}>
          아이콘 색상
        </Text>
        <FormPickerRow
          label={
            draft.icon_color === 'theme' ? '기본 테마색' : HABIT_ICON_COLORS[draft.icon_color].label
          }
          accessibilityLabel="아이콘 색상 선택"
          disabled={mutation.isPending}
          onPress={() => setPicker('color')}
          leading={
            <View
              className="h-6 w-6 rounded-full"
              style={{
                backgroundColor:
                  draft.icon_color === 'theme'
                    ? colors.accent
                    : HABIT_ICON_COLORS[draft.icon_color].value,
              }}
            />
          }
        />
      </View>
      <View className="gap-3">
        <Text accessibilityRole="header" className={SECTION_TITLE_CLASS_NAME}>
          거리두기 목표
        </Text>
        <FormPickerRow
          label={draft.goal_mode === 'AUTO' ? '자동 목표' : formatSoberGoal(draft.goal_days!)}
          accessibilityLabel="목표 선택"
          disabled={mutation.isPending}
          onPress={() => setPicker('goal')}
        />
      </View>
      <View className="gap-3">
        <Text accessibilityRole="header" className={SECTION_TITLE_CLASS_NAME}>
          시작 일시
        </Text>
        <FormPickerRow
          label={format(parseISO(draft.initial_started_at), 'yyyy년 M월 d일 HH:mm')}
          accessibilityLabel="시작 일시 선택"
          disabled={id !== undefined || mutation.isPending}
          onPress={() => setPicker('date')}
        />
        <Text className="px-2 text-sm text-theme-accent">
          시작 일시는 저장 후 변경할 수 없어요.
        </Text>
      </View>
      <View className="gap-3">
        <Text accessibilityRole="header" className={SECTION_TITLE_CLASS_NAME}>
          나의 다짐 (선택)
        </Text>
        <View className="gap-3 px-2">
          <TextInput
            accessibilityLabel="나의 다짐"
            value={draft.description ?? ''}
            onChangeText={(description) => setDraft({ ...draft, description })}
            editable={!mutation.isPending}
            maxLength={SOBER_DESCRIPTION_MAX_LENGTH}
            multiline
            scrollEnabled
            textAlignVertical="top"
            placeholder="밤에는 속을 편하게 하기"
            placeholderTextColor={colors.textTertiary}
            className={`h-28 ${FORM_TEXT_INPUT_CLASS_NAME}`}
          />
          <CharacterCount
            length={draft.description?.length ?? 0}
            maxLength={SOBER_DESCRIPTION_MAX_LENGTH}
          />
        </View>
      </View>
    </RecordFormLayout>
  );
}
