import { formatDisplayDate } from '../i18n/format';
import { useI18n } from '../i18n/react';
import { useQuery } from '@tanstack/react-query';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { BottomSheetPage } from '../components/BottomSheetPage';
import { CharacterCount } from '../components/CharacterCount';
import { DateTimePicker } from '../components/DateTimePicker';
import { FormPickerRow } from '../components/FormPickerRow';
import { FormSubmitButton } from '../components/FormSubmitButton';
import { HabitIcon } from '../components/HabitIcon';
import { IconColorPicker } from '../components/IconColorPicker';
import { InfoNotice } from '../components/InfoNotice';
import { useNotice } from '../components/NoticeProvider';
import { QueryState } from '../components/QueryState';
import { RecordFormLayout } from '../components/RecordFormLayout';
import { Text } from '../components/Text';
import { saveHabit } from '../db/habit';
import {
  DEFAULT_HABIT_ICON_COLOR,
  HABIT_ICON_COLORS,
  type HabitIconColorKey,
  type HabitIconKey,
} from '../domain/constants';
import { HABIT_NAME_MAX_LENGTH } from '../domain/limits';
import { habitQueries, useRecordMutation } from '../queries';
import { useAppTheme } from '../theme/AppThemeProvider';
import { FORM_TEXT_INPUT_CLASS_NAME, SECTION_TITLE_CLASS_NAME } from '../theme/classes';
import { adjustColorBrightness } from '../theme/colors';
import { HabitIconPicker } from './habit/HabitIconPicker';
import { HabitPriorityPicker } from './habit/HabitPriorityPicker';
import { HabitStars } from './habit/HabitStars';

export function HabitForm({ id }: { id?: number }) {
  const { t, formatLocale } = useI18n();
  const priorityLabels = [t('habit.free'), t('habit.low'), t('habit.normal'), t('habit.high')];

  const { showNotice } = useNotice();
  const { colors, rem: appRem } = useAppTheme();
  const db = useSQLiteContext();
  const query = useQuery({ ...habitQueries.byId(db, id ?? 0), enabled: id !== undefined });
  const [name, setName] = useState('');
  const [priority, setPriority] = useState(1);
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
    (error) =>
      showNotice({ tone: 'error', title: t('habit.processFailed'), message: error.message }),
  );
  usePreventRemove(mutation.isPending, () =>
    showNotice({
      tone: 'info',
      title: t('habit.wait'),
      message: t('habit.savingHint'),
    }),
  );
  const iconBackgroundColor =
    iconColor === 'theme' ? colors.accent : HABIT_ICON_COLORS[iconColor].value;
  const title = id ? t('habit.editTitle') : t('habit.addTitle');
  const iconLabel = t(`habitIcons.${icon}`);
  const colorLabel =
    iconColor === 'theme' ? t('habit.defaultThemeColor') : t(`iconColors.${iconColor}`);
  const onClosed = saved
    ? () =>
        showNotice({
          tone: 'success',
          title: id ? t('habit.edited') : t('habit.added'),
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
        {!query.isPending && !query.error && <Text className="px-6">{t('habit.notFound')}</Text>}
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
          title: t('habit.wait'),
          message: t('habit.savingHint'),
        });
        return false;
      }}
      footer={
        <FormSubmitButton
          loading={mutation.isPending}
          disabled={!name.trim() || mutation.isPending}
          onPress={() => mutation.mutate(undefined)}
          label={
            mutation.isPending ? t('habit.saving') : id ? t('habit.saveEdited') : t('habit.save')
          }
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
              title={t('habit.whenStart')}
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
          {t('habit.name')}
        </Text>
        <View className="gap-3 px-1">
          <TextInput
            accessibilityLabel={t('habit.name')}
            value={name}
            onChangeText={setName}
            maxLength={HABIT_NAME_MAX_LENGTH}
            editable={!mutation.isPending}
            placeholder={t('habit.namePlaceholder')}
            placeholderTextColor={colors.textTertiary}
            className={`min-h-12 ${FORM_TEXT_INPUT_CLASS_NAME}`}
          />
          <CharacterCount length={name.length} maxLength={HABIT_NAME_MAX_LENGTH} />
        </View>
      </View>
      <View className="gap-3">
        <Text accessibilityRole="header" className={SECTION_TITLE_CLASS_NAME}>
          {t('habit.priority')}
        </Text>
        <FormPickerRow
          label={
            priority === 0
              ? t('habit.freeLabel')
              : t('habit.priorityDaily', { value: priorityLabels[priority] })
          }
          accessibilityLabel={t('habit.priorityChoice')}
          disabled={mutation.isPending}
          onPress={() => setPicker('priority')}
          leading={<HabitStars priority={priority} size={appRem * 1.25} />}
        />
        {priority === 0 && <InfoNotice>{t('habit.freeNotice')}</InfoNotice>}
      </View>
      <View className="gap-3">
        <Text accessibilityRole="header" className={SECTION_TITLE_CLASS_NAME}>
          {t('habit.icon')}
        </Text>
        <FormPickerRow
          label={iconLabel}
          accessibilityLabel={t('habit.chooseIcon')}
          disabled={mutation.isPending}
          onPress={() => setPicker('icon')}
          leading={<HabitIcon name={icon} colorKey={iconColor} size={appRem * 1.75} />}
        />
      </View>
      <View className="gap-3">
        <Text accessibilityRole="header" className={SECTION_TITLE_CLASS_NAME}>
          {t('habit.iconColor')}
        </Text>
        <FormPickerRow
          label={colorLabel}
          accessibilityLabel={t('habit.chooseIconColor')}
          disabled={mutation.isPending}
          onPress={() => setPicker('color')}
          leading={
            <View
              className="h-6 w-6 ios:curve-continuous rounded-full border"
              style={{
                backgroundColor: iconBackgroundColor,
                borderColor: adjustColorBrightness(iconBackgroundColor, -0.1),
              }}
            />
          }
        />
      </View>
      <View className="gap-3">
        <Text accessibilityRole="header" className={SECTION_TITLE_CLASS_NAME}>
          {t('habit.startedAt')}
        </Text>
        <FormPickerRow
          label={formatDisplayDate(initialStartedAt, formatLocale, 'dateTime')}
          accessibilityLabel={t('habit.chooseStartedAt')}
          disabled={id !== undefined || mutation.isPending}
          onPress={() => setPicker('date')}
        />
        <InfoNotice>{t('habit.startedNotice')}</InfoNotice>
      </View>
    </RecordFormLayout>
  );
}
