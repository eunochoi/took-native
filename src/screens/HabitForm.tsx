import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useNotice } from '../components/NoticeProvider';
import { BottomSheetPage } from '../components/BottomSheetPage';
import { CharacterCount } from '../components/CharacterCount';
import { DateTimePicker } from '../components/DateTimePicker';
import { FormPickerRow } from '../components/FormPickerRow';
import { FormSubmitButton } from '../components/FormSubmitButton';
import { HabitIcon } from '../components/HabitIcon';
import { IconColorPicker } from '../components/IconColorPicker';
import { QueryState } from '../components/QueryState';
import { RecordFormLayout } from '../components/RecordFormLayout';
import { Text } from '../components/Text';
import { saveHabit } from '../db/habit';
import {
  DEFAULT_HABIT_ICON_COLOR,
  HABIT_ICON_COLORS,
  HABIT_ICON_OPTIONS,
  type HabitIconColorKey,
  type HabitIconKey,
} from '../domain/constants';
import { HABIT_NAME_MAX_LENGTH } from '../domain/limits';
import { habitQueries, useRecordMutation } from '../queries';
import { useAppTheme } from '../theme/AppThemeProvider';
import { FORM_TEXT_INPUT_CLASS_NAME, SECTION_TITLE_CLASS_NAME } from '../theme/classes';
import { HabitIconPicker } from './habit/HabitIconPicker';
import { HABIT_PRIORITY_LABELS, HabitPriorityPicker } from './habit/HabitPriorityPicker';
import { HabitStars } from './habit/HabitStars';

