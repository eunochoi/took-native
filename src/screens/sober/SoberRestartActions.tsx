import { useI18n } from '../../i18n/react';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useSQLiteContext } from 'expo-sqlite';
import { useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useNotice } from '../../components/NoticeProvider';
import { PickerAction } from '../../components/PickerAction';
import { deleteSoberRestart } from '../../db/sober';
import type { SoberRestart } from '../../db/types';
import { useModalNavigation } from '../../navigation/ModalNavigationProvider';
import { useRecordMutation } from '../../queries';

type Overlay = { kind: 'menu' | 'delete'; record: SoberRestart } | null;

export function SoberRestartActions({
  soberId,
  children,
}: {
  soberId: number;
  children: (actions: {
    pending: boolean;
    onMenu: (record: SoberRestart) => void;
    onBeforeClose: () => boolean;
  }) => ReactNode;
}) {
  const { t } = useI18n();

  const db = useSQLiteContext();
  const { openModal } = useModalNavigation();
  const { showNotice } = useNotice();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const menu = overlay?.kind === 'menu' ? overlay.record : null;
  const confirm = overlay?.kind === 'delete' ? overlay.record : null;
  const deleting = useRef(false);
  const mutation = useRecordMutation(
    (restartId: number) => deleteSoberRestart(db, restartId, soberId),
    'sober',
    () => showNotice({ tone: 'success', title: t('sober.restartDeleted') }),
    (error) =>
      showNotice({ tone: 'error', title: t('sober.recordFailed'), message: error.message }),
  );
  const notifyDeleting = () =>
    showNotice({
      tone: 'info',
      title: t('sober.wait'),
      message: t('sober.deletingRestart'),
    });
  usePreventRemove(mutation.isPending, notifyDeleting);
  const onMenu = (record: SoberRestart) => {
    if (!deleting.current && !mutation.isPending) setOverlay({ kind: 'menu', record });
  };
  const onBeforeClose = () => {
    if (!deleting.current && !mutation.isPending) return true;
    notifyDeleting();
    return false;
  };
  return (
    <>
      {children({ pending: mutation.isPending, onMenu, onBeforeClose })}
      <BottomSheetModal
        visible={menu !== null}
        title={t('sober.restartRecord')}
        onClose={() => setOverlay(null)}
      >
        {(close) => (
          <View className="gap-3">
            <PickerAction
              icon="edit"
              title={t('sober.editRecord')}
              description={t('sober.editRecordHint')}
              singleLineDescription
              onPress={() => {
                const record = menu;
                close(() => {
                  if (record)
                    openModal({
                      pathname: '/sober/[id]/restart/[restartId]/edit',
                      params: { id: String(soberId), restartId: String(record.id) },
                    });
                });
              }}
            />
            <PickerAction
              icon="delete-outline"
              title={t('sober.deleteRecord')}
              description={t('sober.deleteRecordHint')}
              singleLineDescription
              danger
              onPress={() => {
                const record = menu;
                close(() => {
                  if (record) setOverlay({ kind: 'delete', record });
                });
              }}
            />
          </View>
        )}
      </BottomSheetModal>
      <ConfirmModal
        visible={confirm !== null}
        title={t('sober.deleteRecordTitle')}
        message={t('sober.deleteRecordWarning')}
        danger
        confirmLabel={t('diary.deleteAction')}
        onCancel={() => setOverlay(null)}
        onConfirm={() => {
          if (!confirm || deleting.current || mutation.isPending) return;
          deleting.current = true;
          setOverlay(null);
          void mutation
            .mutateAsync(confirm.id)
            .catch(() => undefined)
            .finally(() => {
              deleting.current = false;
            });
        }}
      />
    </>
  );
}
