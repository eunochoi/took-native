import { useI18n } from '../../i18n/react';
import { useModalNavigation } from '../../navigation/ModalNavigationProvider';
import { RecordMenuButton } from '../../components/RecordMenuButton';
import { useState } from 'react';
import { View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import type { Sober } from '../../db/types';
import { deleteSober } from '../../db/sober';
import { useRecordMutation } from '../../queries';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { PickerAction } from '../../components/PickerAction';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useNotice } from '../../components/NoticeProvider';

export function SoberMenu({
  sober,
  onDeleted,
  showDetail = false,
  disabled = false,
}: {
  sober: Sober;
  onDeleted?: () => void;
  showDetail?: boolean;
  disabled?: boolean;
}) {
  const { t } = useI18n();

  const db = useSQLiteContext();
  const { openModal } = useModalNavigation();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const { showNotice } = useNotice();
  const mutation = useRecordMutation(
    () => deleteSober(db, sober.id),
    'sober',
    onDeleted,
    (error) =>
      showNotice({ tone: 'error', title: t('sober.deleteFailed'), message: error.message }),
  );
  return (
    <>
      <RecordMenuButton
        accessibilityLabel={t('sober.menu', { value: sober.name })}
        accessibilityState={{ disabled: disabled || mutation.isPending }}
        disabled={disabled || mutation.isPending}
        onPress={() => setOpen(true)}
        className="h-11 w-8 items-center justify-center"
      />
      <BottomSheetModal visible={open} title={sober.name} onClose={() => setOpen(false)}>
        {(close) => (
          <View className="gap-3">
            {showDetail && (
              <PickerAction
                icon="info-outline"
                title={t('habit.menuDetail')}
                description={t('sober.detailHint')}
                singleLineDescription
                onPress={() => close(() => openModal(`/sober/${sober.id}`))}
              />
            )}
            <PickerAction
              icon="edit"
              title={t('sober.editAction')}
              description={t('sober.editHint')}
              singleLineDescription
              onPress={() => close(() => openModal(`/sober/${sober.id}/edit`))}
            />
            <PickerAction
              icon="delete-outline"
              title={t('diary.deleteAction')}
              description={t('sober.deleteHint')}
              singleLineDescription
              danger
              onPress={() => close(() => setConfirm(true))}
            />
          </View>
        )}
      </BottomSheetModal>
      <ConfirmModal
        visible={confirm}
        danger
        title={t('sober.deleteTitle')}
        message={t('sober.deleteWarning', { value: sober.name })}
        confirmLabel={t('diary.deleteAction')}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          mutation.mutate(undefined);
        }}
      />
    </>
  );
}
