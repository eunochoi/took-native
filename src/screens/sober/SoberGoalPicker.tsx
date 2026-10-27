import { formatSoberGoal } from '../../i18n/sober';
import { useI18n } from '../../i18n/react';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { PickerAction } from '../../components/PickerAction';
import { PickerOption } from '../../components/PickerOption';
import { Button } from '../../components/Button';
import { Text } from '../../components/Text';
import { SOBER_GOALS } from '../../domain/sober';
import { SOBER_MAX_GOAL_DAYS } from '../../domain/limits';

export function SoberGoalPicker({
  mode,
  days,
  onClose,
  onApply,
}: {
  mode: 'AUTO' | 'MANUAL';
  days: number | null;
  onClose: () => void;
  onApply: (mode: 'AUTO' | 'MANUAL', days: number | null) => void;
}) {
  const { t, language } = useI18n();

  const [selection, setSelection] = useState<'AUTO' | 'PERIOD' | 'CUSTOM'>(
    mode === 'AUTO' ? 'AUTO' : SOBER_GOALS.some((value) => value === days) ? 'PERIOD' : 'CUSTOM',
  );
  const [draftDays, setDays] = useState(String(days ?? 7));
  const [editor, setEditor] = useState<{ kind: 'PERIOD' | 'CUSTOM'; days: string } | null>(null);
  const valid =
    editor !== null &&
    /^\d+$/.test(editor.days) &&
    Number(editor.days) >= 1 &&
    Number(editor.days) <= SOBER_MAX_GOAL_DAYS;
  return (
    <BottomSheetModal
      visible
      title={t('sober.goalTitle')}
      onClose={onClose}
      dismissOnBack={editor === null}
      onBeforeClose={() => editor === null}
      footer={(close) => (
        <Button
          labelWeight="normal"
          label={t('sober.setGoal')}
          disabled={editor !== null}
          onPress={() =>
            close(() =>
              onApply(
                selection === 'AUTO' ? 'AUTO' : 'MANUAL',
                selection === 'AUTO' ? null : Number(draftDays),
              ),
            )
          }
        />
      )}
    >
      <>
        <View className="gap-3">
          <PickerAction
            icon="auto-awesome"
            title={t('sober.autoGoal')}
            description={t('sober.autoGoalHint')}
            note={`* ${SOBER_GOALS.map((days) => formatSoberGoal(days, language)).join(' → ')}`}
            selected={selection === 'AUTO'}
            onPress={() => setSelection('AUTO')}
          />
          <PickerAction
            icon="flag"
            title={t('sober.choosePeriod')}
            description={t('sober.choosePeriodHint')}
            note={
              selection === 'PERIOD'
                ? t('sober.selectedGoal', { value: formatSoberGoal(Number(draftDays), language) })
                : undefined
            }
            selected={selection === 'PERIOD'}
            onPress={() =>
              setEditor({
                kind: 'PERIOD',
                days: SOBER_GOALS.some((value) => value === Number(draftDays)) ? draftDays : '7',
              })
            }
          />
          <PickerAction
            icon="edit"
            title={t('sober.customGoal')}
            selected={selection === 'CUSTOM'}
            description={t('sober.customGoalHint')}
            note={
              selection === 'CUSTOM'
                ? t('sober.selectedDays', { count: Number(draftDays) })
                : undefined
            }
            onPress={() => setEditor({ kind: 'CUSTOM', days: draftDays })}
          />
        </View>
        {editor !== null && (
          <BottomSheetModal
            visible
            title={editor.kind === 'PERIOD' ? t('sober.periodTitle') : t('sober.daysTitle')}
            onClose={() => setEditor(null)}
            footer={(close) => (
              <Button
                labelWeight="normal"
                label={t('diary.selectionDone')}
                disabled={!valid}
                onPress={() => {
                  if (!valid) return;
                  close(() => {
                    setSelection(editor.kind);
                    setDays(String(Number(editor.days)));
                  });
                }}
              />
            )}
          >
            {editor.kind === 'PERIOD' ? (
              <View className="gap-1.5">
                {[0, 3, 6].map((offset) => (
                  <View key={offset} className="flex-row gap-1.5">
                    {SOBER_GOALS.slice(offset, offset + 3).map((value) => (
                      <View key={value} className="flex-1">
                        <PickerOption
                          compact
                          selected={Number(editor.days) === value}
                          accessibilityLabel={formatSoberGoal(value, language)}
                          onPress={() => setEditor({ ...editor, days: String(value) })}
                        >
                          <Text
                            className={`text-sm ${Number(editor.days) === value ? 'text-theme-accent-deep' : 'text-theme-text-primary'}`}
                          >
                            {formatSoberGoal(value, language)}
                          </Text>
                        </PickerOption>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ) : (
              <View className="gap-3">
                <View className="flex-row items-center gap-3">
                  <TextInput
                    autoFocus
                    accessibilityLabel={t('sober.goalInput')}
                    keyboardType="number-pad"
                    maxLength={5}
                    value={editor.days}
                    onChangeText={(value) => setEditor({ ...editor, days: value })}
                    className="flex-1 h-12 ios:curve-continuous rounded-2xl bg-transparent border border-theme-border px-4 text-base font-normal text-theme-text-primary"
                  />
                  <Text>{t('sober.daysUnit')}</Text>
                </View>
                {!valid && (
                  <Text accessibilityRole="alert" className="text-sm text-theme-danger">
                    {t('sober.goalRange', { count: SOBER_MAX_GOAL_DAYS })}
                  </Text>
                )}
              </View>
            )}
          </BottomSheetModal>
        )}
      </>
    </BottomSheetModal>
  );
}
