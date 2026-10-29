export const privacyEn = {
  storedDataTitle: 'Information stored on your device',
  storedDataText:
    "'BlooLog' stores your diary entries, emotion records, habits, habit completions, Cut Back items and their start times, restart records and notes, app settings, and images you add on your device. Records and settings are stored in a local SQLite database. Photos are stored in local files dedicated to the app.",
  accountsTitle: 'Accounts',
  accountsText:
    "'BlooLog' does not create user accounts. It does not use sign-in, email account registration, or social sign-in, and there is no account closure process.",
  serversTitle: 'Servers and external tools',
  serversText:
    "This app does not use a 'BlooLog' server and does not send or store personal records, including diaries, emotions, habits, Cut Back records, or photos, on a 'BlooLog' server. It does not use external SDKs for advertising, usage analytics, or crash reporting. If external tools are introduced in the future, this policy will be updated to describe how data is actually handled.",
  photosTitle: 'Photos',
  photosText:
    "When you add a photo to a diary entry, the app accesses only the images you select yourself in the system photo picker. Selected photos are resized and copied to local storage dedicated to the app. The app does not read your entire photo library or upload photos to a 'BlooLog' server. Deleting a diary entry or an attached photo removes the copy inside the app, without deleting the original photo in your photo library.",
  manualBackupTitle: 'Encrypted backups',
  manualBackupText:
    'Create password-encrypted .bloo backups in Settings. A backup includes records, settings, and attached photos. When enabled, automatic backup saves once a day to an authorized bloolog folder on Android or the app’s iCloud Drive container on iOS, retaining the last 3 successful backup dates. Apple handles iCloud transfers, which may be delayed by device or network conditions. The app does not automatically upload to its own server or a Google account. Manual backups use a selected folder or the OS share sheet.',
  restoreTitle: 'Managing and restoring backup files',
  restoreText:
    'Restoring requires one .bloo file and its original password. Authenticated decryption and integrity checks precede replacement of records, photos, and settings. Forgotten passwords cannot be recovered. Keys needed for automatic backups are stored in device secure storage. Turning automatic backup off preserves existing backup files. A safety backup is saved inside the app before restoration, encrypted with the password entered for restoration. External storage services apply their own privacy policies. Temporary files in the app cache are removed after the operation or on a subsequent launch.',
  deletionTitle: 'Deleting data',
  deletionText:
    'You can delete individual diary entries, habits, and Cut Back items in the app. Uninstalling the app deletes records, settings, photos, and temporary files in its dedicated storage. Backups you saved or shared outside the app and original photos are not deleted when the app is uninstalled. Delete them yourself from their respective locations. There is currently no separate button to delete all data.',
  deviceBackupTitle: 'Operating system device backups',
  deviceBackupText:
    "Android automatic cloud backup is disabled for this app. Device-to-device transfers provided by the operating system or manufacturer may be handled separately, depending on your device and system settings. They are separate from the manual backup feature in 'BlooLog'. Manage exported backup files yourself in the location or service you selected.",
  contactTitle: 'Contact and policy updates',
  contactText:
    "Operator: eooooostudio. Privacy inquiries: eooooostudio@gmail.com. If you send an email yourself to make an inquiry, your email service's data handling practices apply. This screen will be updated when app features or data handling practices change.",
  scopeTitle: 'Scope',
  scopeText:
    "This policy applies to the local 'BlooLog' mobile app, which does not use accounts. It is separate from the privacy policy of the existing web service. Last updated: October 28, 2026.",
} as const;