export function HabitForm({ id }: { id?: number }) {
  const { showNotice } = useNotice();
  const { colors, rem: appRem } = useAppTheme();
  const db = useSQLiteContext();
  const query = useQuery({ ...habitQueries.byId(db, id ?? 0), enabled: id !== undefined });
  const [name, setName] = useState('');
  const [priority, setPriority] = useState(0);
  const [icon, setIcon] = useState<HabitIconKey>('goal');
  const [iconColor, setIconColor] = useState<HabitIconColorKey>(DEFAULT_HABIT_ICON_COLOR);
  const [initialStartedAt, setInitialStartedAt] = useState(() =>
    new Date(Math.floor(Date.now() / 60000) * 60000).toISOString(),
  );
  const [picker, setPicker] = useState<'priority' | 'icon' | 'color' | 'date' | null>(null);
  const [saved, setSaved] = useState(false);
  const loaded = useRef(false);
  useEffect(() => {
    if (query.data && !loaded.current) {
      loaded.current = true;
      setName(query.data.name);
      setPriority(query.data.priority);
      setIcon(query.data.icon_key);
      setIconColor(query.data.icon_color);
      setInitialStartedAt(query.data.initial_started_at);
    }
  }, [query.data]);
  const mutation = useRecordMutation(
    () =>
      saveHabit(db, {
        id,
        name,
        priority,
        icon_key: icon,
        icon_color: iconColor,
        initial_started_at: initialStartedAt,
      }),
    'habit',
    () => setSaved(true),
    (error) => showNotice({ tone: 'error', title: '처리하지 못했어요', message: error.message }),
  );
  usePreventRemove(mutation.isPending, () =>
    showNotice({
      tone: 'info',
      title: '잠시만 기다려주세요',
      message: '저장이 진행 중입니다. 완료될 때까지 기다려주세요.',
    }),
  );
  const title = id ? '습관 항목 수정' : '습관 항목 추가';
  const iconLabel = HABIT_ICON_OPTIONS.find((option) => option.key === icon)?.label ?? '아이콘';
  const colorLabel = iconColor === 'theme' ? '기본 테마색' : HABIT_ICON_COLORS[iconColor].label;
  const onClosed = saved
    ? () =>
        showNotice({
          tone: 'success',
          title: id ? '습관을 수정했어요' : '습관을 추가했어요',
        })
    : undefined;
  if (id !== undefined && (query.isPending || query.error || !query.data || !loaded.current))
    return (
      <BottomSheetPage
        closeRequested={saved && !mutation.isPending}
        onClosed={onClosed}
        backRoute="/habit"
        title={title}
      >
        <QueryState query={query} />
        {!query.isPending && !query.error && <Text className="px-6">습관을 찾을 수 없습니다.</Text>}
      </BottomSheetPage>
    );
  return (
    <RecordFormLayout
      closeRequested={saved && !mutation.isPending}
      onClosed={onClosed}
      title={title}
      backRoute="/habit"
      onBeforeClose={() => {
        if (!mutation.isPending) return true;
        showNotice({
          tone: 'info',
          title: '잠시만 기다려주세요',
          message: '저장이 진행 중입니다. 완료될 때까지 기다려주세요.',
        });
        return false;
      }}
      footer={
        <FormSubmitButton
          loading={mutation.isPending}
          disabled={!name.trim() || mutation.isPending}
          onPress={() => mutation.mutate(undefined)}
          label={mutation.isPending ? '저장 중...' : id ? '수정한 습관 저장하기' : '습관 저장하기'}
        />
      }
      overlays={
        <>
          {picker === 'priority' && (
            <HabitPriorityPicker
              value={priority}
              onClose={() => setPicker(null)}
              onApply={setPriority}
            />
          )}
          {picker === 'icon' && (
            <HabitIconPicker
              value={icon}
              colorKey={iconColor}
              onClose={() => setPicker(null)}
              onApply={setIcon}
            />
          )}
          {picker === 'color' && (
            <IconColorPicker
              value={iconColor}
              onClose={() => setPicker(null)}
              onApply={setIconColor}
            />
          )}
          {picker === 'date' && id === undefined && (
            <DateTimePicker
              mode="start"
              title="언제부터 습관을 시작했나요?"
              value={initialStartedAt}
              onClose={() => setPicker(null)}
              onApply={setInitialStartedAt}
            />
          )}
        </>
      }
    >
      <View className="gap-3">
        <Text accessibilityRole="header" className={SECTION_TITLE_CLASS_NAME}>
          습관 이름
        </Text>
        <View className="gap-3 px-2">
          <TextInput
            accessibilityLabel="습관 이름"
            value={name}
            onChangeText={setName}
            maxLength={HABIT_NAME_MAX_LENGTH}
            editable={!mutation.isPending}
            placeholder="매일 물 마시기"
            placeholderTextColor={colors.textTertiary}
            className={`min-h-12 ${FORM_TEXT_INPUT_CLASS_NAME}`}
          />
          <CharacterCount length={name.length} maxLength={HABIT_NAME_MAX_LENGTH} />
        </View>
      </View>
      <View className="gap-3">
        <Text accessibilityRole="header" className={SECTION_TITLE_CLASS_NAME}>
          우선순위
        </Text>
        <FormPickerRow
          label={HABIT_PRIORITY_LABELS[priority]}
          accessibilityLabel="우선순위 선택"
          disabled={mutation.isPending}
          onPress={() => setPicker('priority')}
          leading={<HabitStars priority={priority} size={appRem * 1.25} />}
        />
      </View>
      <View className="gap-3">
        <Text accessibilityRole="header" className={SECTION_TITLE_CLASS_NAME}>
          아이콘
        </Text>
        <FormPickerRow
          label={iconLabel}
          accessibilityLabel="아이콘 선택"
          disabled={mutation.isPending}
          onPress={() => setPicker('icon')}
          leading={<HabitIcon name={icon} colorKey={iconColor} size={appRem * 1.75} />}
        />
      </View>
      <View className="gap-3">
        <Text accessibilityRole="header" className={SECTION_TITLE_CLASS_NAME}>
          아이콘 색상
        </Text>
        <FormPickerRow
          label={colorLabel}
          accessibilityLabel="아이콘 색상 선택"
          disabled={mutation.isPending}
          onPress={() => setPicker('color')}
          leading={
            <View
              className="h-6 w-6 rounded-full"
              style={{
                backgroundColor:
                  iconColor === 'theme' ? colors.accent : HABIT_ICON_COLORS[iconColor].value,
              }}
            />
          }
        />
      </View>
      <View className="gap-3">
        <Text accessibilityRole="header" className={SECTION_TITLE_CLASS_NAME}>
          시작 일시
        </Text>
        <FormPickerRow
          label={format(parseISO(initialStartedAt), 'yyyy년 M월 d일 HH:mm')}
          accessibilityLabel="시작 일시 선택"
          disabled={id !== undefined || mutation.isPending}
          onPress={() => setPicker('date')}
        />
        <Text className="px-2 text-sm text-theme-accent">
          시작 일시는 저장 후 변경할 수 없어요.
        </Text>
      </View>
    </RecordFormLayout>
  );
}
