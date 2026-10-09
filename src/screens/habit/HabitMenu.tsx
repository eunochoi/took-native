import { useModalNavigation } from '../../navigation/ModalNavigationProvider';
import { RecordMenuButton } from '../../components/RecordMenuButton';
import { AlertModal, type AlertContent } from '../../components/AlertModal';
import { useState } from 'react';
import { View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { deleteHabit } from '../../db/habit';
import type { Habit } from '../../db/types';
import { useRecordMutation } from '../../queries';
import { ConfirmModal } from '../../components/ConfirmModal';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { PickerAction } from '../../components/PickerAction';

export function HabitMenu({ habit, onDeleted }: { habit: Habit; onDeleted?: () => void }) {
  const [alert, setAlert] = useState<AlertContent | null>(null);
  const db = useSQLiteContext();
  const { openModal } = useModalNavigation();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mutation = useRecordMutation(
    () => deleteHabit(db, habit.id),
    'habit',
    onDeleted,
    (error) => setAlert({ title: '처리하지 못했어요', message: error.message }),
  );
  return (
    <>
      <RecordMenuButton
        accessibilityLabel={`${habit.name} 수정·삭제 메뉴`}
        accessibilityState={{ expanded: open, disabled: mutation.isPending }}
        disabled={mutation.isPending}
        onPress={() => setOpen(true)}
        className="h-9 w-8 items-center justify-center"
      />
      <BottomSheetModal visible={open} title={habit.name} onClose={() => setOpen(false)}>
        {(closePicker) => (
          <View className="gap-3">
            <PickerAction
              icon="edit"
              title="습관 수정하기"
              description="이름과 우선순위, 아이콘을 바꿔요."
              onPress={() => closePicker(() => openModal(`/habit/${habit.id}/edit`))}
            />
            <PickerAction
              icon="delete-outline"
              title="습관 삭제하기"
              description="습관과 완료 기록을 삭제해요."
              danger
              onPress={() => closePicker(() => setConfirmOpen(true))}
            />
          </View>
        )}
      </BottomSheetModal>
      <ConfirmModal
        danger
        visible={confirmOpen}
        title="정말 삭제하시겠어요?"
        message="삭제한 뒤에는 되돌릴 수 없어요."
        confirmLabel="삭제하기"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          mutation.mutate(undefined);
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
