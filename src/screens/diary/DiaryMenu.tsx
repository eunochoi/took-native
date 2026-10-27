import { formatDisplayDate } from '../../i18n/format';
import { useI18n } from '../../i18n/react';
import { useModalNavigation } from '../../navigation/ModalNavigationProvider';
import { RecordMenuButton } from '../../components/RecordMenuButton';
import { useNotice } from '../../components/NoticeProvider';
import { View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
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
  showDetail = false,
}: {
  diary: Diary;
  today: string;
  onDeleted?: () => void;
  showDetail?: boolean;
}) {
  const { t, formatLocale } = useI18n();

  const { showNotice } = useNotice();
  const db = useSQLiteContext();
  const { openModal } = useModalNavigation();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mutation = useRecordMutation(
    async () => {
      const files = await deleteDiary(db, diary.id);
      await cleanupImages(db, files);
    },
    'diary',
    onDeleted,
    (error) =>
      showNotice({ tone: 'error', title: t('diary.processFailed'), message: error.message }),
  );
  const title = t('diary.dateTitle', {
    value: formatDisplayDate(diary.date, formatLocale, 'date'),
  });
  return (
    <>
      <RecordMenuButton
        muted
        accessibilityLabel={t('diary.menu')}
        accessibilityState={{ expanded: open, disabled: mutation.isPending }}
        disabled={mutation.isPending}
        onPress={() => setOpen(true)}
        className="h-11 w-11 items-center justify-center ios:curve-continuous rounded-full"
      />
      <BottomSheetModal visible={open} title={title} onClose={() => setOpen(false)}>
        {(closePicker) => (
          <View className="gap-3">
            {showDetail && (
              <PickerAction
                icon="info-outline"
                title={t('diary.detail')}
                description={t('diary.detailHint')}
                singleLineDescription
                onPress={() => closePicker(() => openModal(`/diary/${diary.id}`))}
              />
            )}
            <PickerAction
              icon="edit"
              title={t('diary.edit')}
              description={t('diary.editHint')}
              singleLineDescription
              disabled={diary.date > today}
              onPress={() =>
                closePicker(() => {
                  openModal(`/diary/${diary.id}/edit`);
                })
              }
            />
            <PickerAction
              icon="delete-outline"
              title={t('diary.delete')}
              description={t('diary.deleteHint')}
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
        title={t('diary.deleteTitle')}
        message={t('diary.deleteWarning')}
        confirmLabel={t('diary.deleteAction')}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          mutation.mutate(undefined);
        }}
      />
    </>
  );
}
