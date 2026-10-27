import { formatDisplayDate } from '../i18n/format';
import { formatSoberGoal } from '../i18n/sober';
import { useI18n } from '../i18n/react';
import { useQuery } from '@tanstack/react-query';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Switch, TextInput, View } from 'react-native';
import { BottomSheetPage } from '../components/BottomSheetPage';
import { Button } from '../components/Button';
import { CharacterCount } from '../components/CharacterCount';
import { DateTimePicker } from '../components/DateTimePicker';
import { FormPickerRow } from '../components/FormPickerRow';
import { IconColorPicker } from '../components/IconColorPicker';
import { InfoNotice } from '../components/InfoNotice';
import { useNotice } from '../components/NoticeProvider';
import { QueryState } from '../components/QueryState';
import { RecordFormLayout } from '../components/RecordFormLayout';
import { SoberIcon } from '../components/SoberIcon';
import { Text } from '../components/Text';
import { saveSober } from '../db/sober';
import { DEFAULT_HABIT_ICON_COLOR, HABIT_ICON_COLORS } from '../domain/constants';
import { SOBER_DESCRIPTION_MAX_LENGTH, SOBER_NAME_MAX_LENGTH } from '../domain/limits';
import type { SoberInput } from '../domain/sober';
import { soberQueries, useRecordMutation } from '../queries';
import { useAppTheme } from '../theme/AppThemeProvider';
import { FORM_TEXT_INPUT_CLASS_NAME, SECTION_TITLE_CLASS_NAME } from '../theme/classes';
import { adjustColorBrightness } from '../theme/colors';
import { SoberGoalPicker } from './sober/SoberGoalPicker';
import { SoberIconPicker } from './sober/SoberIconPicker';

export function SoberForm({ id }: { id?: number }) {
  const { t, language, formatLocale } = useI18n();

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
  const { showNotice } = useNotice();
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
    (error) => showNotice({ tone: 'error', title: t('sober.saveFailed'), message: error.message }),
  );
  usePreventRemove(mutation.isPending, () =>
    showNotice({
      tone: 'info',
      title: t('sober.wait'),
      message: t('sober.savingHint'),
    }),
  );
  const iconBackgroundColor =
    draft.icon_color === 'theme' ? colors.accent : HABIT_ICON_COLORS[draft.icon_color].value;
  const title = id ? t('sober.edit') : t('sober.add');
  const onClosed = saved
    ? () =>
        showNotice({
          tone: 'success',
          title: id ? t('sober.edited') : t('sober.saved'),
        })
    : undefined;
  if (id !== undefined && (query.isPending || query.error || !query.data || !loaded))
    return (
      <BottomSheetPage
        closeRequested={saved && !mutation.isPending}
        onClosed={onClosed}
        backRoute="/sober"
        title={title}
      >
        <QueryState query={query} />
        {!query.isPending && !query.error && <Text className="px-6">{t('sober.notFound')}</Text>}
      </BottomSheetPage>
    );
  return (
    <RecordFormLayout
      closeRequested={saved && !mutation.isPending}
      onClosed={onClosed}
      title={title}
      backRoute="/sober"
      onBeforeClose={() => {
        if (!mutation.isPending) return true;
        showNotice({
          tone: 'info',
          title: t('sober.wait'),
          message: t('habit.savingHint'),
        });
        return false;
      }}
      footer={
        <>
          {mutation.isPending && <ActivityIndicator color={colors.accent} />}
          <Button
            label={
              mutation.isPending ? t('habit.saving') : id ? t('sober.saveChanges') : t('sober.save')
            }
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
              title={t('sober.whenStart')}
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
        </>
      }
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text className={SECTION_TITLE_CLASS_NAME}>{t('sober.important')}</Text>
        <Switch
          accessibilityLabel={t('sober.important')}
          disabled={mutation.isPending}
          value={draft.is_priority === 1}
          onValueChange={(value) => setDraft({ ...draft, is_priority: value ? 1 : 0 })}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={colors.surface}
        />
      </View>
      <View className="gap-3">
        <Text accessibilityRole="header" className={SECTION_TITLE_CLASS_NAME}>
          {t('sober.nameTitle')}
        </Text>
        <View className="gap-3 px-1">
          <TextInput
            accessibilityLabel={t('sober.nameInput')}
            value={draft.name}
            onChangeText={(name) => setDraft({ ...draft, name })}
            editable={!mutation.isPending}
            maxLength={SOBER_NAME_MAX_LENGTH}
            placeholder={t('sober.namePlaceholder')}
            placeholderTextColor={colors.textTertiary}
            className={`min-h-12 ${FORM_TEXT_INPUT_CLASS_NAME}`}
          />
          <CharacterCount length={draft.name.length} maxLength={SOBER_NAME_MAX_LENGTH} />
        </View>
      </View>
      <View className="gap-3">
        <Text accessibilityRole="header" className={SECTION_TITLE_CLASS_NAME}>
          {t('habit.icon')}
        </Text>
        <FormPickerRow
          label={t(`soberIcons.${draft.icon_key}`)}
          accessibilityLabel={t('habit.chooseIcon')}
          disabled={mutation.isPending}
          onPress={() => setPicker('icon')}
          leading={
            <SoberIcon name={draft.icon_key} colorKey={draft.icon_color} size={appRem * 1.75} />
          }
        />
      </View>
      <View className="gap-3">
        <Text accessibilityRole="header" className={SECTION_TITLE_CLASS_NAME}>
          {t('habit.iconColor')}
        </Text>
        <FormPickerRow
          label={
            draft.icon_color === 'theme'
              ? t('habit.defaultThemeColor')
              : t(`iconColors.${draft.icon_color}`)
          }
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
          {t('sober.goal')}
        </Text>
        <FormPickerRow
          label={
            draft.goal_mode === 'AUTO'
              ? t('sober.autoGoal')
              : formatSoberGoal(draft.goal_days!, language)
          }
          accessibilityLabel={t('sober.chooseGoal')}
          disabled={mutation.isPending}
          onPress={() => setPicker('goal')}
        />
      </View>
      <View className="gap-3">
        <Text accessibilityRole="header" className={SECTION_TITLE_CLASS_NAME}>
          {t('habit.startedAt')}
        </Text>
        <FormPickerRow
          label={formatDisplayDate(draft.initial_started_at, formatLocale, 'dateTime')}
          accessibilityLabel={t('habit.chooseStartedAt')}
          disabled={id !== undefined || mutation.isPending}
          onPress={() => setPicker('date')}
        />
        <InfoNotice>{t('habit.startedNotice')}</InfoNotice>
      </View>
      <View className="gap-3">
        <Text accessibilityRole="header" className={SECTION_TITLE_CLASS_NAME}>
          {t('sober.pledgeOptional')}
        </Text>
        <View className="gap-3 px-2">
          <TextInput
            accessibilityLabel={t('sober.pledge')}
            value={draft.description ?? ''}
            onChangeText={(description) => setDraft({ ...draft, description })}
            editable={!mutation.isPending}
            maxLength={SOBER_DESCRIPTION_MAX_LENGTH}
            multiline
            scrollEnabled
            textAlignVertical="top"
            placeholder={t('sober.pledgePlaceholder')}
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
