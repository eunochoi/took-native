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
    () => showNotice({ tone: 'success', title: '다시 시작 기록을 삭제했어요' }),
    (error) =>
      showNotice({ tone: 'error', title: '기록을 처리하지 못했어요', message: error.message }),
  );
  const notifyDeleting = () =>
    showNotice({
      tone: 'info',
      title: '잠시만 기다려주세요',
      message: '다시 시작 기록을 삭제하고 있어요.',
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
        title="다시 시작 기록"
        onClose={() => setOverlay(null)}
      >
        {(close) => (
          <View className="gap-3">
            <PickerAction
              icon="edit"
              title="기록 수정하기"
              description="날짜와 시간, 메모를 바꿔요."
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
              title="기록 삭제하기"
              description="이 시점의 다시 시작 기록을 삭제해요."
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
        title="기록을 삭제하시겠어요?"
        message="이 다시 시작 기록과 메모가 삭제되고, 경과 시간과 통계가 다시 계산돼요. 삭제한 뒤에는 되돌릴 수 없어요."
        danger
        confirmLabel="삭제하기"
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
