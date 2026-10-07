import { RecordMenuButton } from '../../components/RecordMenuButton';
import { AlertModal, type AlertContent } from '../../components/AlertModal';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { deleteDiary } from '../../db/diary';
import type { Diary } from '../../db/types';
import { cleanupImages } from '../../media';
import { useRecordMutation } from '../../queries';
import { ConfirmModal } from '../../components/ConfirmModal';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { PickerAction } from '../../components/PickerAction';

export function DiaryMenu({
  diary,
  today,
  onDeleted,
}: {
  diary: Diary;
  today: string;
  onDeleted?: () => void;
}) {
  const [alert, setAlert] = useState<AlertContent | null>(null);
  const db = useSQLiteContext();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mutation = useRecordMutation(
    async () => {
      const files = await deleteDiary(db, diary.id);
      await cleanupImages(db, files);
    },
    'diary',
    onDeleted,
    (error) => setAlert({ title: '처리하지 못했어요', message: error.message }),
  );
  const title = `${format(parseISO(diary.date), 'yyyy년 M월 d일')} 일기`;
  return (
    <>
      <RecordMenuButton
        muted
        accessibilityLabel="일기 메뉴"
        accessibilityState={{ expanded: open, disabled: mutation.isPending }}
        disabled={mutation.isPending}
        onPress={() => setOpen(true)}
        className="h-11 w-11 items-center justify-center rounded-full"
      />
      <BottomSheetModal visible={open} title={title} onClose={() => setOpen(false)}>
        {(closePicker) => (
          <View className="gap-3">
            <PickerAction
              icon="edit"
              title="일기 수정하기"
              description="그날의 이야기와 사진을 다듬어요."
              disabled={diary.date > today}
              onPress={() =>
                closePicker(() => {
                  router.push(`/diary/${diary.id}/edit`);
                })
              }
            />
            <PickerAction
              icon="delete-outline"
              title="일기 삭제하기"
              description="일기와 첨부 사진을 삭제해요."
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
