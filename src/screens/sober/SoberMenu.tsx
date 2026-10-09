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
  disabled = false,
}: {
  sober: Sober;
  onDeleted?: () => void;
  disabled?: boolean;
}) {
  const db = useSQLiteContext();
  const { openModal } = useModalNavigation();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const { showNotice } = useNotice();
  const mutation = useRecordMutation(
    () => deleteSober(db, sober.id),
    'sober',
    onDeleted,
    (error) => showNotice({ tone: 'error', title: '삭제하지 못했어요', message: error.message }),
  );
  return (
    <>
      <RecordMenuButton
        accessibilityLabel={`${sober.name} 수정·삭제 메뉴`}
        accessibilityState={{ disabled: disabled || mutation.isPending }}
        disabled={disabled || mutation.isPending}
        onPress={() => setOpen(true)}
        className="h-11 w-8 items-center justify-center"
      />
      <BottomSheetModal visible={open} title={sober.name} onClose={() => setOpen(false)}>
        {(close) => (
          <View className="gap-3">
            <PickerAction
              icon="edit"
              title="수정하기"
              description="목표, 시작 시간, 이름, 아이콘 등을 수정해요."
              onPress={() => close(() => openModal(`/sober/${sober.id}/edit`))}
            />
            <PickerAction
              icon="delete-outline"
              title="삭제하기"
              description="거리두기 항목과 모든 다시 시작 기록을 삭제해요."
              danger
              onPress={() => close(() => setConfirm(true))}
            />
          </View>
        )}
      </BottomSheetModal>
      <ConfirmModal
        visible={confirm}
        danger
        title="이 거리두기를 삭제할까요?"
        message={`‘${sober.name}’의 거리두기와 모든 다시 시작 기록이 삭제돼요. 삭제한 뒤에는 되돌릴 수 없어요.`}
        confirmLabel="삭제하기"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          mutation.mutate(undefined);
        }}
      />
    </>
  );
}
