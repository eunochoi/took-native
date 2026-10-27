import { useI18n } from '../../i18n/react';
import { useModalNavigation } from '../../navigation/ModalNavigationProvider';
import { RecordMenuButton } from '../../components/RecordMenuButton';
import { useNotice } from '../../components/NoticeProvider';
import { useState } from 'react';
import { View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { deleteHabit } from '../../db/habit';
import type { Habit } from '../../db/types';
import { useRecordMutation } from '../../queries';
import { ConfirmModal } from '../../components/ConfirmModal';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { PickerAction } from '../../components/PickerAction';

export function HabitMenu({
  habit,
  onDeleted,
  showDetail = false,
}: {
  habit: Habit;
  onDeleted?: () => void;
  showDetail?: boolean;
}) {
  const { t } = useI18n();

  const { showNotice } = useNotice();
  const db = useSQLiteContext();
  const { openModal } = useModalNavigation();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mutation = useRecordMutation(
    () => deleteHabit(db, habit.id),
    'habit',
    onDeleted,
    (error) =>
      showNotice({ tone: 'error', title: t('habit.processFailed'), message: error.message }),
  );
  return (
    <>
      <RecordMenuButton
        accessibilityLabel={t('habit.menu', { value: habit.name })}
        accessibilityState={{ expanded: open, disabled: mutation.isPending }}
        disabled={mutation.isPending}
        onPress={() => setOpen(true)}
        className="h-9 w-8 items-center justify-center"
      />
      <BottomSheetModal visible={open} title={habit.name} onClose={() => setOpen(false)}>
        {(closePicker) => (
          <View className="gap-3">
            {showDetail && (
              <PickerAction
                icon="info-outline"
                title={t('habit.menuDetail')}
                description={t('habit.menuDetailHint')}
                singleLineDescription
                onPress={() => closePicker(() => openModal(`/habit/${habit.id}`))}
              />
            )}
            <PickerAction
              icon="edit"
              title={t('habit.edit')}
              description={t('habit.editHint')}
              singleLineDescription
              onPress={() => closePicker(() => openModal(`/habit/${habit.id}/edit`))}
            />
            <PickerAction
              icon="delete-outline"
              title={t('habit.delete')}
              description={t('habit.deleteHint')}
              singleLineDescription
              danger
              onPress={() => closePicker(() => setConfirmOpen(true))}
            />
          </View>
        )}
      </BottomSheetModal>
      <ConfirmModal
        danger
        visible={confirmOpen}
        title={t('habit.deleteTitle')}
        message={t('habit.deleteWarning')}
        confirmLabel={t('habit.deleteAction')}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          mutation.mutate(undefined);
        }}
      />
    </>
  );
}
