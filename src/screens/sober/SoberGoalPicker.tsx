import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { PickerAction } from '../../components/PickerAction';
import { PickerOption } from '../../components/PickerOption';
import { Button } from '../../components/Button';
import { Text } from '../../components/Text';
import { SOBER_GOALS, formatSoberGoal } from '../../domain/sober';
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
      title="얼마 동안 거리를 두고 싶나요?"
      onClose={onClose}
      dismissOnBack={editor === null}
      onBeforeClose={() => editor === null}
      footer={(close) => (
        <Button
          labelWeight="normal"
          label="이 목표로 설정하기"
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
            title="자동 목표"
            description="거리를 두는 시간이 늘어나면 다음 목표가 자동으로 설정돼요."
            note={`* ${SOBER_GOALS.map(formatSoberGoal).join(' → ')}`}
            selected={selection === 'AUTO'}
            onPress={() => setSelection('AUTO')}
          />
          <PickerAction
            icon="flag"
            title="기간 선택"
            description="거리를 두고 싶은 기간을 선택해요."
            note={
              selection === 'PERIOD'
                ? `선택한 목표: ${formatSoberGoal(Number(draftDays))}`
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
            title="직접 입력"
            selected={selection === 'CUSTOM'}
            description="거리를 두고 싶은 기간을 일 단위로 입력해요."
            note={selection === 'CUSTOM' ? `선택한 목표: ${Number(draftDays)}일` : undefined}
            onPress={() => setEditor({ kind: 'CUSTOM', days: draftDays })}
          />
        </View>
        {editor !== null && (
          <BottomSheetModal
            visible
            title={editor.kind === 'PERIOD' ? '목표 기간 선택' : '목표 일수 입력'}
            onClose={() => setEditor(null)}
            footer={(close) => (
              <Button
                labelWeight="normal"
                label="선택 완료"
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
                          accessibilityLabel={formatSoberGoal(value)}
                          onPress={() => setEditor({ ...editor, days: String(value) })}
                        >
                          <Text
                            className={`text-sm ${Number(editor.days) === value ? 'text-theme-accent' : 'text-theme-text-primary'}`}
                          >
                            {formatSoberGoal(value)}
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
                    accessibilityLabel="직접 목표 일수"
                    keyboardType="number-pad"
                    maxLength={5}
                    value={editor.days}
                    onChangeText={(value) => setEditor({ ...editor, days: value })}
                    className="flex-1 h-12 ios:curve-continuous rounded-2xl bg-transparent border border-theme-border px-4 text-base font-normal text-theme-text-primary"
                  />
                  <Text>일</Text>
                </View>
                {!valid && (
                  <Text accessibilityRole="alert" className="text-sm text-theme-danger">
                    1~{SOBER_MAX_GOAL_DAYS}일로 입력해주세요.
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
