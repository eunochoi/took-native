import { requireOptionalNativeModule } from 'expo';

const sharing = requireOptionalNativeModule<{ shareAsync: (urls: string[]) => Promise<void> }>(
  'TookBackupSharing',
);
export async function shareBackupSet(urls: string[]) {
  if (!sharing)
    throw new Error(
      '이 환경에서는 여러 파일을 함께 공유할 수 없어요. 기기에 저장한 뒤 파일 앱에서 전체 백업을 선택해 공유해주세요.',
    );
  await sharing.shareAsync(urls);
}
