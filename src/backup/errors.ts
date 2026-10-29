import { t } from '../i18n/core';
export function backupErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const keys = {
    BLOO_RETENTION_FAILED: 'backupRetentionFailed',
    BLOO_LOCAL_FOLDER: 'backupLocalFolder',
    BLOO_FOLDER_UNAVAILABLE: 'backupFolderUnavailable',
    BLOO_PASSWORD_LENGTH: 'backupPasswordLength',
    BLOO_PASSWORD_OR_DAMAGED: 'backupPasswordOrDamaged',
    BLOO_SELECT_ONE: 'backupSelectOne',
    BLOO_INVALID: 'backupInvalid',
    BLOO_TOO_LARGE: 'backupTooLarge',
    BLOO_NO_SPACE: 'backupNoSpace',
    BLOO_NATIVE_REQUIRED: 'backupNativeRequired',
    BLOO_ICLOUD_UNAVAILABLE: 'backupICloudUnavailable',
    BLOO_ICLOUD_ACCOUNT_CHANGED: 'backupICloudAccountChanged',
    BLOO_BUSY: 'backupBusy',
    BLOO_UPLOAD_PENDING: 'backupUploadPending',
  } as const;
  for (const [code, key] of Object.entries(keys))
    if (message.includes(code)) return t(`settings.${key}`);
  return message;
}
