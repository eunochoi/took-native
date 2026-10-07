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
  const valid =
    /^\d+$/.test(draftDays) && Number(draftDays) >= 1 && Number(draftDays) <= SOBER_MAX_GOAL_DAYS;
  return (
    <BottomSheetModal visible title="얼마 동안 거리를 두고 싶나요?" onClose={onClose}>
      {(close) => (
        <View className="gap-5">
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
              selected={selection === 'PERIOD'}
              onPress={() => {
                if (!SOBER_GOALS.some((value) => value === Number(draftDays))) setDays('7');
                setSelection('PERIOD');
              }}
            />
            <PickerAction
              icon="edit"
              title="직접 입력"
              selected={selection === 'CUSTOM'}
              description="거리를 두고 싶은 기간을 일 단위로 입력해요."
              onPress={() => setSelection('CUSTOM')}
            />
          </View>
          {selection === 'PERIOD' && (
            <View className="gap-3">
              {[0, 3, 6].map((offset) => (
                <View key={offset} className="flex-row gap-3">
                  {SOBER_GOALS.slice(offset, offset + 3).map((value) => (
                    <View key={value} className="flex-1">
                      <PickerOption
                        compact
                        selectionOnly
                        selected={Number(draftDays) === value}
                        accessibilityLabel={formatSoberGoal(value)}
                        onPress={() => {
                          setDays(String(value));
                        }}
                      >
                        <Text
                          className={`text-sm ${Number(draftDays) === value ? 'text-theme-accent' : 'text-theme-text-primary'}`}
                        >
                          {formatSoberGoal(value)}
                        </Text>
                      </PickerOption>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}
          {selection === 'CUSTOM' && (
            <View className="flex-row items-center gap-3">
              <TextInput
                accessibilityLabel="직접 목표 일수"
                keyboardType="number-pad"
                maxLength={5}
                value={draftDays}
                onChangeText={setDays}
                className="flex-1 h-12 rounded-2xl bg-transparent border border-theme-border px-4 text-base font-normal text-theme-text-primary"
              />
              <Text>일</Text>
            </View>
          )}
          {selection !== 'AUTO' && !valid && (
            <Text accessibilityRole="alert" className="text-sm text-theme-danger">
              1~{SOBER_MAX_GOAL_DAYS}일로 입력해주세요.
            </Text>
          )}
          <Button
            labelWeight="normal"
            label="이 목표로 설정하기"
            disabled={selection !== 'AUTO' && !valid}
            onPress={() =>
              close(() =>
                onApply(
                  selection === 'AUTO' ? 'AUTO' : 'MANUAL',
                  selection === 'AUTO' ? null : Number(draftDays),
                ),
              )
            }
          />
        </View>
      )}
    </BottomSheetModal>
  );
}
